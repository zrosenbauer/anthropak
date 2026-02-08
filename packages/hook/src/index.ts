import { attemptAsync } from "es-toolkit";
import { match, P } from "ts-pattern";
import { readStdin } from "./lib/io.js";
import { loadConfig } from "./lib/config.js";
import { loadInstalledPlugins } from "./lib/registry.js";
import { checkPlugins } from "./checkers/plugins.js";
import { checkCliTools } from "./checkers/cli-tools.js";
import { buildHookResponse, buildErrorResponse } from "./lib/output.js";
import { PLUGIN_ROOT, PROJECT_DIR, INSTALLED_PLUGINS_PATH } from "./lib/constants.js";

(async () => {
  // Top-level crash protection - hook must never crash
  const [error, response] = await attemptAsync(async () => {
    // Read stdin (hook context from Claude Code)
    await readStdin();

    // Load and validate config
    const loadResult = await loadConfig(PLUGIN_ROOT);

    // Match on result - success path checks deps, other paths return error messages
    return await match(loadResult)
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
  });

  // Always output valid JSON, even on unexpected errors
  const output = match({ error, response })
    .with({ error: P.nullish }, ({ response: r }) => r)
    .otherwise(() => ({}));
  console.log(JSON.stringify(output));
  process.exit(0);
})();
