---
phase: 02-cli-tool-dependencies
verified: 2026-02-08T02:56:48Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 02: CLI Tool Dependencies Verification Report

**Phase Goal:** Users can declare CLI tool dependencies and receive clear guidance when tools are missing — extends Anthropak to second ecosystem with cross-platform detection.

**Verified:** 2026-02-08T02:56:48Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                              | Status     | Evidence                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | Hook detects missing CLI tools from dependencies.yaml and reports them in systemMessage            | ✓ VERIFIED | checkCliTools() in index.ts calls cli-tools.ts checker, buildHookResponse() includes CLI tool sections                |
| 2   | CLI tool detection works cross-platform (which on Unix, where on Windows)                          | ✓ VERIFIED | cli-detector.ts uses match(process.platform) with win32→where, otherwise→which via execFile                           |
| 3   | Missing required tools appear before optional tools in output, clearly tagged                      | ✓ VERIFIED | output.ts formatMissingCliTools() outputs required section before optional, tags each tool with (required)/(optional) |
| 4   | When all CLI tools are found, a summary line is shown (CLI Tools: N/N found)                       | ✓ VERIFIED | formatCliToolsSummary() returns "CLI Tools: ${found}/${total} found", called when allCliFound=true                    |
| 5   | Hook never crashes when cli_tools section is present — malformed entries produce validation errors | ✓ VERIFIED | config.ts validateCliToolEntry() validates name+install fields, returns errors array instead of throwing              |
| 6   | Running `anthropak init --yes` completes without any prompts, writes all files with defaults       | ✓ VERIFIED | init.ts guards all prompts with match(argv.yes), uses log.info instead of intro/outro in --yes mode                   |
| 7   | Running `anthropak update --yes` completes without any prompts, updates hook script                | ✓ VERIFIED | update.ts guards confirm prompt with match(argv.yes), skips stdin reads when true                                     |
| 8   | Scaffolded dependencies.yaml includes cli_tools section with commented-out examples                | ✓ VERIFIED | dependencies-yaml.ts template contains active cli_tools section with commented name+install examples                  |
| 9   | Config validation rejects malformed cli_tools entries (missing name or install)                    | ✓ VERIFIED | Both hook and CLI config-loader.ts validateCliToolEntry() checks name+install required, returns errors                |
| 10  | --yes mode produces quieter output (less decoration, cleaner for logs)                             | ✓ VERIFIED | init.ts and update.ts use p.log.info in --yes mode instead of p.intro/p.outro                                         |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact                                          | Expected                                                       | Status     | Details                                                                                                                              |
| ------------------------------------------------- | -------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/hook/src/lib/cli-detector.ts`           | Cross-platform tool detection using child_process.execFile     | ✓ VERIFIED | Exists (42 lines), exports getDetectionCommand() and checkToolExists(), uses execFile with 3s timeout, no stubs                      |
| `packages/hook/src/checkers/cli-tools.ts`         | CLI tool dependency checker with parallel execution            | ✓ VERIFIED | Exists (47 lines), exports checkCliTools(), uses Promise.all for parallel checks, builds existsMap, no stubs                         |
| `packages/hook/src/types.ts`                      | CliToolDependency type and updated CheckResult                 | ✓ VERIFIED | CliToolDependency interface (name, install), CliToolCheckResult interface with missing arrays and totals, DependencyEntry union type |
| `packages/hook/src/lib/output.ts`                 | CLI tool missing message formatting                            | ✓ VERIFIED | formatMissingCliTools() formats header and tool list with install instructions, formatCliToolsSummary() shows found/total            |
| `packages/hook/src/lib/config.ts`                 | cli_tools entry validation (name + install fields)             | ✓ VERIFIED | validateCliToolEntry() validates name+install as required non-empty strings, integrated in validateEcosystemSection for cli_tools    |
| `packages/cli/src/templates/dependencies-yaml.ts` | Updated template with cli_tools section and commented examples | ✓ VERIFIED | Template contains active cli_tools section with required/optional arrays, commented examples show name+install format                |
| `packages/cli/src/commands/init.ts`               | Init command with --yes flag support                           | ✓ VERIFIED | --yes option added, all prompts guarded with match(argv.yes), quieter output in non-interactive mode                                 |
| `packages/cli/src/commands/update.ts`             | Update command with --yes flag support                         | ✓ VERIFIED | --yes option added, proceed confirmation guarded, quieter output in non-interactive mode                                             |
| `packages/cli/src/lib/config-loader.ts`           | CLI-side config validation for cli_tools entries               | ✓ VERIFIED | Duplicate of hook config.ts, validateCliToolEntry() checks name+install required fields                                              |

### Key Link Verification

| From                                    | To                                      | Via                           | Status  | Details                                                                                  |
| --------------------------------------- | --------------------------------------- | ----------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| packages/hook/src/index.ts              | packages/hook/src/checkers/cli-tools.ts | checkCliTools import and call | ✓ WIRED | Import on line 7, call on line 25 after checkPlugins, result passed to buildHookResponse |
| packages/hook/src/checkers/cli-tools.ts | packages/hook/src/lib/cli-detector.ts   | checkToolExists import        | ✓ WIRED | Import on line 2, called in Promise.all map on line 26                                   |
| packages/hook/src/lib/output.ts         | packages/hook/src/types.ts              | CliToolDependency type import | ✓ WIRED | Import on line 7, used in formatMissingCliTools parameter type                           |
| packages/cli/src/commands/init.ts       | packages/cli/src/types.ts               | InitOptions.yes property      | ✓ WIRED | yes: boolean field exists in InitOptions, used in argv.yes checks throughout handler     |
| packages/cli/src/commands/update.ts     | packages/cli/src/types.ts               | UpdateOptions.yes property    | ✓ WIRED | yes: boolean field exists in UpdateOptions, used in argv.yes checks throughout handler   |

### Requirements Coverage

| Requirement                                                   | Status      | Evidence                                                                         |
| ------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------- |
| CTOOL-01: dependencies.yaml schema supports cli_tools section | ✓ SATISFIED | DependenciesConfig type has cli_tools?: EcosystemSection, config.ts validates it |
| CTOOL-02: Hook checks CLI tool presence via which/where       | ✓ SATISFIED | cli-detector.ts uses which on Unix, where on Windows via execFile                |
| CTOOL-03: Missing CLI tools reported with install guidance    | ✓ SATISFIED | formatMissingCliTools() includes install instructions from config                |
| CTOOL-04: anthropak init scaffolds CLI tool dependencies      | ✓ SATISFIED | Template includes cli_tools section with examples                                |
| CLI-02: CLI supports non-interactive mode for agent/CI usage  | ✓ SATISFIED | --yes flag on init and update commands skips all prompts                         |

### Anti-Patterns Found

**None found**

Scanned files:

- packages/hook/src/lib/cli-detector.ts
- packages/hook/src/checkers/cli-tools.ts
- packages/hook/src/lib/output.ts
- packages/hook/src/lib/config.ts
- packages/cli/src/commands/init.ts
- packages/cli/src/commands/update.ts
- packages/cli/src/templates/dependencies-yaml.ts
- packages/cli/src/lib/config-loader.ts

Checks performed:

- ✓ No ternary operators (HARD-01 compliance: 100%)
- ✓ No try-catch blocks (HARD-02 compliance: all error handling via attemptAsync)
- ✓ No TODO/FIXME/XXX/HACK/placeholder comments
- ✓ No empty return statements (return null, return {}, return [])
- ✓ No console.log-only implementations

### Human Verification Required

None. All verification can be performed programmatically through code inspection and build verification.

### Build Verification

| Check                               | Status     | Details                                                   |
| ----------------------------------- | ---------- | --------------------------------------------------------- |
| pnpm build                          | ✓ PASSED   | Both hook and CLI packages build successfully             |
| pnpm typecheck                      | ✓ PASSED   | Zero type errors in both packages                         |
| Hook artifact includes CLI checking | ✓ VERIFIED | dist/anthropak.mjs contains checkCliTools (2 occurrences) |
| CLI artifact includes cli_tools     | ✓ VERIFIED | dist/cli.mjs contains cli_tools (18 occurrences)          |

### Type System Consistency

**Note:** Minor type inconsistency between packages:

- Hook package: `DependencyEntry = PluginDependency | CliToolDependency` (union)
- CLI package: `DependencyEntry = PluginDependency` (not updated)

**Impact:** None. The CLI package validates CLI tool entries at runtime via validateCliToolEntry(), so the type union is not required for correctness. TypeScript compilation passes cleanly in both packages. This is a cosmetic inconsistency with no functional impact.

---

## Overall Status: PASSED

All must-haves verified. Phase goal achieved.

**Summary:**

- 10/10 observable truths verified
- 9/9 required artifacts exist, are substantive (15-47 lines), and wired correctly
- 5/5 key links verified as wired
- 5/5 requirements satisfied
- 0 blocking anti-patterns
- 0 stub patterns
- Build and typecheck pass
- No human verification needed

The phase delivers exactly what was intended:

1. Users can declare CLI tool dependencies in dependencies.yaml with name+install fields
2. Hook detects missing tools cross-platform via which/where with timeout protection
3. Missing tools reported in systemMessage grouped by priority with install guidance
4. anthropak init scaffolds cli_tools section with examples
5. --yes flag enables fully non-interactive mode for CI/agent workflows

**Ready to proceed to Phase 3.**

---

_Verified: 2026-02-08T02:56:48Z_
_Verifier: Claude (gsd-verifier)_
