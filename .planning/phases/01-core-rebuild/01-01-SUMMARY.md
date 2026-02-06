---
phase: 01-core-rebuild
plan: 01
subsystem: core
tags: [ts-pattern, es-toolkit, confbox, hook, dependency-checking]

# Dependency graph
requires:
  - phase: none
    provides: "Greenfield rewrite - no prior dependencies"
provides:
  - "Hook package rebuilt from scratch with proper patterns"
  - "New nested schema (version: 1, plugins/cli/mcp sections)"
  - "Crash-proof dependency checking with discriminated unions"
  - "Plugin installation verification against registry"
affects: [02-cli-rebuild, 03-mcp-detection]

# Tech tracking
tech-stack:
  added: [ts-pattern, es-toolkit]
  patterns:
    [
      "attemptAsync for all async operations",
      "ts-pattern match().exhaustive() for all control flow",
      "discriminated unions for result types",
    ]

key-files:
  created:
    [
      packages/hook/src/types.ts,
      packages/hook/src/lib/constants.ts,
      packages/hook/src/lib/config.ts,
      packages/hook/src/checkers/plugins.ts,
    ]
  modified:
    [
      packages/hook/package.json,
      packages/hook/tsdown.config.ts,
      packages/hook/src/index.ts,
      packages/hook/src/lib/io.ts,
      packages/hook/src/lib/output.ts,
      packages/hook/src/lib/registry.ts,
    ]

key-decisions:
  - "Use attemptAsync for all error handling - zero try-catch blocks"
  - "Use ts-pattern match().exhaustive() for all control flow - zero ternaries, zero nested conditionals"
  - "Top-level attemptAsync wrapper in entry point ensures hook never crashes"
  - "Discriminated union ValidationResult with status field for type-safe error handling"
  - "New nested schema with version field and ecosystem sections (plugins/cli/mcp)"

patterns-established:
  - "Pattern 1: All async operations wrapped in attemptAsync, returning [error, result] tuple"
  - "Pattern 2: All branching logic uses ts-pattern match().with().exhaustive()"
  - "Pattern 3: Discriminated unions for result types with status field"
  - "Pattern 4: Config validation returns structured errors, not thrown exceptions"

# Metrics
duration: 4min
completed: 2026-02-06
---

# Phase 1 Plan 01: Core Rebuild Summary

**Hook package rebuilt from scratch using ts-pattern (control flow), attemptAsync (async), new nested schema (version: 1, plugins/cli/mcp), and crash-proof entry point with zero try-catch blocks**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-06T22:00:48Z
- **Completed:** 2026-02-06T22:04:55Z
- **Tasks:** 2/2
- **Files modified:** 12

## Accomplishments

- Hook rebuilt from scratch with proper patterns (no legacy code preserved)
- New nested schema supporting three ecosystems (plugins, CLI tools, MCP servers)
- All async operations use attemptAsync - zero try-catch blocks
- All control flow uses ts-pattern match().exhaustive() - zero ternaries, zero nested conditionals
- Discriminated union ValidationResult enables type-safe error handling
- Top-level crash protection ensures hook always outputs valid JSON
- Plugin dependency checking against installed_plugins.json registry
- Missing dependencies reported with install commands (custom > github > fallback)
- Empty object {} returned when all dependencies installed (completely silent)

## Task Commits

Each task was committed atomically:

1. **Task 1: Types, constants, and config loading/validation** - `69762bd` (feat)
   - New nested schema types with version: 1, plugins/cli/mcp sections
   - ValidationResult as discriminated union
   - Config loading with attemptAsync, validation with ts-pattern
   - Multi-format support (yaml/yml/json/jsonc)

2. **Task 2: Plugin checker, output formatting, and crash-proof entry point** - `6d29804` (feat)
   - Plugin checker in new checkers/ directory
   - Registry loading checks global/project scope with ts-pattern
   - Output formatting with install command priority
   - Crash-proof entry point with top-level attemptAsync
   - Deleted utils.ts (replaced by attemptAsync pattern)

## Files Created/Modified

**Created:**

- `packages/hook/src/types.ts` - New nested schema types, discriminated unions
- `packages/hook/src/lib/constants.ts` - Config files, environment paths
- `packages/hook/src/lib/config.ts` - Config loading and validation (attemptAsync + ts-pattern)
- `packages/hook/src/checkers/plugins.ts` - Plugin dependency checking

**Modified:**

- `packages/hook/package.json` - Added ts-pattern and es-toolkit dependencies
- `packages/hook/tsdown.config.ts` - Added new deps to noExternal for bundling
- `packages/hook/src/index.ts` - Crash-proof entry point with top-level attemptAsync
- `packages/hook/src/lib/io.ts` - Rewritten with attemptAsync
- `packages/hook/src/lib/output.ts` - Install command formatting with ts-pattern
- `packages/hook/src/lib/registry.ts` - Registry loading with attemptAsync
- `pnpm-lock.yaml` - Updated with new dependencies

**Deleted:**

- `packages/hook/src/lib/utils.ts` - Replaced by attemptAsync + JSON.parse pattern

## Decisions Made

- **Zero try-catch policy:** All error handling through attemptAsync, returning [error, result] tuples. Enables composable error handling without exceptions.
- **Zero ternaries/nested conditionals:** All branching through ts-pattern match().exhaustive(). TypeScript ensures all cases handled.
- **Discriminated unions for results:** ValidationResult uses status field for type-safe branching. Compiler enforces exhaustive handling.
- **Top-level crash protection:** Entry point wraps entire execution in attemptAsync. Hook outputs valid JSON even on unexpected errors.
- **New nested schema:** Version field (literal type 1), three ecosystem sections (plugins/cli/mcp), each with required/optional arrays.
- **Removed marketplace field:** Dropped from CONTEXT.md decisions - not in new schema.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - greenfield rewrite enabled clean implementation from scratch.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Hook package complete and building successfully. Ready for CLI rebuild (Plan 02).

**Blockers:** None

**Foundation established:**

- Proper patterns throughout (attemptAsync, ts-pattern, discriminated unions)
- New schema validated and working
- Plugin checking functional
- Hook builds to dist/anthropak.mjs

## Self-Check: PASSED

All claimed files and commits verified.

---

_Phase: 01-core-rebuild_
_Completed: 2026-02-06_
