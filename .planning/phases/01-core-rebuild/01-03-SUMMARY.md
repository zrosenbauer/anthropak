---
phase: 01-core-rebuild
plan: 03
subsystem: control-flow
tags: [ts-pattern, refactor, ternary-elimination, code-quality]
requires:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
provides:
  - Zero ternary operators in hook and CLI packages
  - 100% HARD-01 compliance (all control flow via ts-pattern)
  - Pattern-based string formatting and error handling
affects:
  - All future code must follow ts-pattern-only pattern
tech-stack:
  added: []
  patterns:
    - "String formatting via match(P.string).otherwise()"
    - "Error message extraction via match(P.instanceOf(Error))"
    - "Boolean selection via match(bool).with(true/false).exhaustive()"
    - "Crash-proof fallback via match({ error, response }).with({ error: P.nullish })"
key-files:
  created: []
  modified:
    - packages/hook/src/lib/output.ts
    - packages/hook/src/lib/config.ts
    - packages/hook/src/index.ts
    - packages/cli/src/lib/config-loader.ts
    - packages/cli/src/commands/init.ts
    - packages/cli/src/commands/update.ts
key-decisions:
  - decision: "Use match(P.nullish) for error checking in attemptAsync results"
    rationale: "attemptAsync returns [Error, undefined] | [null, T], so nullish check catches null success case"
    impact: "Standard pattern for all attemptAsync error handling"
  - decision: "Use 'as const' assertions for literal string returns"
    rationale: "Ensures type safety when returning 'create' | 'update' literals"
    impact: "TypeScript correctly infers discriminated union types"
patterns-established:
  - pattern: "Header/description formatting"
    implementation: "match(required).with(true/false).exhaustive() for headers, match(desc).with(P.string).otherwise() for optional fields"
    location: "packages/hook/src/lib/output.ts"
  - pattern: "Error message extraction"
    implementation: "match(error).with(P.instanceOf(Error)).otherwise()"
    location: "packages/hook/src/lib/config.ts, packages/cli/src/lib/config-loader.ts"
  - pattern: "File action selection"
    implementation: "match(exists).with(true/false).exhaustive() returning 'as const' literals"
    location: "packages/cli/src/commands/init.ts, packages/cli/src/commands/update.ts"
metrics:
  duration: "2 minutes"
  completed: "2026-02-06"
  tasks: 2
  commits: 2
  ternaries-eliminated: 9
---

# Phase 1 Plan 3: Ternary Elimination Summary

**One-liner:** Eliminated all 9 ternary operators across hook and CLI packages using ts-pattern match() expressions for 100% HARD-01 compliance

## Objective Achieved

Closed the single verification gap from 01-VERIFICATION.md by replacing all remaining ternary operators with ts-pattern match() expressions. Zero ternaries now exist in packages/hook/src/ and packages/cli/src/, achieving complete HARD-01 compliance.

## Task Commits

| Task | Description                                     | Commit  | Files                                                              |
| ---- | ----------------------------------------------- | ------- | ------------------------------------------------------------------ |
| 1    | Replace ternaries in hook package (4 ternaries) | 594b387 | packages/hook/src/lib/output.ts, config.ts, index.ts               |
| 2    | Replace ternaries in CLI package (5 ternaries)  | 57bafc1 | packages/cli/src/lib/config-loader.ts, commands/init.ts, update.ts |

## Ternary Replacements Detail

### Hook Package (4 ternaries → 4 match() expressions)

**packages/hook/src/lib/output.ts** (2 replacements):

1. **Header selection** (line 19):

   ```typescript
   // BEFORE: const header = required ? "Missing Required..." : "Missing Optional...";
   // AFTER:
   const header = match(required)
     .with(true, () => "**Missing Required Plugin Dependencies**")
     .with(false, () => "**Missing Optional Plugin Dependencies**")
     .exhaustive();
   ```

2. **Optional description formatting** (line 26):
   ```typescript
   // BEFORE: const desc = dep.description ? ` - ${dep.description}` : "";
   // AFTER:
   const desc = match(dep.description)
     .with(P.string, (d) => ` - ${d}`)
     .otherwise(() => "");
   ```

**packages/hook/src/lib/config.ts** (1 replacement): 3. **Error message fallback** (line 39):

