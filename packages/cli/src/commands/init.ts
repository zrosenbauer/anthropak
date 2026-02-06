// Init command - scaffold dependencies.yaml with mode detection and confirmation
import * as p from "@clack/prompts";
import { resolve, join } from "node:path";
import { match, P } from "ts-pattern";
import type { CommandModule } from "yargs";
import { renderDependenciesYaml, getHookScript } from "../lib/templates.js";
import { readHooksJson, hookExists, addHookEntry, writeHooksJson } from "../lib/hooks.js";
import { fileExists, mkdirAsync, writeFileAsync, chmodAsync } from "../lib/fs.js";
import type { InitOptions, InitMode, FileAction } from "../types.js";

/**
 * Detect init mode based on plugin markers
 */
async function detectMode(rootDir: string): Promise<InitMode> {
  const hasHooksJson = await fileExists(join(rootDir, "hooks.json"));
  const hasClaudePlugin = await fileExists(join(rootDir, ".claude-plugin"));
  const hasPluginJson = await fileExists(join(rootDir, "plugin.json"));

  return match({ hasHooksJson, hasClaudePlugin, hasPluginJson })
    .with(
      P.union({ hasHooksJson: true }, { hasClaudePlugin: true }, { hasPluginJson: true }),
      () => "plugin" as InitMode,
    )
    .otherwise(() => "repo" as InitMode);
}

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
      }),
  handler: async (argv) => {
    const root = resolve(argv.path);

    p.intro("anthropak init");

    // Detect mode
    const detectedMode = await detectMode(root);
    p.log.info(`Detected mode: ${detectedMode}`);

    // Confirm mode
    const useDetectedMode = await p.confirm({
      message: `Use ${detectedMode} mode?`,
      initialValue: true,
    });

    if (p.isCancel(useDetectedMode)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }

    const mode: InitMode = match(useDetectedMode)
      .with(true, () => detectedMode)
      .with(false, () =>
        match(detectedMode)
          .with("plugin", () => "repo" as InitMode)
          .with("repo", () => "plugin" as InitMode)
          .exhaustive(),
      )
      .exhaustive();

    p.log.info(`Mode: ${mode}`);

    // Build file action list
    const fileActions: FileAction[] = [];

    const depsFile = join(root, "dependencies.yaml");
    const depsExists = await fileExists(depsFile);
    fileActions.push(
      match({ exists: depsExists, force: argv.force })
        .with({ exists: false }, () => ({
          path: "dependencies.yaml",
          action: "create" as const,
        }))
        .with({ exists: true, force: true }, () => ({
          path: "dependencies.yaml",
          action: "update" as const,
          reason: "overwriting with --force",
        }))
        .with({ exists: true, force: false }, () => ({
          path: "dependencies.yaml",
          action: "skip" as const,
          reason: "already exists",
        }))
        .exhaustive(),
    );

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
          reason: "hook already configured",
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
    p.log.info("\nFiles to be modified:");
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

    // Write dependencies.yaml if needed
    const depsAction = fileActions.find((a) => a.path === "dependencies.yaml")?.action;
    if (depsAction === "create" || depsAction === "update") {
      const template = renderDependenciesYaml();
      const [writeError] = await writeFileAsync(depsFile, template);
      if (writeError) {
        spinner.stop(`Failed to write dependencies.yaml: ${writeError.message}`);
        process.exit(1);
      }
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

    p.outro("Edit dependencies.yaml to declare your dependencies.");
  },
};

export default command;
