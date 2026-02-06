import { readFile } from "node:fs/promises";
import { attemptAsync } from "es-toolkit";
import { match } from "ts-pattern";
import type { InstalledPluginsRegistry } from "../types.js";
import { DEFAULT_REGISTRY } from "./constants.js";

/**
 * Loads installed plugins registry
 * Returns empty registry on any error (file not found, parse error, etc.)
 */
export async function loadInstalledPlugins(
  registryPath: string,
): Promise<InstalledPluginsRegistry> {
  const [readError, content] = await attemptAsync(async () => {
    return await readFile(registryPath, "utf-8");
  });

  if (readError) {
    return DEFAULT_REGISTRY;
  }

  const [parseError, parsed] = await attemptAsync(async () => {
    const result = JSON.parse(content as string);
    if (result === null) {
      throw new Error("JSON.parse returned null");
    }
    return result as unknown;
  });

  if (parseError) {
    return DEFAULT_REGISTRY;
  }

  return parsed as InstalledPluginsRegistry;
}

/**
 * Checks if a plugin is installed for the current project
 */
export function isPluginInstalled(
  registry: InstalledPluginsRegistry,
  pluginName: string,
  projectDir: string,
): boolean {
  const plugins = registry.plugins;

  // Find all plugin keys matching this plugin name (format: pluginName@source)
  for (const key of Object.keys(plugins)) {
    if (key.startsWith(`${pluginName}@`)) {
      const installations = plugins[key];

      // Check if any installation covers this project
      for (const inst of installations) {
        const covers = match(inst)
          .with({ scope: "global" }, () => true)
          .with({ scope: "project" }, (projectInst) => {
            if (!projectInst.projectPath) {
              return false;
            }
            return (
              projectDir === projectInst.projectPath ||
              projectDir.startsWith(projectInst.projectPath + "/")
            );
          })
          .exhaustive();

        if (covers) {
          return true;
        }
      }
    }
  }

  return false;
}
