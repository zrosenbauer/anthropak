#!/usr/bin/env bun
/**
 * Builds standalone binaries for all platforms using Bun's compile feature.
 * Output binaries are placed in packages/cli/bin/
 */

import { execSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = join(__dirname, "..");
const BIN_DIR = join(CLI_ROOT, "bin");
const ENTRY_POINT = join(CLI_ROOT, "src", "cli.ts");

interface Target {
  name: string;
  bunTarget: string;
}

const TARGETS: Target[] = [
  { name: "anthropak-darwin-arm64", bunTarget: "bun-darwin-arm64" },
  { name: "anthropak-darwin-x64", bunTarget: "bun-darwin-x64" },
  { name: "anthropak-linux-arm64", bunTarget: "bun-linux-arm64" },
  { name: "anthropak-linux-x64", bunTarget: "bun-linux-x64" },
  { name: "anthropak-windows-x64.exe", bunTarget: "bun-windows-x64" },
];

function checkBunInstalled(): void {
  try {
    execSync("bun --version", { stdio: "pipe" });
  } catch {
    console.error("Error: Bun is not installed.");
    console.error("Install Bun: https://bun.sh");
    process.exit(1);
  }
}

function checkGeneratedAssets(): void {
  const generatedDir = join(CLI_ROOT, "src", ".generated");
  if (!existsSync(generatedDir)) {
    console.error("Error: src/.generated/ not found.");
    console.error('Run "pnpm generate:assets" first.');
    process.exit(1);
  }
}

function buildBinary(target: Target): void {
  const outputPath = join(BIN_DIR, target.name);
  const cmd = `bun build ${ENTRY_POINT} --compile --target=${target.bunTarget} --outfile=${outputPath}`;

  console.log(`Building ${target.name}...`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: CLI_ROOT });
    console.log(`  ✓ ${target.name}`);
  } catch (error) {
    console.error(`  ✗ Failed to build ${target.name}`);
    throw error;
  }
}

function main(): void {
  console.log("Building standalone binaries with Bun...\n");

  checkBunInstalled();
  checkGeneratedAssets();

  // Create output directory
  mkdirSync(BIN_DIR, { recursive: true });

  // Build all targets
  for (const target of TARGETS) {
    buildBinary(target);
  }

  console.log(`\nAll binaries built successfully in: ${BIN_DIR}`);
}

main();
