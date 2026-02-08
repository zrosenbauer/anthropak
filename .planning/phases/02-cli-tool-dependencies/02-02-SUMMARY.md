---
phase: 02-cli-tool-dependencies
plan: 02
subsystem: cli
tags: [typescript, yargs, clack-prompts, non-interactive, ci-cd]

# Dependency graph
requires:
  - phase: 01-core-rebuild
    provides: TypeScript type system, ts-pattern, attemptAsync patterns, config validation structure
provides:
  - Non-interactive mode for CLI commands (--yes flag)
  - cli_tools section in scaffolded dependencies.yaml template
  - CLI-side validation for cli_tools entries (name and install fields)
  - Type definitions for CLI tool dependencies and --yes flag options
affects: [02-03-cli-status-command, 03-mcp-servers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Non-interactive mode pattern using match() to guard prompts
    - Quieter output in --yes mode (log.info instead of intro/outro)

key-files:
  created: []
  modified:
    - packages/cli/src/types.ts
    - packages/cli/src/templates/dependencies-yaml.ts
    - packages/cli/src/lib/config-loader.ts
    - packages/cli/src/commands/init.ts
    - packages/cli/src/commands/update.ts
    - packages/cli/src/commands/default.ts
    - packages/hook/src/types.ts
    - packages/hook/src/checkers/plugins.ts

key-decisions:
  - "Field name cli_tools (not cli) matches CONTEXT.md schema decision"
  - "DependencyEntry union type includes both PluginDependency and CliToolDependency"
  - "--yes mode uses log.info for output instead of intro/outro for cleaner CI logs"
  - "All prompts guarded with match(argv.yes) pattern for consistent non-interactive behavior"

patterns-established:
  - "Non-interactive guard pattern: match(argv.yes).with(true, () => default).with(false, async () => prompt)"
  - "Type assertions in checkers when handling union types (PluginDependency[] vs CliToolDependency[])"

# Metrics
duration: 5min
completed: 2026-02-07
---

# Phase 2 Plan 2: CLI Non-Interactive Mode Summary

**--yes flag for CI/agent workflows with cli_tools template scaffolding and validation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-08T02:44:58Z
- **Completed:** 2026-02-08T02:49:41Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- CLI commands support fully non-interactive mode via --yes flag
- Scaffolded dependencies.yaml includes cli_tools section with commented examples
- Config validation rejects malformed cli_tools entries (missing name or install)
- --yes mode produces quieter output suitable for logs and CI pipelines

## Task Commits

Each task was committed atomically:

1. **Task 1: Types, template update, and config validation** - `ba84090` (feat)
2. **Task 2: --yes flag in init and update commands** - `4b7ce35` (feat)

## Files Created/Modified

- `packages/cli/src/types.ts` - Added CliToolDependency interface, yes flag to InitOptions/UpdateOptions, renamed cli to cli_tools
- `packages/cli/src/templates/dependencies-yaml.ts` - Added active cli_tools section with commented examples
- `packages/cli/src/lib/config-loader.ts` - Added validateCliToolEntry function, updated section validation
- `packages/cli/src/commands/init.ts` - Added --yes flag, guarded all prompts, quieter output in non-interactive mode
- `packages/cli/src/commands/update.ts` - Added --yes flag, guarded all prompts, quieter output in non-interactive mode
- `packages/cli/src/commands/default.ts` - Updated to pass yes: false to delegated commands
- `packages/hook/src/types.ts` - Updated DependencyEntry to union type (blocking fix)
- `packages/hook/src/checkers/plugins.ts` - Added type assertions for PluginDependency[] (blocking fix)

## Decisions Made

**Field naming: cli_tools instead of cli**

- CONTEXT.md specifies `cli_tools:` as the YAML key in schema examples
- Both hook and CLI types.ts updated to use `cli_tools` field name
- Ensures consistency between packages and schema specification

**Union type for DependencyEntry**

- Changed from `type DependencyEntry = PluginDependency` to `type DependencyEntry = PluginDependency | CliToolDependency`
- Required type assertions in plugin checker to handle union correctly
- Enables reuse of EcosystemSection interface across all ecosystem types

**Non-interactive output style**

- --yes mode uses `p.log.info()` instead of `p.intro()` and `p.outro()`
- Reduces terminal decoration for cleaner log output in CI/agent workflows
- Still shows file action list for informational transparency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated hook types to unblock CLI build**

- **Found during:** Task 1 (typecheck after CLI types updated)
- **Issue:** Hook typecheck failed because DependencyEntry was still PluginDependency, but cli-tools checker casted to CliToolDependency[]
- **Fix:** Updated hook/src/types.ts to make DependencyEntry a union type, added type assertions in plugins.ts checker
- **Files modified:** packages/hook/src/types.ts, packages/hook/src/checkers/plugins.ts
- **Verification:** pnpm typecheck passes, pnpm build succeeds
- **Committed in:** ba84090 (Task 1 commit)

**Rationale:** Plan 02-02 focuses on CLI changes, but the hook and CLI type files are duplicates. The hook's DependencyEntry type was blocking CLI compilation. This fix unblocks both packages and is minimal in scope (type-level only).

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Essential to unblock build. Type-level change only, no behavior modifications. Plan 02-01 handles hook runtime changes.

## Issues Encountered

None - all planned work completed successfully.

## Next Phase Readiness

**Ready for 02-03 (CLI status command):**

- --yes flag pattern established for non-interactive workflows
- cli_tools validation in place
- Type system supports CLI tool dependencies

**No blockers.**

## Self-Check: PASSED

All files exist and all commits verified:

- packages/cli/src/types.ts: FOUND
- packages/cli/src/templates/dependencies-yaml.ts: FOUND
- packages/cli/src/lib/config-loader.ts: FOUND
- packages/cli/src/commands/init.ts: FOUND
- packages/cli/src/commands/update.ts: FOUND
- packages/cli/src/commands/default.ts: FOUND
- packages/hook/src/types.ts: FOUND
- packages/hook/src/checkers/plugins.ts: FOUND
- Commit ba84090: FOUND
- Commit 4b7ce35: FOUND

---

_Phase: 02-cli-tool-dependencies_
_Completed: 2026-02-07_
