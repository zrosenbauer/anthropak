// Default command - auto-detect and delegate to init or update
import { join, resolve } from "node:path";
import { match } from "ts-pattern";
import type { CommandModule } from "yargs";
import { fileExists } from "../lib/fs.js";
import init from "./init.js";
import update from "./update.js";

interface DefaultArgs {
  path: string;
}

/**
 * Check if anthropak is initialized in the given directory
 */
async function isInitialized(root: string): Promise<boolean> {
  const hooksDir = await fileExists(join(root, "hook"));
  const depsFile = await fileExists(join(root, "dependencies.yaml"));
  return hooksDir && depsFile;
}

const command: CommandModule<object, DefaultArgs> = {
  command: "$0 [path]",
  describe: false, // hidden from help
  builder: (yargs) =>
    yargs.positional("path", {
      describe: "Plugin/project root directory",
      default: ".",
      type: "string",
    }),
  handler: async (argv) => {
    const root = resolve(argv.path);
    const initialized = await isInitialized(root);

    match(initialized)
      .with(true, () => {
        update.handler({ ...argv, yes: false, _: [], $0: "" });
      })
      .with(false, () => {
        init.handler({ ...argv, force: false, yes: false, _: [], $0: "" });
      })
      .exhaustive();
  },
};

export default command;