```typescript
// BEFORE: const errorMessage = parseError instanceof Error ? parseError.message : "Parse error";
// AFTER:
const errorMessage = match(parseError)
  .with(P.instanceOf(Error), (e) => e.message)
  .otherwise(() => "Parse error");
```

**packages/hook/src/index.ts** (1 replacement): 4. **Crash-proof output fallback** (line 33):

```typescript
// BEFORE: const output = error ? {} : response;
// AFTER:
const output = match({ error, response })
  .with({ error: P.nullish }, ({ response: r }) => r)
  .otherwise(() => ({}));
```

### CLI Package (5 ternaries → 5 match() expressions)

**packages/cli/src/lib/config-loader.ts** (1 replacement): 5. **Error message fallback** (line 48):

```typescript
// Identical pattern to hook/config.ts
const errorMessage = match(parseError)
  .with(P.instanceOf(Error), (e) => e.message)
  .otherwise(() => "Parse error");
```

**packages/cli/src/commands/init.ts** (2 replacements): 6. **Hook script action selection** (line 103):

```typescript
// BEFORE: action: hookScriptExists ? "update" : "create",
// AFTER:
action: match(hookScriptExists)
  .with(true, () => "update" as const)
  .with(false, () => "create" as const)
  .exhaustive(),
```

7. **Reason formatting** (line 131):
   ```typescript
   // BEFORE: const reason = action.reason ? ` (${action.reason})` : "";
   // AFTER:
   const reason = match(action.reason)
     .with(P.string, (r) => ` (${r})`)
     .otherwise(() => "");
   ```

**packages/cli/src/commands/update.ts** (2 replacements): 8. **Hook script action selection** (line 32) - identical to init.ts #6 9. **Reason formatting** (line 61) - identical to init.ts #7

## Verification Results

All verification criteria passed:

- **Build**: `pnpm build` succeeded with no errors (hook → CLI pipeline)
- **Typecheck**: `pnpm typecheck` passed with zero type errors
- **Ternary elimination**: Confirmed zero ternaries in both packages (grep validation)
- **Pattern adoption**: 26 `.exhaustive()` calls, 16 `.otherwise()` calls across codebase
- **Pre-existing lint warnings**: 4 warnings in hook/config.ts and cli/config-loader.ts for `no-await-in-loop` (acceptable, have eslint-disable comments)

## Pattern Library Additions

This plan established reusable match() patterns for common operations:

1. **Boolean-based selection**: `match(bool).with(true/false).exhaustive()`
2. **Optional string formatting**: `match(value).with(P.string, (v) => template).otherwise(() => "")`
3. **Error message extraction**: `match(err).with(P.instanceOf(Error), (e) => e.message).otherwise(() => fallback)`
4. **Crash-proof fallback**: `match({ error, response }).with({ error: P.nullish }, ({ response: r }) => r).otherwise(() => default)`
5. **Literal type selection**: `match(bool).with(true, () => "literal" as const).exhaustive()`

## Deviations from Plan

None - plan executed exactly as written. All 9 ternaries identified in the verification gap were replaced mechanically with match() expressions.

## Impact on Phase 1 Completion

This plan closes the final gap in 01-VERIFICATION.md:

**Before**: HARD-01 compliance was 96% (9 ternaries remained)
**After**: HARD-01 compliance is 100% (zero ternaries exist)

Phase 1 Core Rebuild is now feature-complete. All three plans executed:

- 01-01: Hook package rebuilt with ts-pattern, attemptAsync, zero try-catch
- 01-02: CLI package rebuilt with prompts, confirmations, templates
- 01-03: Ternary elimination for 100% pattern compliance (this plan)

## Next Phase Readiness

Phase 1 is complete. Ready to proceed to Phase 2 (CLI Tools) which will implement:

- `anthropak validate` command
- `anthropak status` command
- CLI tools for managing CLI/MCP dependencies (structure validation only)

No blockers identified. All foundation patterns are now in place.

## Self-Check: PASSED

All key files verified:

- ✓ packages/hook/src/lib/output.ts exists
- ✓ packages/hook/src/lib/config.ts exists

Git log verification:

- ✓ Commit 594b387 found (hook package refactor)
- ✓ Commit 57bafc1 found (CLI package refactor)
