import { join, resolve } from "node:path";
import type { CommandModule } from "yargs";
import { config } from "@anthropak/utils";
import fs from "../lib/fs.js";
import init from "./init.js";
import update from "./update.js";

interface DefaultArgs {
  path: string;
}

/**
 * Check if anthropak is initialized in the given directory
 * Checks for anthropak.yaml in the resolved config dir (.claude-plugin/ or .claude/)
 */
async function isInitialized(root: string): Promise<boolean> {
  const configDir = config.resolveConfigDir(root);
  return fs.exists(join(configDir, "anthropak.yaml"));
}

export default {
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

    if (initialized) {
      update.handler({ ...argv, yes: false, _: [], $0: "" });
    } else {
      init.handler({ ...argv, force: false, yes: false, _: [], $0: "" });
    }
  },
} satisfies CommandModule<object, DefaultArgs>;
