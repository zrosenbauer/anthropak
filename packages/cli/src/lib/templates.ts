// Template and asset access (no template engine needed)
import { DEPENDENCIES_YAML_TEMPLATE } from "../templates/dependencies-yaml.js";
import { HOOK_SCRIPT } from "../.generated/index.js";

/**
 * Returns the dependencies.yaml template
 * No rendering needed - template has no dynamic parts
 */
export function renderDependenciesYaml(): string {
  return DEPENDENCIES_YAML_TEMPLATE;
}

/**
 * Gets the bundled anthropak hook script
 */
export function getHookScript(): string {
  return HOOK_SCRIPT;
}

/**
 * Hook entry configuration
 */
export interface HookEntry {
  name: string;
  script: string;
}

/**
 * Default hook entry for anthropak
 */
export const HOOK_ENTRY: HookEntry = {
  name: "anthropak",
  script: "hook/anthropak.mjs",
};
