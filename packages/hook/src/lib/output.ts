import { match, P } from "ts-pattern";
import type {
  PluginDependency,
  CheckResult,
  ConfigLoadResult,
  CliToolDependency,
  CliToolCheckResult,
  SessionStartResponse,
  UserPromptSubmitBlockResponse,
  DependencyCheckResult,
} from "../types.js";

type Format = "markdown" | "plain";

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
 * Formats missing plugin dependencies in markdown or plain text
 */
export function formatMissingDependencies(
  missing: PluginDependency[],
  required: boolean,
  format: Format = "markdown",
): string {
  const isMarkdown = format === "markdown";
  const header = required
    ? isMarkdown
      ? "**Missing Required Plugin Dependencies**"
      : "Missing required plugin dependencies:"
    : isMarkdown
      ? "**Missing Optional Plugin Dependencies**"
      : "Missing optional plugin dependencies:";

  const lines = [header];

  for (const dep of missing) {
    const desc = dep.description ? ` - ${dep.description}` : "";
    if (isMarkdown) {
      lines.push(`- **${dep.plugin}**${desc}`);
      lines.push(`  \`${getInstallCommand(dep)}\``);
    } else {
      lines.push(`  - ${dep.plugin}${desc}`);
      lines.push(`    Install: ${getInstallCommand(dep)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Formats missing CLI tools in markdown or plain text
 */
export function formatMissingCliTools(
  missing: CliToolDependency[],
  required: boolean,
  format: Format = "markdown",
): string {
  const isMarkdown = format === "markdown";
  const header = required
    ? isMarkdown
      ? "**Missing Required CLI Tools**"
      : "Missing required CLI tools:"
    : isMarkdown
      ? "**Missing Optional CLI Tools**"
      : "Missing optional CLI tools:";

  const lines = [header];

  for (const tool of missing) {
    if (isMarkdown) {
      const priority = required ? "required" : "optional";
      lines.push(`- **${tool.name}** (${priority})`);
      lines.push(`  \`${tool.install}\``);
    } else {
      lines.push(`  - ${tool.name}`);
      lines.push(`    Install: ${tool.install}`);
    }
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
 * Collects formatted parts for missing dependencies in both markdown and plain text.
 */
function collectFormattedParts(
  checkResult: CheckResult,
  cliToolResult: CliToolCheckResult | undefined,
  hasRequired: boolean,
  hasOptional: boolean,
  hasCliRequired: boolean,
  hasCliOptional: boolean,
  allCliFound: boolean,
  format: Format,
): string[] {
  const parts: string[] = [];

  if (hasRequired) {
    parts.push(formatMissingDependencies(checkResult.missingRequired, true, format));
  }
  if (hasCliRequired && cliToolResult) {
    parts.push(formatMissingCliTools(cliToolResult.missingRequired, true, format));
  }
  if (hasOptional) {
    parts.push(formatMissingDependencies(checkResult.missingOptional, false, format));
  }
  if (hasCliOptional && cliToolResult) {
    parts.push(formatMissingCliTools(cliToolResult.missingOptional, false, format));
  }
  if (allCliFound && cliToolResult) {
    parts.push(formatCliToolsSummary(cliToolResult));
  }

  return parts;
}

/**
 * Builds hook response from check result
 * - Required deps missing: returns context + blocked cache for UserPromptSubmit block
 * - Optional deps missing: adds markdown context for Claude
 * - All found: silent (or CLI summary via context)
 */
export function buildHookResponse(
  checkResult: CheckResult,
  cliToolResult?: CliToolCheckResult,
): DependencyCheckResult {
  const hasRequired = checkResult.missingRequired.length > 0;
  const hasOptional = checkResult.missingOptional.length > 0;

  const hasCliRequired = cliToolResult ? cliToolResult.missingRequired.length > 0 : false;
  const hasCliOptional = cliToolResult ? cliToolResult.missingOptional.length > 0 : false;
  const cliTotal = cliToolResult ? cliToolResult.totalRequired + cliToolResult.totalOptional : 0;

  const hasCliTools = cliTotal > 0;
  const allCliFound = hasCliTools && !hasCliRequired && !hasCliOptional;
  const anyRequired = hasRequired || hasCliRequired;

  // All deps found — completely silent (or show CLI summary)
  if (!anyRequired && !hasOptional && !hasCliOptional) {
    const response = allCliFound
      ? contextResponse(formatCliToolsSummary(cliToolResult!), "[anthropak] CLI tools check passed")
      : ({} as Record<string, never>);
    return { response, cache: { blocked: false, reason: "" } };
  }

  // Required deps missing — provide context to Claude and cache for UserPromptSubmit block
  if (anyRequired) {
    const markdownParts = collectFormattedParts(
      checkResult,
      cliToolResult,
      hasRequired,
      hasOptional,
      hasCliRequired,
      hasCliOptional,
      allCliFound,
      "markdown",
    );
    const plainParts = collectFormattedParts(
      checkResult,
      cliToolResult,
      hasRequired,
      hasOptional,
      hasCliRequired,
      hasCliOptional,
      allCliFound,
      "plain",
    );

    markdownParts.push("Install the required dependencies and restart the session.");
    plainParts.push("Install the required dependencies and restart the session.");

    return {
      response: contextResponse(
        markdownParts.join("\n\n"),
        "[anthropak] Missing required dependencies — see context for details",
      ),
      cache: { blocked: true, reason: plainParts.join("\n\n") },
    };
  }

  // Only optional deps missing — inform Claude via context (markdown)
  const parts = collectFormattedParts(
    checkResult,
    cliToolResult,
    false,
    hasOptional,
    false,
    hasCliOptional,
    allCliFound,
    "markdown",
  );

  return {
    response: contextResponse(
      parts.join("\n\n"),
      "[anthropak] Missing optional dependencies — see context for details",
    ),
    cache: { blocked: false, reason: "" },
  };
}

/**
 * Builds UserPromptSubmit block response when required deps are missing
 */
export function buildUserPromptSubmitBlockResponse(reason: string): UserPromptSubmitBlockResponse {
  return {
    decision: "block",
    reason,
  };
}

/**
 * Builds error response for non-success config states
 * Config errors are non-blocking — logged as context for Claude
 */
export function buildErrorResponse(loadResult: ConfigLoadResult): DependencyCheckResult {
  const cache = { blocked: false, reason: "" };
  return match(loadResult)
    .with({ status: "not_found" }, () => ({
      response: contextResponse(
        "No anthropak.yaml found. Run `anthropak init` to set up dependency checking.",
        "[anthropak] No anthropak.yaml found — run `anthropak init` to set up",
      ),
      cache,
    }))
    .with({ status: "parse_error" }, () => ({
      response: contextResponse(
        "anthropak.yaml has syntax errors. Run `anthropak validate` for details.",
        "[anthropak] anthropak.yaml has syntax errors — run `anthropak validate`",
      ),
      cache,
    }))
    .with({ status: "validation_error" }, () => ({
      response: contextResponse(
        "anthropak.yaml has validation errors. Run `anthropak validate` for details.",
        "[anthropak] anthropak.yaml has validation errors — run `anthropak validate`",
      ),
      cache,
    }))
    .with({ status: "success" }, () => ({
      // This case should never be called with success, but TypeScript needs it
      response: {} as Record<string, never>,
      cache,
    }))
    .exhaustive();
}

function contextResponse(context: string, systemMessage: string): SessionStartResponse {
  return {
    systemMessage,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: context,
    },
  };
}
