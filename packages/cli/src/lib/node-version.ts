import * as p from "@clack/prompts";

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
  // Bun has full ESM support, skip Node version check
  if (isBunRuntime()) {
    return;
  }

  const currentVersion = process.versions.node;
  const majorVersion = parseInt(currentVersion.split(".")[0], 10);

  if (majorVersion < MIN_NODE_VERSION) {
    p.log.error(
      `Node.js ${MIN_NODE_VERSION}+ is required for ESM support. Current version: ${currentVersion}`,
    );
    process.exit(1);
  }
}
