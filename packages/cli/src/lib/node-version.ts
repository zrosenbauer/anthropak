// Node.js version check middleware using ts-pattern
import * as p from "@clack/prompts";
import { match } from "ts-pattern";

const MIN_NODE_VERSION = 18;

/**
 * Check if running under Bun runtime
 */
function isBunRuntime(): boolean {
  return typeof process.versions.bun !== "undefined";
}

/**
 * Check if the current Node.js version supports ESM by default.
 * Skips check when running under Bun runtime.
 */
export function checkNodeVersion(): void {
  match(isBunRuntime())
    .with(true, () => {
      // Bun has full ESM support, skip Node version check
    })
    .with(false, () => {
      const currentVersion = process.versions.node;
      const majorVersion = parseInt(currentVersion.split(".")[0], 10);

      match(majorVersion >= MIN_NODE_VERSION)
        .with(true, () => {
          // Version check passed
        })
        .with(false, () => {
          p.log.error(
            `Node.js ${MIN_NODE_VERSION}+ is required for ESM support. Current version: ${currentVersion}`,
          );
          process.exit(1);
        })
        .exhaustive();
    })
    .exhaustive();
}
