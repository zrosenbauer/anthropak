// Init command - scaffold anthropak.yaml with mode detection and confirmation
import * as p from "@clack/prompts";
import { resolve, join } from "node:path";
import { match } from "ts-pattern";
import type { CommandModule } from "yargs";
import { renderAnthropakYaml, getHookScript } from "../lib/templates.js";
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
import type { InitOptions, Mode, FileAction } from "../types.js";

const command: CommandModule<object, InitOptions> = {
  command: "init [path]",
  describe: "Initialize dependency management",
  builder: (yargs) =>
    yargs
      .positional("path", {
        describe: "Plugin/project root directory",
        default: ".",
        type: "string",
      })
      .option("force", {
        alias: "f",
        describe: "Overwrite existing files",
        type: "boolean",
        default: false,
      })
      .option("yes", {
        alias: "y",
        describe: "Skip prompts and use defaults (non-interactive mode)",
        type: "boolean",
        default: false,
      }),
  handler: async (argv) => {
    const root = resolve(argv.path);

    intro(argv.yes, "anthropak init");

    // Detect mode
    const detectedMode = await detectMode(root);
    p.log.info(`Detected mode: ${detectedMode}`);

    // Confirm mode (skip if --yes)
    let mode: Mode = detectedMode;
    if (!argv.yes) {
      const result = await p.confirm({
        message: `Use ${detectedMode} mode?`,
        initialValue: true,
      });

      if (p.isCancel(result)) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }

      if (!result) {
        mode = detectedMode === "plugin" ? "repo" : "plugin";
      }
    }

    p.log.info(argv.yes ? `Mode: ${mode} (auto)` : `Mode: ${mode}`);

    // Create cached file managers
    const settingsFile = createClaudeSettingsClient({
      path: join(root, ".claude", "settings.json"),
    });
    const hooksFile = createClaudePluginHooksClient({ path: join(root, "hooks.json") });

    const paths = resolvePaths(root, mode);

    // Build file action list
    const fileActions: FileAction[] = [];

    const depsExists = await fs.exists(paths.configFilePath);
    fileActions.push(
      match({ exists: depsExists, force: argv.force })
        .with({ exists: false }, () => ({
          path: paths.configDisplayPath,
          action: "create" as const,
        }))
        .with({ exists: true, force: true }, () => ({
          path: paths.configDisplayPath,
          action: "update" as const,
          reason: "overwriting with --force",
        }))
        .with({ exists: true, force: false }, () => ({
          path: paths.configDisplayPath,
          action: "skip" as const,
          reason: "already exists",
        }))
        .exhaustive(),
    );

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
      "hook already configured",
    );
    fileActions.push(hookConfigAction);

    // Show file summary
    p.log.info("\nFiles to be modified:");
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

    // Create config directory
    const configDirPath = join(root, paths.configDir);
    const [configDirError] = await fs.mkdir(configDirPath);
    if (configDirError) {
      spinner.stop(`Failed to create config directory: ${configDirError.message}`);
      process.exit(1);
    }

    // Write anthropak.yaml if needed
    const depsAction = fileActions.find((a) => a.path === paths.configDisplayPath)?.action;
    if (depsAction === "create" || depsAction === "update") {
      const template = renderAnthropakYaml();
      const [writeError] = await fs.writeFile(paths.configFilePath, template);
      if (writeError) {
        spinner.stop(`Failed to write anthropak.yaml: ${writeError.message}`);
        process.exit(1);
      }
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

    outro(argv.yes, `Edit ${paths.configDisplayPath} to declare your dependencies.`);
  },
};

export default command;
