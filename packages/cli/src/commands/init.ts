import * as p from "@clack/prompts";
import { existsSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { join, resolve } from "node:path";
import type { CommandModule } from "yargs";
import { renderDependenciesYaml, getHookScript } from "../lib/templates.js";
import { readHooksJson, hookExists, addHookEntry, writeHooksJson } from "../lib/hooks.js";

interface InitArgs {
  path: string;
  force: boolean;
}

const command: CommandModule<object, InitArgs> = {
  command: "init [path]",
  describe: "Initialize plugin dependency management",
  builder: (yargs) =>
    yargs
      .positional("path", {
        describe: "Plugin root directory",
        default: ".",
        type: "string",
      })
      .option("force", {
        alias: "f",
        describe: "Overwrite existing dependencies.yaml",
        type: "boolean",
        default: false,
      }),
  handler: async (argv) => {
    const root = resolve(argv.path);
    const hooksDir = join(root, "hook");
    const depsFile = join(root, "dependencies.yaml");
    const hookScript = join(hooksDir, "anthropak.mjs");
    const hooksJsonPath = join(root, "hooks.json");

    p.intro("Initializing plugin dependencies");
    p.log.info(`Root: ${root}`);

    if (!existsSync(hooksDir)) {
      mkdirSync(hooksDir, { recursive: true });
      p.log.success("Created hook/ directory");
    }

    if (!existsSync(depsFile) || argv.force) {
      const content = await renderDependenciesYaml();
      writeFileSync(depsFile, content);
      p.log.success(
        argv.force && existsSync(depsFile)
          ? "Overwrote dependencies.yaml"
          : "Created dependencies.yaml",
      );
    } else {
      p.log.warn("dependencies.yaml already exists (use --force to overwrite)");
    }

    const scriptExists = existsSync(hookScript);
    const scriptContent = getHookScript();
    writeFileSync(hookScript, scriptContent);
    chmodSync(hookScript, 0o755);
    p.log.success(scriptExists ? "Updated hook/anthropak.mjs" : "Created hook/anthropak.mjs");

    const existingHooks = readHooksJson(hooksJsonPath);
    if (hookExists(existingHooks)) {
      p.log.info("hooks.json already contains anthropak hook");
    } else {
      const updatedHooks = addHookEntry(existingHooks);
      writeHooksJson(hooksJsonPath, updatedHooks);
      p.log.success(existsSync(hooksJsonPath) ? "Updated hooks.json" : "Created hooks.json");
    }

    p.outro("Edit dependencies.yaml to declare your plugin dependencies.");
  },
};

export default command;
