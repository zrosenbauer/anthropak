# Phase 1: Core Rebuild - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Hook and CLI rebuilt from scratch with proper patterns (ts-pattern, attemptAsync, es-toolkit). New nested schema for dependencies.yaml supporting three ecosystems (plugins, CLI tools, MCP servers). Zero crashes on malformed config. This phase covers plugins only — CLI tool detection (Phase 2) and MCP server detection (Phase 3) come later.

</domain>

<decisions>
## Implementation Decisions

### Schema shape
- Top-level `version: 1` field (schema format version, not dependency version)
- Three ecosystem sections: `plugins`, `cli`, `mcp` (short names, not `cli_tools`/`mcp_servers`)
- All sections optional, but **at least one must be present** (can't have version-only config)
- Each section has `required[]` and `optional[]` arrays
- Plugin entry fields: `plugin` (required), `github`, `install`, `description` (all optional) — `marketplace` field dropped
- Supports `.yaml`, `.yml`, `.json`, `.jsonc` file extensions (carry forward from current)

### Missing dependency messages
- Claude's discretion on grouping strategy (by type vs by required/optional)
- Empty object `{}` when everything is installed — completely silent
- Exact install command shown (not docs links) — e.g., `claude plugin add --git git@github.com:owner/repo.git`
- Descriptive format: name + description + install command per missing dep

### CLI init experience
- Scaffold only — create empty config files, no interactive wizard for declaring deps
- Two modes: **plugin** (distributed plugin declaring deps) and **repo** (any codebase ensuring contributors have right tools)
- Auto-detect mode (check for plugin markers like existing hooks.json), then confirm with user
- Both modes use hooks.json for hook triggering
- Same dependencies.yaml schema for both modes — hook doesn't care about the mode
- Summary + confirm before writing files: show list of files to be created/modified, then "Proceed? (y/N)"

### Error behavior
- Malformed config: warn in systemMessage (generic message like "dependencies.yaml has errors — run `anthropak validate` to see details")
- No config file: hint in systemMessage ("No dependencies.yaml found — run `anthropak init` to set up")
- CLI commands (`init`, `update`): more verbose errors with detailed suggestions — interactive context allows it
- Hook never crashes — always outputs valid JSON

### Claude's Discretion
- Dependency message grouping strategy (by type first vs required/optional first)
- CLI framework choice (yargs, citty, or other)
- Detection heuristics for plugin vs repo mode during init
- Exact prompt library (@clack/prompts or alternative)
- Loading/progress UX in CLI

</decisions>

<specifics>
## Specific Ideas

- Two usage modes matter for init: plugin distribution (hook runs when plugin loads) vs repo tooling (hook runs when Claude Code opens the project). Same schema, different scaffolding.
- Keep install guidance as exact runnable commands, not links — the systemMessage is consumed by Claude Code which can act on commands directly.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-core-rebuild*
*Context gathered: 2026-02-06*
