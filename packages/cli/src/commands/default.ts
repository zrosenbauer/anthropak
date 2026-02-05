import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { CommandModule } from "yargs";
import init from "./init.js";
import update from "./update.js";

interface DefaultArgs {
  path: string;
}

function isInitialized(root: string): boolean {
  const hooksDir = join(root, "hook");
  const depsFile = join(root, "dependencies.yaml");
  return existsSync(hooksDir) && existsSync(depsFile);
}

const command: CommandModule<object, DefaultArgs> = {
  command: "$0 [path]",
  describe: false, // hidden from help
  builder: (yargs) =>
    yargs.positional("path", {
      describe: "Plugin root directory",
      default: ".",
      type: "string",
    }),
  handler: (argv) => {
    const root = resolve(argv.path);

    if (isInitialized(root)) {
      update.handler({ ...argv, _: [], $0: "" });
    } else {
      init.handler({ ...argv, force: false, _: [], $0: "" });
    }
  },
};

export default command;
