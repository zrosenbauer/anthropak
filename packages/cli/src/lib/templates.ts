import { HOOK_SCRIPT } from "../.generated/index.js";
import type { ClaudeHookMatcherGroup, Mode } from "../types.js";

/**
 * Returns the anthropak.yaml template
 */
export function renderAnthropakYaml(): string {
  return `# anthropak.yaml - Anthropak dependency declarations
# Documentation: https://github.com/zrosenbauer/anthropak#readme

version: 1

# Plugin dependencies (Claude Code plugins)
plugins:
  required: []
  #  - plugin: "example-plugin"              # Required: plugin identifier
  #    github: "owner/repo"                  # Optional: GitHub repo for installation
  #    install: "claude plugin add ..."     # Optional: custom install command
  #    description: "What this plugin does"  # Optional: human-readable description

  optional: []
  #  - plugin: "example-plugin"
  #    github: "owner/repo"
  #    install: "claude plugin add ..."
  #    description: "What this plugin does"

# CLI tool dependencies
cli_tools:
  required: []
  #  - name: "docker"                           # Required: tool name
  #    install: "brew install docker"            # Required: install instructions

  optional: []
  #  - name: "terraform"
  #    install: "brew install terraform"

# MCP server dependencies (Phase 3 - not yet implemented)
# mcp:
#   required: []
#   optional: []
`;
}

/**
 * Gets the bundled anthropak hook script
 */
export function getHookScript(): string {
  return HOOK_SCRIPT;
}

/**
 * Creates a hook matcher group for the given root location.
 * - "repo": uses $CLAUDE_PROJECT_DIR env var for .claude/settings.json
 * - "plugin": uses relative path for hooks.json
 */
export function createHookEntry(root: Mode): ClaudeHookMatcherGroup {
  const command =
    root === "repo" ? '"$CLAUDE_PROJECT_DIR"/.claude/hooks/anthropak.mjs' : "hook/anthropak.mjs";

  return {
    hooks: [{ type: "command", command }],
  };
}
