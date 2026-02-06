#!/usr/bin/env node
/**
 * Generates src/.generated/ with embedded assets.
 * This allows both npm and standalone binary distributions to work without
 * filesystem reads at runtime.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = join(__dirname, "..");
const HOOK_PACKAGE = join(CLI_ROOT, "..", "hook");
const OUTPUT_DIR = join(CLI_ROOT, "src", ".generated");

function escapeForTemplate(content: string): string {
  return content.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

function main(): void {
  // Ensure output directory exists
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate version.ts
  const packageJsonPath = join(CLI_ROOT, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const version: string = packageJson.version;

  writeFileSync(
    join(OUTPUT_DIR, "version.ts"),
    `// AUTO-GENERATED - DO NOT EDIT
export const VERSION = '${version}'
`,
  );
  console.log("Generated: src/.generated/version.ts");

  // Generate hook.ts
  const hookPath = join(HOOK_PACKAGE, "dist", "anthropak.mjs");
  if (!existsSync(hookPath)) {
    console.error(`Hook script not found: ${hookPath}`);
    console.error('Run "pnpm build" in packages/hook first');
    process.exit(1);
  }
  const hookContent = readFileSync(hookPath, "utf8");

  writeFileSync(
    join(OUTPUT_DIR, "hook.ts"),
    `// AUTO-GENERATED - DO NOT EDIT
export const HOOK_SCRIPT = \`${escapeForTemplate(hookContent)}\`
`,
  );
  console.log("Generated: src/.generated/hook.ts");

  // Generate index.ts barrel export
  writeFileSync(
    join(OUTPUT_DIR, "index.ts"),
    `// AUTO-GENERATED - DO NOT EDIT
export { VERSION } from './version.js'
export { HOOK_SCRIPT } from './hook.js'
`,
  );
  console.log("Generated: src/.generated/index.ts");
}

main();
