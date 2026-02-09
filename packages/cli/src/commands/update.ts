// Update command - update hook script with mode detection and confirmation
import * as p from "@clack/prompts";
import { join, resolve } from "node:path";
import type { CommandModule } from "yargs";
import { getHookScript } from "../lib/templates.js";
import {
  createClaudePluginHooksClient,
  createClaudeSettingsClient,
} from "../lib/claude-configs.js";
import { resolvePaths, detectMode } from "../lib/paths.js";
import {
  resolveHookConfigAction,
  displayFileActions,
  confirmOrExit,
  writeHookConfig,
  intro,
  outro,
} from "../lib/actions.js";
import fs from "../lib/fs.js";
import type { UpdateOptions, FileAction } from "../types.js";

const command: CommandModule<object, UpdateOptions> = {
  command: "update [path]",
  describe: "Update hook script and configuration to latest version",
  builder: (yargs) =>
    yargs
      .positional("path", {
        describe: "Plugin/project root directory",
        default: ".",
        type: "string",
      })
      .option("yes", {
        alias: "y",
        describe: "Skip prompts and use defaults (non-interactive mode)",
        type: "boolean",
        default: false,
      }),
  handler: async (argv) => {
    const root = resolve(argv.path);

    intro(argv.yes, "anthropak update");

    // Create cached file managers
    const settingsFile = createClaudeSettingsClient({
      path: join(root, ".claude", "settings.json"),
    });
    const hooksFile = createClaudePluginHooksClient({ path: join(root, "hooks.json") });

    const mode = await detectMode(root, settingsFile);
    p.log.info(`Detected mode: ${mode}`);

    const paths = resolvePaths(root, mode);

    // Build file action list
    const fileActions: FileAction[] = [];

    const hookScriptExists = await fs.exists(paths.hookScriptPath);
    fileActions.push({
      path: paths.hookScriptDisplayPath,
      action: hookScriptExists ? "update" : "create",
    });

    const hookConfigAction = await resolveHookConfigAction(
      mode,
      settingsFile,
      hooksFile,
      root,
      paths.hookConfigDisplayPath,
      "already up to date",
    );
    fileActions.push(hookConfigAction);

    // Show file summary
    p.log.info("Files to be modified:");
    displayFileActions(fileActions);

    // Confirm before writing
    await confirmOrExit(argv.yes);

    // Write files
    const spinner = p.spinner();
    spinner.start("Writing files...");

    // Create hook directory
    const [mkdirError] = await fs.mkdir(paths.hookDirPath);
    if (mkdirError) {
      spinner.stop(`Failed to create hook directory: ${mkdirError.message}`);
      process.exit(1);
    }

    // Write hook script
    const hookScriptContent = getHookScript();
    const [hookWriteError] = await fs.writeFile(paths.hookScriptPath, hookScriptContent);
    if (hookWriteError) {
      spinner.stop(`Failed to write hook script: ${hookWriteError.message}`);
      process.exit(1);
    }

    // Make hook executable
    const [chmodError] = await fs.chmod(paths.hookScriptPath, 0o755);
    if (chmodError) {
      spinner.stop(`Failed to make hook executable: ${chmodError.message}`);
      process.exit(1);
    }

    // Update hook config if needed
    await writeHookConfig(mode, settingsFile, hooksFile, fileActions, paths.hookConfigDisplayPath);

    spinner.stop("Files written successfully");

    outro(argv.yes, "Done");
  },
};

export default command;
