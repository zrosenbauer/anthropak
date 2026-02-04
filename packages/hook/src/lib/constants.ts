import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import type { InstalledPluginsRegistry } from '../types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const PLUGIN_ROOT: string = process.env.CLAUDE_PLUGIN_ROOT || join(__dirname, '..', '..')

export const PROJECT_DIR: string = process.env.CLAUDE_PROJECT_DIR || process.cwd()

export const INSTALLED_PLUGINS_PATH: string = join(homedir(), '.claude', 'plugins', 'installed_plugins.json')

export const DEFAULT_REGISTRY: InstalledPluginsRegistry = { plugins: {} }

export const CONFIG_FILES = [
  { name: 'dependencies.yaml', ext: 'yaml' },
  { name: 'dependencies.yml', ext: 'yaml' },
  { name: 'dependencies.json', ext: 'json' },
  { name: 'dependencies.jsonc', ext: 'jsonc' }
] as const
