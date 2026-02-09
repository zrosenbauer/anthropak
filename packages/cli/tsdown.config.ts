import { defineConfig } from "tsdown";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export default defineConfig({
  entry: {
    "cli.mjs": "src/cli.ts",
  },
  format: ["esm"],
  clean: true,
  dts: true,
  shims: true,
  outputOptions: {
    entryFileNames: "[name]",
  },
  onSuccess: () => {
    const hookDir = join("..", "hook", "dist");
    const hookScript = readFileSync(join(hookDir, "anthropak.mjs"), "utf8");

    mkdirSync("dist/hook", { recursive: true });
    writeFileSync("dist/hook/anthropak.mjs", hookScript);
    console.log("Copied hook to dist/");
  },
});
