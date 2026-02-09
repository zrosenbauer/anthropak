import type {
  DependenciesConfig,
  InstalledPluginsRegistry,
  CheckResult,
  PluginDependency,
} from "../types.js";
import { isPluginInstalled } from "../lib/registry.js";

/**
 * Checks plugin dependencies against installed plugins registry
 */
export function checkPlugins(
  config: DependenciesConfig,
  registry: InstalledPluginsRegistry,
  projectDir: string,
): CheckResult {
  if (!config.plugins) {
    return { missingRequired: [], missingOptional: [] };
  }

  // Cast to PluginDependency[] since plugins section contains only plugin entries
  const required = config.plugins.required as PluginDependency[];
  const optional = config.plugins.optional as PluginDependency[];

  const missingRequired = required.filter(
    (dep) => !isPluginInstalled(registry, dep.plugin, projectDir),
  );

  const missingOptional = optional.filter(
    (dep) => !isPluginInstalled(registry, dep.plugin, projectDir),
  );

  return { missingRequired, missingOptional };
}
