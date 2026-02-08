# Project State: Anthropak

**Last Updated:** 2026-02-07

## Project Reference

**Core Value:** When a plugin loads, the user immediately knows what's missing and how to install it

**Current Focus:** Phase 2 (CLI Tool Dependencies) in progress

---

## Current Position

**Phase:** 2 of 3 (CLI Tool Dependencies)
**Plan:** 2 of 3 in current phase
**Status:** In progress
**Last activity:** 2026-02-07 - Completed 02-02-PLAN.md

**Progress:** `[█████████████░░░░░░░]` 50% (5/9 plans completed across all phases)

---

## Performance Metrics

| Metric                 | Target | Actual | Status      |
| ---------------------- | ------ | ------ | ----------- |
| Phase completion       | —      | 1/3    | In Progress |
| Requirements delivered | —      | 6/16   | In Progress |
| Success criteria met   | —      | 5/15   | In Progress |

---

## Accumulated Context

### Key Decisions

| Date       | Decision                                             | Rationale                                                 | Outcome                                                 |
| ---------- | ---------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| 2026-02-06 | Greenfield rewrite, not refactor                     | Not in production — build it right from scratch           | Phase 1 renamed to "Core Rebuild"                       |
| 2026-02-06 | Existing code is reference only                      | No backward compat, no migration — just rebuild           | New nested schema, new patterns throughout              |
| 2026-02-06 | ts-pattern + attemptAsync + es-toolkit from day 1    | Proper patterns from start, not bolted on later           | All Phase 1 logic uses these patterns                   |
| 2026-02-06 | CLI tools before MCP servers                         | Simpler implementation validates checker abstraction      | Phase 2 → Phase 3 order                                 |
| 2026-02-06 | Tests deferred to v2                                 | Ship working features first                               | No test phase in roadmap                                |
| 2026-02-06 | Distribute CLI experience requirements               | Prompts/non-interactive/status belong with their context  | CLI-01 in Phase 1, CLI-02 in Phase 2, CLI-03 in Phase 3 |
| 2026-02-06 | Zero try-catch policy (01-01)                        | All error handling through attemptAsync for composability | [error, result] tuple pattern throughout                |
| 2026-02-06 | Discriminated unions for results (01-01)             | Type-safe branching with compiler-enforced exhaustiveness | ValidationResult uses status field                      |
| 2026-02-06 | Top-level crash protection (01-01)                   | Hook must never crash, even on unexpected errors          | Entry point wraps entire execution in attemptAsync      |
| 2026-02-06 | Remove liquidjs dependency (01-02)                   | Template is simple YAML with no dynamic parts             | Plain TypeScript string constant, reduced dependencies  |
| 2026-02-06 | Duplicate config loading in CLI (01-02)              | CLI and hook run in different environments                | CLI has own config-loader.ts, acceptable duplication    |
| 2026-02-06 | Default 'No' for confirmations (01-02)               | Safety before filesystem mutations per CONTEXT.md         | All confirm() prompts default to false                  |
| 2026-02-06 | Use match(P.nullish) for attemptAsync errors (01-03) | attemptAsync returns [Error, undefined] or [null, T]      | Standard pattern for crash-proof error checking         |
| 2026-02-06 | 'as const' assertions for literal returns (01-03)    | Ensures TypeScript infers correct discriminated unions    | Type-safe action selection in init/update commands      |
| 2026-02-07 | Field name cli_tools (not cli) (02-02)               | CONTEXT.md specifies cli_tools as YAML key                | Both packages use cli_tools field consistently          |
| 2026-02-07 | DependencyEntry union type (02-02)                   | Support both PluginDependency and CliToolDependency       | Type assertions in checkers handle union correctly      |
| 2026-02-07 | --yes mode quieter output (02-02)                    | CI/agent logs don't need terminal decoration              | log.info instead of intro/outro in non-interactive mode |
| 2026-02-07 | Non-interactive guard pattern (02-02)                | Consistent approach across all prompts                    | match(argv.yes) pattern guards all stdin reads          |

### Open Questions

- None

### Blockers

- None

### Todos

- [ ] Plan Phase 1 with `/gsd:plan-phase 1`
- [ ] Execute Phase 1 plans
- [ ] Verify Phase 1 success criteria
- [ ] Plan Phase 2
- [ ] Execute Phase 2 plans
- [ ] Verify Phase 2 success criteria
- [ ] Plan Phase 3
- [ ] Execute Phase 3 plans
- [ ] Verify Phase 3 success criteria

---

## Session Continuity

**Last session:** 2026-02-07T02:49:41Z
**Stopped at:** Completed 02-02-PLAN.md
**Resume file:** None

### What Just Happened

Completed 02-02-PLAN.md: CLI non-interactive mode with cli_tools template

- Added --yes flag to init and update commands for CI/agent workflows
- Updated dependencies.yaml template with cli_tools section and commented examples
- Added CLI-side validation for cli_tools entries (name and install required)
- Implemented non-interactive guard pattern: match(argv.yes) before all prompts
- Fixed hook types to use DependencyEntry union (unblocked CLI build)
- All commands run without stdin reads when --yes is passed
- Quieter output in --yes mode for cleaner CI logs

### What's Next

Continue Phase 2 (CLI Tool Dependencies):

- Plan 02-03: CLI status command for checking CLI tool dependencies
- Remaining Phase 2 plans for full CLI tool support

No blockers. Non-interactive mode pattern established.

---

_State tracking started: 2026-02-06_
