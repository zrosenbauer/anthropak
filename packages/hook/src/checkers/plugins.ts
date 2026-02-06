import type { DependenciesConfig, InstalledPluginsRegistry, CheckResult } from "../types.js";
import { isPluginInstalled } from "../lib/registry.js";

/**
 * Checks plugin dependencies against installed plugins registry
 */
export function checkPlugins(
  config: DependenciesConfig,
  registry: InstalledPluginsRegistry,
  projectDir: string,
): CheckResult {
  // If no plugins section, return empty result
  if (!config.plugins) {
    return { missingRequired: [], missingOptional: [] };
  }

  const missingRequired = config.plugins.required.filter(
    (dep) => !isPluginInstalled(registry, dep.plugin, projectDir),
  );

  const missingOptional = config.plugins.optional.filter(
    (dep) => !isPluginInstalled(registry, dep.plugin, projectDir),
  );

  return { missingRequired, missingOptional };
}
