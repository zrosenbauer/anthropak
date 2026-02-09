import type { DependenciesConfig, CliToolCheckResult, CliToolDependency } from "../types.js";
import { checkToolExists } from "../lib/cli-detector.js";

/**
 * Checks CLI tool dependencies by attempting to detect each tool
 * Runs all checks in parallel for performance
 */
export async function checkCliTools(config: DependenciesConfig): Promise<CliToolCheckResult> {
  if (!config.cli_tools) {
    return {
      missingRequired: [],
      missingOptional: [],
      totalRequired: 0,
      totalOptional: 0,
    };
  }

  const required = config.cli_tools.required as CliToolDependency[];
  const optional = config.cli_tools.optional as CliToolDependency[];

  const allTools = [...required, ...optional];
  const checkResults = await Promise.all(
    allTools.map(async (tool) => ({
      name: tool.name,
      exists: await checkToolExists(tool.name),
    })),
  );

  const existsMap = new Map<string, boolean>();
  for (const result of checkResults) {
    existsMap.set(result.name, result.exists);
  }

  const missingRequired = required.filter((tool) => !existsMap.get(tool.name));
  const missingOptional = optional.filter((tool) => !existsMap.get(tool.name));

  return {
    missingRequired,
    missingOptional,
    totalRequired: required.length,
    totalOptional: optional.length,
  };
}
