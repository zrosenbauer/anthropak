import { existsSync, readFileSync } from 'node:fs'
import type { InstalledPluginsRegistry, PluginInstallation } from '../types.js'
import { safeParse } from './utils.js'
import { DEFAULT_REGISTRY } from './constants.js'

/**
 * Checks if a project directory is covered by an installation.
 */
function isProjectCovered(inst: PluginInstallation, projectDir: string): boolean {
  if (inst.scope === 'global') {
    return true
  }
  if (!inst.projectPath) {
    return false
  }
  return (
    projectDir === inst.projectPath ||
    projectDir.startsWith(inst.projectPath + '/')
  )
}

/**
 * Loads the installed plugins registry.
 *
 * @param registryPath - Path to the installed_plugins.json file
 * @returns Registry object, or empty registry if file doesn't exist or is invalid
 */
export function loadInstalledPlugins(registryPath: string): InstalledPluginsRegistry {
  if (!existsSync(registryPath)) {
    return DEFAULT_REGISTRY
  }
  try {
    const content = readFileSync(registryPath, 'utf8')
    return safeParse(content, DEFAULT_REGISTRY)
  } catch {
    return DEFAULT_REGISTRY
  }
}

/**
 * Checks if a plugin is installed and available for the current project.
 * A plugin is considered installed if it has a global installation or
 * a project-scoped installation that covers the current project path.
 *
 * @param installedPlugins - Registry of installed plugins
 * @param plugin - Plugin identifier to check
 * @param marketplace - Optional marketplace to match exactly
 * @param projectDir - Current project directory path
 * @returns True if the plugin is installed and available
 */
export function isPluginInstalled(
  installedPlugins: InstalledPluginsRegistry,
  plugin: string,
  marketplace: string | undefined,
  projectDir: string
): boolean {
  const plugins = installedPlugins.plugins || {}

  if (marketplace) {
    const key = `${plugin}@${marketplace}`
    const installations = plugins[key] || []
    return installations.some((inst) => isProjectCovered(inst, projectDir))
  }

  for (const key of Object.keys(plugins)) {
    if (key.startsWith(`${plugin}@`)) {
      const installations = plugins[key] || []
      if (installations.some((inst) => isProjectCovered(inst, projectDir))) {
        return true
      }
    }
  }

  return false
}
