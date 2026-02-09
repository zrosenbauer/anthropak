import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import type { InstalledPluginsRegistry } from "../types.js";

// Default empty registry
export const DEFAULT_REGISTRY: InstalledPluginsRegistry = { plugins: {} };

// Plugin root - two levels up from this file (lib/)
const __dirname = dirname(fileURLToPath(import.meta.url));
export const PLUGIN_ROOT: string = process.env.CLAUDE_PLUGIN_ROOT || join(__dirname, "..", "..");

// Project directory
export const PROJECT_DIR: string = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Installed plugins registry path
export const INSTALLED_PLUGINS_PATH: string = join(
  homedir(),
  ".claude",
  "plugins",
  "installed_plugins.json",
);
