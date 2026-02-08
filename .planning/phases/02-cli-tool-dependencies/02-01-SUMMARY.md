---
phase: 02-cli-tool-dependencies
plan: 01
subsystem: hook
tags: [cli-detection, cross-platform, child-process, validation]

# Dependency graph
requires:
  - phase: 01-core-rebuild
    provides: Hook infrastructure with config loading, validation patterns, and crash protection
provides:
  - CLI tool detection utility using which/where with timeout protection
  - CLI tool dependency checker with parallel execution
  - CLI tool config validation (name + install fields required)
  - Integrated CLI tool checking into hook systemMessage output
affects: [02-02, validation-commands, status-commands]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Cross-platform CLI detection via child_process.execFile
    - Parallel tool checking with Promise.all
    - 3-second timeout per tool check
    - Match pattern for optional parameter handling (P.not(P.nullish))

key-files:
  created:
    - packages/hook/src/lib/cli-detector.ts
    - packages/hook/src/checkers/cli-tools.ts
  modified:
    - packages/hook/src/types.ts
    - packages/hook/src/lib/config.ts
    - packages/hook/src/lib/output.ts
    - packages/hook/src/index.ts
    - packages/cli/src/commands/validate.ts

key-decisions:
  - "Renamed DependenciesConfig.cli to cli_tools per CONTEXT.md user-locked decision"
  - "3-second timeout per tool detection to prevent hangs"
  - "Parallel tool checking for performance (all tools checked simultaneously)"
  - "Used match(P.not(P.nullish)) pattern for optional parameter handling"

patterns-established:
  - "Cross-platform command detection: match(process.platform).with('win32', ...).otherwise(...)"
  - "Tool detection with timeout and crash protection via attemptAsync"
  - "Optional parameter handling with match(P.not(P.nullish), ...).otherwise(...)"

# Metrics
duration: 7min
completed: 2026-02-07
---

# Phase 02 Plan 01: CLI Tool Dependencies Summary

**Cross-platform CLI tool detection with which/where, parallel execution, timeout protection, and integrated systemMessage output**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-07T21:43:45Z
- **Completed:** 2026-02-07T21:50:24Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- CLI tool detection working cross-platform (which on Unix, where on Windows)
- All tool checks run in parallel with 3-second timeout protection
- Missing CLI tools reported in systemMessage grouped by required/optional
- Summary line shown when all CLI tools found
- Zero ternaries, zero try-catch in all new code (100% HARD-01 compliance)

## Task Commits

Each task was committed atomically:

1. **Task 1: Types, CLI detector utility, and config validation** - `968e210` (feat)
2. **Task 2: CLI tools checker, output formatting, and entry point integration** - `85dcb31` (feat)

## Files Created/Modified

### Created

- `packages/hook/src/lib/cli-detector.ts` - Cross-platform tool detection using execFile with timeout
- `packages/hook/src/checkers/cli-tools.ts` - CLI tool checker with parallel execution

### Modified

- `packages/hook/src/types.ts` - Added CliToolDependency, CliToolCheckResult types; renamed cli to cli_tools
- `packages/hook/src/lib/config.ts` - Added validateCliToolEntry; renamed cli to cli_tools
- `packages/hook/src/lib/output.ts` - Added formatMissingCliTools, formatCliToolsSummary; updated buildHookResponse
- `packages/hook/src/index.ts` - Integrated checkCliTools call in success path
- `packages/cli/src/commands/validate.ts` - Updated cli references to cli_tools

## Decisions Made

**1. Field rename: cli → cli_tools**

- Rationale: CONTEXT.md specifies cli_tools as user-locked YAML key; TypeScript field must match
- Impact: All config validation, type definitions, and CLI commands updated

**2. 3-second timeout per tool check**

- Rationale: Detection should fail fast if tool lookup hangs; within CONTEXT.md guideline (2-3 seconds)
- Implementation: setTimeout wrapping execFile callback

**3. Parallel tool execution**

- Rationale: Performance - checking N tools serially would be N×timeout worst case
- Implementation: Promise.all mapping over all tools

**4. Match pattern for optional parameters**

- Rationale: Zero-ternary policy requires match() for conditional logic
- Pattern: `match(cliToolResult).with(P.not(P.nullish), ...).otherwise(...)`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**1. TypeScript type error in cli-detector.ts**

- Issue: `match(error).with(null, () => result)` returned `boolean | null` instead of `boolean`
- Fix: Added non-null assertion `result!` when error is null
- Rationale: When error is null from attemptAsync, result must be defined

**2. Pre-existing CLI package type errors**

- Issue: CLI init/update commands missing `yes` field in type definitions
- Status: Ignored - these are for Phase 2 plan 02 (non-interactive mode), not this plan's scope
- Verification: Hook package typecheck passes cleanly

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 2 Plan 02:**

- Hook can detect and report missing CLI tools
- Config validation enforces cli_tools entry structure
- Output formatting established for missing tool messages
- Cross-platform detection infrastructure in place

**Blockers:** None

**Concerns:** None - all success criteria met

---

_Phase: 02-cli-tool-dependencies_
_Completed: 2026-02-07_

## Self-Check: PASSED

All created files verified:

- packages/hook/src/lib/cli-detector.ts ✓
- packages/hook/src/checkers/cli-tools.ts ✓

All commits verified:

- 968e210 ✓
- 85dcb31 ✓
