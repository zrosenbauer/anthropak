import { Liquid } from "liquidjs";
import { DEPENDENCIES_TEMPLATE, HOOK_SCRIPT } from "../.generated/index.js";

const engine = new Liquid();

/**
 * Renders the dependencies.yaml template
 */
export async function renderDependenciesYaml(): Promise<string> {
  return engine.parseAndRender(DEPENDENCIES_TEMPLATE);
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
  type: string;
  command: string;
  timeout: number;
}

/**
 * Default hook entry for anthropak
 */
export const HOOK_ENTRY: HookEntry = {
  type: "command",
  command: "node ${CLAUDE_PLUGIN_ROOT}/hook/anthropak.mjs",
  timeout: 5,
};
