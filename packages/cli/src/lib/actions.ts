import * as p from "@clack/prompts";
import { join } from "node:path";
import { match } from "ts-pattern";
import fs from "./fs.js";
import type {
  createClaudePluginHooksClient,
  createClaudeSettingsClient,
} from "./claude-configs.js";
import type { FileAction, Mode } from "../types.js";

/**
 * Resolves the hook config file action (create / update / skip) based on mode.
 */
export async function resolveHookConfigAction(
  mode: Mode,
  settingsFile: ReturnType<typeof createClaudeSettingsClient>,
  hooksFile: ReturnType<typeof createClaudePluginHooksClient>,
  root: string,
  hookConfigDisplayPath: string,
  skipReason: string,
): Promise<FileAction> {
  return match(mode)
    .with("repo", async () => {
      const settingsExists = await fs.exists(join(root, ".claude", "settings.json"));
      const hasHook = await settingsFile.hookExists();

      return match({ exists: settingsExists, hasHook })
        .with({ hasHook: true }, () => ({
          path: hookConfigDisplayPath,
          action: "skip" as const,
          reason: skipReason,
        }))
        .with({ exists: true, hasHook: false }, () => ({
          path: hookConfigDisplayPath,
          action: "update" as const,
        }))
        .with({ exists: false }, () => ({
          path: hookConfigDisplayPath,
          action: "create" as const,
        }))
        .exhaustive();
    })
    .with("plugin", async () => {
      const hooksJsonExists = await fs.exists(join(root, "hooks.json"));
      const hasHook = await hooksFile.hookExists();

      return match({ exists: hooksJsonExists, hasHook })
        .with({ hasHook: true }, () => ({
          path: hookConfigDisplayPath,
          action: "skip" as const,
          reason: skipReason,
        }))
        .with({ exists: true, hasHook: false }, () => ({
          path: hookConfigDisplayPath,
          action: "update" as const,
        }))
        .with({ exists: false }, () => ({
          path: hookConfigDisplayPath,
          action: "create" as const,
        }))
        .exhaustive();
    })
    .exhaustive();
}

/**
 * Displays a formatted file action summary.
 */
export function displayFileActions(actions: FileAction[]): void {
  actions.forEach((action) => {
    const reason = action.reason ? ` (${action.reason})` : "";
    match(action.action)
      .with("create", () => p.log.step(`  [CREATE] ${action.path}${reason}`))
      .with("update", () => p.log.step(`  [UPDATE] ${action.path}${reason}`))
      .with("skip", () => p.log.step(`  [SKIP]   ${action.path}${reason}`))
      .exhaustive();
  });
}

/**
 * Prompts for confirmation or auto-confirms when --yes is set.
 * Exits the process if cancelled.
 */
export async function confirmOrExit(yes: boolean): Promise<void> {
  if (yes) return;

  const result = await p.confirm({
    message: "Proceed?",
    initialValue: false,
  });

  if (p.isCancel(result) || !result) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }
}

/**
 * Writes the hook config (settings.json or hooks.json) based on mode.
 */
export async function writeHookConfig(
  mode: Mode,
  settingsFile: ReturnType<typeof createClaudeSettingsClient>,
  hooksFile: ReturnType<typeof createClaudePluginHooksClient>,
  actions: FileAction[],
  hookConfigDisplayPath: string,
): Promise<void> {
  const configAction = actions.find((a) => a.path === hookConfigDisplayPath)?.action;
  if (configAction !== "create" && configAction !== "update") return;

  await match(mode)
    .with("repo", async () => {
      await settingsFile.addHook();
      await settingsFile.write();
    })
    .with("plugin", async () => {
      await hooksFile.addHook();
      await hooksFile.write();
    })
    .exhaustive();
}

/**
 * Handles intro/outro messaging based on --yes mode.
 */
export function intro(yes: boolean, message: string): void {
  if (yes) {
    p.log.info(message);
  } else {
    p.intro(message);
  }
}

export function outro(yes: boolean, message: string): void {
  if (yes) {
    p.log.info(message);
  } else {
    p.outro(message);
  }
}
