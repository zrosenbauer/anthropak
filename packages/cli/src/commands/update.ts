// Update command - update hook script with confirmation
import * as p from "@clack/prompts";
import { join, resolve } from "node:path";
import { match } from "ts-pattern";
import type { CommandModule } from "yargs";
import { getHookScript } from "../lib/templates.js";
import { readHooksJson, hookExists, addHookEntry, writeHooksJson } from "../lib/hooks.js";
import { fileExists, mkdirAsync, writeFileAsync, chmodAsync } from "../lib/fs.js";
import type { UpdateOptions, FileAction } from "../types.js";

const command: CommandModule<object, UpdateOptions> = {
  command: "update [path]",
  describe: "Update hook script and hooks.json to latest version",
  builder: (yargs) =>
    yargs.positional("path", {
      describe: "Plugin/project root directory",
      default: ".",
      type: "string",
    }),
  handler: async (argv) => {
    const root = resolve(argv.path);

    p.intro("anthropak update");

    // Build file action list
    const fileActions: FileAction[] = [];

    const hookScript = join(root, "hook", "anthropak.mjs");
    const hookScriptExists = await fileExists(hookScript);
    fileActions.push({
      path: "hook/anthropak.mjs",
      action: hookScriptExists ? "update" : "create",
    });

    const hooksJsonPath = join(root, "hooks.json");
    const hooksJsonExists = await fileExists(hooksJsonPath);
    const hooksJson = await readHooksJson(hooksJsonPath);
    const hasHook = hookExists(hooksJson);

    fileActions.push(
      match({ exists: hooksJsonExists, hasHook })
        .with({ hasHook: true }, () => ({
          path: "hooks.json",
          action: "skip" as const,
          reason: "already up to date",
        }))
        .with({ exists: true, hasHook: false }, () => ({
          path: "hooks.json",
          action: "update" as const,
        }))
        .with({ exists: false }, () => ({
          path: "hooks.json",
          action: "create" as const,
        }))
        .exhaustive(),
    );

    // Show file summary
    p.log.info("Files to be modified:");
    fileActions.forEach((action) => {
      const reason = action.reason ? ` (${action.reason})` : "";
      match(action.action)
        .with("create", () => p.log.step(`  [CREATE] ${action.path}${reason}`))
        .with("update", () => p.log.step(`  [UPDATE] ${action.path}${reason}`))
        .with("skip", () => p.log.step(`  [SKIP]   ${action.path}${reason}`))
        .exhaustive();
    });

    // Confirm before writing
    const proceed = await p.confirm({
      message: "Proceed?",
      initialValue: false,
    });

    if (p.isCancel(proceed)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }

    if (!proceed) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }

    // Write files
    const spinner = p.spinner();
    spinner.start("Writing files...");

    // Create hook directory
    const [mkdirError] = await mkdirAsync(join(root, "hook"));
    if (mkdirError) {
      spinner.stop(`Failed to create hook directory: ${mkdirError.message}`);
      process.exit(1);
    }

    // Write hook script
    const hookScriptContent = getHookScript();
    const [hookWriteError] = await writeFileAsync(hookScript, hookScriptContent);
    if (hookWriteError) {
      spinner.stop(`Failed to write hook script: ${hookWriteError.message}`);
      process.exit(1);
    }

    // Make hook executable
    const [chmodError] = await chmodAsync(hookScript, 0o755);
    if (chmodError) {
      spinner.stop(`Failed to make hook executable: ${chmodError.message}`);
      process.exit(1);
    }

    // Update hooks.json if needed
    const hooksAction = fileActions.find((a) => a.path === "hooks.json")?.action;
    if (hooksAction === "create" || hooksAction === "update") {
      const updatedHooks = addHookEntry(hooksJson);
      await writeHooksJson(hooksJsonPath, updatedHooks);
    }

    spinner.stop("Files written successfully");

    p.outro("Done");
  },
};

export default command;
