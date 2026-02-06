# Project State: Anthropak

**Last Updated:** 2026-02-06

## Project Reference

**Core Value:** When a plugin loads, the user immediately knows what's missing and how to install it

**Current Focus:** Roadmap revised (greenfield rewrite approach), ready for Phase 1 planning (Core Rebuild)

---

## Current Position

**Phase:** 1 - Core Rebuild
**Plan:** Not started
**Status:** Roadmap revised for greenfield rewrite, awaiting plan-phase
**Progress:** `[░░░░░░░░░░░░░░░░░░░░]` 0% (0/3 phases complete)

---

## Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Phase completion | — | 0/3 | Pending |
| Requirements delivered | — | 0/16 | Pending |
| Success criteria met | — | 0/15 | Pending |

---

## Accumulated Context

### Key Decisions

| Date | Decision | Rationale | Outcome |
|------|----------|-----------|---------|
| 2026-02-06 | Greenfield rewrite, not refactor | Not in production — build it right from scratch | Phase 1 renamed to "Core Rebuild" |
| 2026-02-06 | Existing code is reference only | No backward compat, no migration — just rebuild | New nested schema, new patterns throughout |
| 2026-02-06 | ts-pattern + attemptAsync + es-toolkit from day 1 | Proper patterns from start, not bolted on later | All Phase 1 logic uses these patterns |
| 2026-02-06 | CLI tools before MCP servers | Simpler implementation validates checker abstraction | Phase 2 → Phase 3 order |
| 2026-02-06 | Tests deferred to v2 | Ship working features first | No test phase in roadmap |
| 2026-02-06 | Distribute CLI experience requirements | Prompts/non-interactive/status belong with their context | CLI-01 in Phase 1, CLI-02 in Phase 2, CLI-03 in Phase 3 |

### Open Questions

- None (roadmap revised, ready for planning)

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

### What Just Happened

Roadmap revised based on user feedback (greenfield rewrite approach):
- Phase 1 renamed: "Code Hardening" → "Core Rebuild"
- Phase 1 goal updated: reflects rebuilding from scratch, not refactoring
- Phase 1 success criteria updated: new code quality, not migration concerns
- REQUIREMENTS.md updated: HARD-04/HARD-05 descriptions reflect greenfield approach
- Out of scope expanded: preserving old schema format, migration concerns
- Key decisions updated: greenfield rewrite, existing code as reference only

### What's Next

Next action: `/gsd:plan-phase 1` to decompose Phase 1 (Core Rebuild) into executable plans.

Focus: Build hook and CLI from scratch using ts-pattern (all control flow), attemptAsync (all async), es-toolkit (all utilities), new nested schema (plugins/cli_tools/mcp_servers with version field), confirmation prompts.

### Context for Next Session

- Quick depth = 1-3 plans per phase
- Phase 1 has 6 requirements → expect 2-3 plans
- Research summary suggests no additional research needed (patterns are standard)
- User constraint: code style matters (no ternaries, no nested conditionals, use ts-pattern + es-toolkit)
- Schema is NEW: nested structure (plugins/cli_tools/mcp_servers) with version field
- Existing code: reference material only, not something to preserve or migrate

---

*State tracking started: 2026-02-06*
