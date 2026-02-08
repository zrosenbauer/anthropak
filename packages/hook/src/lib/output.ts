import { match, P } from "ts-pattern";
import type {
  PluginDependency,
  CheckResult,
  HookResponse,
  ConfigLoadResult,
  CliToolDependency,
  CliToolCheckResult,
} from "../types.js";

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
 * Formats missing CLI tools section
 */
export function formatMissingCliTools(missing: CliToolDependency[], required: boolean): string {
  const header = match(required)
    .with(true, () => "**Missing Required CLI Tools**")
    .with(false, () => "**Missing Optional CLI Tools**")
    .exhaustive();

  const lines = [header];

  for (const tool of missing) {
    const priority = match(required)
      .with(true, () => "required")
      .with(false, () => "optional")
      .exhaustive();
    lines.push(`- **${tool.name}** (${priority})`);
    lines.push(`  \`${tool.install}\``);
  }

  return lines.join("\n");
}

/**
 * Formats CLI tools summary when all tools are found
 */
export function formatCliToolsSummary(checkResult: CliToolCheckResult): string {
  const total = checkResult.totalRequired + checkResult.totalOptional;
  const found = total - checkResult.missingRequired.length - checkResult.missingOptional.length;
  return `CLI Tools: ${found}/${total} found`;
}

/**
 * Builds hook response from check result
 * Returns empty object when everything is installed (completely silent)
 */
export function buildHookResponse(
  checkResult: CheckResult,
  cliToolResult?: CliToolCheckResult,
): HookResponse {
  const hasRequired = checkResult.missingRequired.length > 0;
  const hasOptional = checkResult.missingOptional.length > 0;

  const hasCliRequired = match(cliToolResult)
    .with(P.not(P.nullish), (result) => result.missingRequired.length > 0)
    .otherwise(() => false);

  const hasCliOptional = match(cliToolResult)
    .with(P.not(P.nullish), (result) => result.missingOptional.length > 0)
    .otherwise(() => false);

  const cliTotal = match(cliToolResult)
    .with(P.not(P.nullish), (result) => result.totalRequired + result.totalOptional)
    .otherwise(() => 0);

  const hasCliTools = cliTotal > 0;
  const allCliFound = hasCliTools && !hasCliRequired && !hasCliOptional;

  return match({
    hasRequired,
    hasOptional,
    hasCliRequired,
    hasCliOptional,
    allCliFound,
  })
    .with(
      {
        hasRequired: false,
        hasOptional: false,
        hasCliRequired: false,
        hasCliOptional: false,
      },
      () => ({}),
    )
    .otherwise((state) => {
      const parts: string[] = [];

      if (state.hasRequired) {
        parts.push(formatMissingDependencies(checkResult.missingRequired, true));
      }

      if (state.hasOptional) {
        parts.push(formatMissingDependencies(checkResult.missingOptional, false));
      }

      if (cliToolResult) {
        if (state.hasCliRequired) {
          parts.push(formatMissingCliTools(cliToolResult.missingRequired, true));
        }

        if (state.hasCliOptional) {
          parts.push(formatMissingCliTools(cliToolResult.missingOptional, false));
        }

        if (state.allCliFound) {
          parts.push(formatCliToolsSummary(cliToolResult));
        }
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
