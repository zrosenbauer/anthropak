import { attemptAsync } from "es-toolkit";
import { match, P } from "ts-pattern";
import { readStdin } from "./lib/io.js";
import { config } from "@anthropak/utils";
import { loadInstalledPlugins } from "./lib/registry.js";
import { checkPlugins } from "./checkers/plugins.js";
import { checkCliTools } from "./checkers/cli-tools.js";
import {
  buildHookResponse,
  buildErrorResponse,
  buildUserPromptSubmitBlockResponse,
} from "./lib/output.js";
import { writeCache, readCache } from "./lib/cache.js";
import { PLUGIN_ROOT, PROJECT_DIR, INSTALLED_PLUGINS_PATH } from "./lib/constants.js";

(async () => {
  // Top-level crash protection - hook must never crash
  const [error, response] = await attemptAsync(async () => {
    // Read stdin (hook context from Claude Code)
    const stdin = await readStdin();
    const eventName = stdin?.hook_event_name ?? "";
    const sessionId = stdin?.session_id ?? "";

    // Determine config directory: .claude-plugin/ for plugins, .claude/ for repos
    const configDir = config.resolveConfigDir(PLUGIN_ROOT);

    return await match(eventName)
      .with("SessionStart", async () => {
        // Full dependency check, cache result, return context
        const loadResult = await config.load(configDir);

        const result = await match(loadResult)
          .with({ status: "success" }, async ({ config }) => {
            const registry = await loadInstalledPlugins(INSTALLED_PLUGINS_PATH);
            const checkResult = checkPlugins(config, registry, PROJECT_DIR);
            const cliToolResult = await checkCliTools(config);
            return buildHookResponse(checkResult, cliToolResult);
          })
          .with({ status: "not_found" }, () => buildErrorResponse(loadResult))
          .with({ status: "parse_error" }, () => buildErrorResponse(loadResult))
          .with({ status: "validation_error" }, () => buildErrorResponse(loadResult))
          .exhaustive();

        // Write cache for UserPromptSubmit to read later
        if (sessionId) {
          await writeCache(sessionId, result.cache);
        }

        return result.response;
      })
      .with("UserPromptSubmit", async () => {
        // Fast path: read cache and block if required deps missing
        if (!sessionId) {
          return {};
        }

        const cache = await readCache(sessionId);

        return match(cache)
          .with({ blocked: true, reason: P.string }, ({ reason }) =>
            buildUserPromptSubmitBlockResponse(reason),
          )
          .otherwise(() => ({}));
      })
      .otherwise(() => ({}));
  });

  // Always output valid JSON, even on unexpected errors
  const output = error ? {} : response;
  console.log(JSON.stringify(output));
  process.exit(0);
})();
