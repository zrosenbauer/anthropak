import { join } from "node:path";
import { P, match } from "ts-pattern";
import fs from "./fs.js";
import type { createClaudeSettingsClient } from "./claude-configs.js";
import type { Mode } from "../types.js";

export interface ModePaths {
  configDir: string;
  configFilePath: string;
  configDisplayPath: string;
  hookScriptPath: string;
  hookScriptDisplayPath: string;
  hookDirPath: string;
  hookConfigDisplayPath: string;
}

/**
 * Resolves all mode-dependent paths for a given root and mode.
 */
export function resolvePaths(root: string, mode: Mode): ModePaths {
  const configDir = mode === "plugin" ? ".claude-plugin" : ".claude";
  const isRepo = mode === "repo";

  return {
    configDir,
    configFilePath: join(root, configDir, "anthropak.yaml"),
    configDisplayPath: `${configDir}/anthropak.yaml`,
    hookScriptPath: isRepo
      ? join(root, ".claude", "hooks", "anthropak.mjs")
      : join(root, "hook", "anthropak.mjs"),
    hookScriptDisplayPath: isRepo ? ".claude/hooks/anthropak.mjs" : "hook/anthropak.mjs",
    hookDirPath: isRepo ? join(root, ".claude", "hooks") : join(root, "hook"),
    hookConfigDisplayPath: isRepo ? ".claude/settings.json" : "hooks.json",
  };
}

/**
 * Detect mode by checking existing setup, then falling back to plugin markers.
 *
 * When `settingsFile` is provided (update flow), also checks for existing repo-mode
 * hook setup before falling back to plugin markers.
 */
export async function detectMode(
  rootDir: string,
  settingsFile?: ReturnType<typeof createClaudeSettingsClient>,
): Promise<Mode> {
  if (settingsFile) {
    const hasSettingsHook = await settingsFile.hookExists();
    if (hasSettingsHook) return "repo";

    const hasRepoHookScript = await fs.exists(join(rootDir, ".claude", "hooks", "anthropak.mjs"));
    if (hasRepoHookScript) return "repo";
  }

  const hasHooksJson = await fs.exists(join(rootDir, "hooks.json"));
  const hasClaudePlugin = await fs.exists(join(rootDir, ".claude-plugin"));
  const hasPluginJson = await fs.exists(join(rootDir, "plugin.json"));

  if (settingsFile) {
    const hasPluginHookScript = await fs.exists(join(rootDir, "hook", "anthropak.mjs"));

    return match({ hasHooksJson, hasClaudePlugin, hasPluginJson, hasPluginHookScript })
      .with(
        P.union(
          { hasHooksJson: true },
          { hasClaudePlugin: true },
          { hasPluginJson: true },
          { hasPluginHookScript: true },
        ),
        () => "plugin" as Mode,
      )
      .otherwise(() => "repo" as Mode);
  }

  return match({ hasHooksJson, hasClaudePlugin, hasPluginJson })
    .with(
      P.union({ hasHooksJson: true }, { hasClaudePlugin: true }, { hasPluginJson: true }),
      () => "plugin" as Mode,
    )
    .otherwise(() => "repo" as Mode);
}
