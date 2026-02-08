# Phase 2: CLI Tool Dependencies - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can declare CLI tool dependencies in dependencies.yaml and receive clear guidance when tools are missing. Extends Anthropak to its second ecosystem (CLI tools alongside plugins) with cross-platform detection. Does NOT include version checking, scheduled checks, or MCP server support.

</domain>

<decisions>
## Implementation Decisions

### Missing tool messaging

- Group by priority: required tools section first, then optional tools section — clear visual separation
- Install guidance is user-provided in config (users specify install instructions per tool in dependencies.yaml)
- Same message format for both required and optional, just tagged (required) or (optional) — no emoji/icon difference between them
- When all CLI tools are found, show a summary line ("CLI Tools: 3/3 found") — but only on session start, not every invocation

### Init scaffolding flow

- Init scaffolds an empty cli_tools section — no interactive prompts for adding tools during init
- Include commented-out examples showing the format in the scaffolded YAML (e.g., `# - name: docker\n#   install: brew install docker`)
- Schema uses required/optional arrays (not a per-tool flag):
  ```yaml
  cli_tools:
    required:
      - name: docker
        install: "brew install docker"
    optional:
      - name: terraform
        install: "brew install terraform"
  ```
- Each tool entry has: name (string) and install (string, install instructions)

### Detection behavior

- Presence-only detection via which/where — no version checking
- Uniform internal utility wrapping child_process (which on macOS/Linux, where on Windows) — no external dependencies (no shelljs, no npm which package)
- Short timeout per tool lookup (2-3 seconds) — fail gracefully as "not found" if detection hangs
- All tool lookups run in parallel (Promise.all) for speed

### Non-interactive mode

- `--yes` flag skips all prompts and uses defaults — fully non-interactive for CI/agent workflows
- `--yes` applies to both `anthropak init` and `anthropak update` (skip confirmations on both)
- No environment variable alternative — flag only
- Quieter output in --yes mode — less decoration/color, cleaner for logs, same content

### Claude's Discretion

- Exact timeout duration per tool lookup
- --yes default scaffolding choices
- Error message formatting details
- How to detect which platform for which vs where

</decisions>

<specifics>
## Specific Ideas

- Schema mirrors the existing nested pattern (plugins/cli_tools/mcp_servers) with required/optional arrays — placement in array IS the declaration
- "All found" summary line should only appear on session start, not on every hook invocation
- Child process wrapper should be a clean internal utility, not a third-party package

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 02-cli-tool-dependencies_
_Context gathered: 2026-02-06_
