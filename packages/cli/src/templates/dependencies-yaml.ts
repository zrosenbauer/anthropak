// Template for dependencies.yaml with new nested schema (version 1)

export const DEPENDENCIES_YAML_TEMPLATE = `# dependencies.yaml - Anthropak dependency declarations
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

# CLI tool dependencies (Phase 2 - not yet implemented)
# cli:
#   required: []
#   optional: []

# MCP server dependencies (Phase 3 - not yet implemented)
# mcp:
#   required: []
#   optional: []
`;
