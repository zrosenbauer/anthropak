/**
 * @fileoverview Output formatting utilities.
 */

import type { PluginDependency } from "../types.js";

/**
 * Generates the appropriate install command for a plugin dependency.
 * Prioritizes custom install commands, then marketplace, then GitHub sources.
 *
 * @param dep - Plugin dependency object
 * @returns CLI command to install the plugin
 *
 * @example
 * getInstallCommand({ plugin: 'foo', github: 'owner/foo' })
 * // Returns: 'claude plugin add --git git@github.com:owner/foo.git'
 *
 * @example
 * getInstallCommand({ plugin: 'bar', marketplace: 'official' })
 * // Returns: 'claude plugin add bar --marketplace official'
 */
export function getInstallCommand(dep: PluginDependency): string {
  if (dep.install) {
    return dep.install;
  }

  if (dep.marketplace) {
    return `claude plugin add ${dep.plugin} --marketplace ${dep.marketplace}`;
  }

  if (dep.github) {
    return `claude plugin add --git git@github.com:${dep.github}.git`;
  }

  return `claude plugin add ${dep.plugin}`;
}

/**
 * Formats missing dependencies into a markdown message for display.
 *
 * @param missing - Array of missing dependencies
 * @param header - Section header text
 * @returns Array of formatted message lines
 */
export function formatMissingDeps(missing: PluginDependency[], header: string): string[] {
  const messages: string[] = [];

  messages.push(header);

  for (const dep of missing) {
    const desc = dep.description || "";
    messages.push(`- **${dep.plugin}**${desc ? ` - ${desc}` : ""}`);
    messages.push(`  \`${getInstallCommand(dep)}\``);
  }

  return messages;
}
