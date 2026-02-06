import { match, P } from "ts-pattern";
import type { PluginDependency, CheckResult, HookResponse, ConfigLoadResult } from "../types.js";

/**
 * Determines install command for a plugin dependency
 * Priority: custom install > github > fallback
 */
export function getInstallCommand(dep: PluginDependency): string {
  return match(dep)
    .with({ install: P.string }, (d) => d.install!)
    .with({ github: P.string }, (d) => `claude plugin add --git git@github.com:${d.github}.git`)
    .otherwise((d) => `claude plugin add ${d.plugin}`);
}

/**
 * Formats missing dependencies section
 */
export function formatMissingDependencies(missing: PluginDependency[], required: boolean): string {
  const header = match(required)
    .with(true, () => "**Missing Required Plugin Dependencies**")
    .with(false, () => "**Missing Optional Plugin Dependencies**")
    .exhaustive();

  const lines = [header];

  for (const dep of missing) {
    const desc = match(dep.description)
      .with(P.string, (d) => ` - ${d}`)
      .otherwise(() => "");
    lines.push(`- **${dep.plugin}**${desc}`);
    lines.push(`  \`${getInstallCommand(dep)}\``);
  }

  return lines.join("\n");
}

/**
 * Builds hook response from check result
 * Returns empty object when everything is installed (completely silent)
 */
export function buildHookResponse(checkResult: CheckResult): HookResponse {
  const hasRequired = checkResult.missingRequired.length > 0;
  const hasOptional = checkResult.missingOptional.length > 0;

  return match({ hasRequired, hasOptional })
    .with({ hasRequired: false, hasOptional: false }, () => ({}))
    .otherwise(() => {
      const parts: string[] = [];

      if (hasRequired) {
        parts.push(formatMissingDependencies(checkResult.missingRequired, true));
      }

      if (hasOptional) {
        parts.push(formatMissingDependencies(checkResult.missingOptional, false));
      }

      return { systemMessage: parts.join("\n\n") };
    });
}

/**
 * Builds error response for non-success config states
 */
export function buildErrorResponse(loadResult: ConfigLoadResult): HookResponse {
  return match(loadResult)
    .with({ status: "not_found" }, () => ({
      systemMessage:
        "No dependencies.yaml found. Run `anthropak init` to set up dependency checking.",
    }))
    .with({ status: "parse_error" }, () => ({
      systemMessage: "dependencies.yaml has syntax errors. Run `anthropak validate` for details.",
    }))
    .with({ status: "validation_error" }, () => ({
      systemMessage:
        "dependencies.yaml has validation errors. Run `anthropak validate` for details.",
    }))
    .with({ status: "success" }, () => {
      // This case should never be called with success, but TypeScript needs it
      return {};
    })
    .exhaustive();
}
