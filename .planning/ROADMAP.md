# Roadmap: Anthropak

**Created:** 2026-02-06
**Depth:** Quick (3-5 phases)
**Coverage:** 16/16 v1 requirements mapped

## Overview

Anthropak extends from plugin dependency checking to a unified three-ecosystem validator (plugins + CLI tools + MCP servers). This roadmap starts with a greenfield rewrite using proper patterns (ts-pattern, attemptAsync, es-toolkit), then adds CLI tool detection (simpler), then MCP server detection (completes differentiation). Each phase delivers a complete, verifiable capability.

## Phases

### Phase 1: Core Rebuild

**Goal:** Hook and CLI rebuilt from scratch with proper patterns — new nested schema (plugins/cli_tools/mcp_servers), all control flow using ts-pattern, all async using attemptAsync, zero crashes on malformed config.

**Dependencies:** None (foundation)

**Requirements:**

- HARD-01: All control flow uses ts-pattern
- HARD-02: All async error handling uses attemptAsync
- HARD-03: Custom utilities replaced with es-toolkit
- HARD-04: All hook and CLI logic built from scratch with proper patterns
- HARD-05: dependencies.yaml uses new nested schema (plugins/cli_tools/mcp_servers) with version field
- CLI-01: CLI prompts for confirmation before filesystem mutations

**Success Criteria:**

1. Developer can trace any control flow path through ts-pattern match expressions (zero ternaries, zero nested conditionals)
2. Developer can follow async error handling consistently (attemptAsync pattern everywhere, zero try-catch)
3. Hook never crashes on malformed config — always outputs valid JSON or empty object
4. User running `anthropak init` or `anthropak update` sees confirmation prompt before files are written
5. dependencies.yaml uses new nested schema (plugins/cli_tools/mcp_servers) with version field — old flat format not supported

**Plans:** 3 plans

Plans:

- [x] 01-01-PLAN.md — Rebuild hook package (types, config, plugin checker, output, crash-proof entry point)
- [x] 01-02-PLAN.md — Rebuild CLI package (init/update/validate commands with confirmations, new schema template)
- [x] 01-03-PLAN.md — Replace all ternary operators with ts-pattern match() (gap closure for HARD-01)

---

### Phase 2: CLI Tool Dependencies

**Goal:** Users can declare CLI tool dependencies and receive clear guidance when tools are missing — extends Anthropak to second ecosystem with cross-platform detection.

**Dependencies:** Phase 1 (requires schema versioning and hardened error handling)

**Requirements:**

- CTOOL-01: dependencies.yaml schema supports cli_tools section
- CTOOL-02: Hook checks CLI tool presence via which package
- CTOOL-03: Missing CLI tools reported with install guidance
- CTOOL-04: anthropak init scaffolds CLI tool dependencies
- CLI-02: CLI supports non-interactive mode for agent/CI usage

**Success Criteria:**

1. User can add CLI tool dependencies to dependencies.yaml (required/optional arrays)
2. User with missing CLI tool sees type-grouped systemMessage ("CLI Tools: docker (required) not found — install via...")
3. User running `anthropak init` with prompts can declare CLI tool dependencies in scaffolded config
4. User running `anthropak init --yes` skips prompts and uses defaults (agent/CI mode)
5. CLI tool detection works consistently across macOS, Linux, and Windows (spaces in paths handled)

**Plans:** 2 plans

Plans:

- [ ] 02-01-PLAN.md — Hook: CLI tool detection utility, checker, config validation, output formatting
- [ ] 02-02-PLAN.md — CLI: --yes flag for non-interactive mode, template update with cli_tools section

---

### Phase 3: MCP Server Dependencies

**Goal:** Users can declare MCP server dependencies and receive clear guidance when servers are missing — completes three-ecosystem coverage (plugins + CLI + MCP).

**Dependencies:** Phase 2 (completes the multi-ecosystem pattern)

**Requirements:**

- MCP-01: dependencies.yaml schema supports mcp_servers section
- MCP-02: Hook checks MCP server registration in Claude Code config
- MCP-03: Missing MCP servers reported with setup guidance
- MCP-04: anthropak init scaffolds MCP server dependencies
- CLI-03: CLI provides status/list command showing dependency state

**Success Criteria:**

1. User can add MCP server dependencies to dependencies.yaml (required/optional arrays)
2. User with missing MCP server sees type-grouped systemMessage ("MCP Servers: filesystem (required) not registered — add via...")
3. Hook checks both project-scoped (.mcp.json) and user-scoped (~/.claude.json) config files
4. User running `anthropak init` can declare MCP server dependencies in scaffolded config
5. User running `anthropak status` sees one-level-deep visualization of all declared dependencies (found/missing state per type)

---

## Progress

| Phase                       | Status   | Requirements | Success Criteria |
| --------------------------- | -------- | ------------ | ---------------- |
| 1 - Core Rebuild            | Complete | 6            | 5                |
| 2 - CLI Tool Dependencies   | Planned  | 5            | 5                |
| 3 - MCP Server Dependencies | Pending  | 5            | 5                |

**Total:** 3 phases, 16 requirements, 15 success criteria

---

## Next Steps

1. ~~Execute Phase 1 plans~~ ✓
2. ~~Verify Phase 1 success criteria~~ ✓
3. ~~Plan Phase 2 with `/gsd:plan-phase 2`~~ ✓
4. Execute Phase 2 plans with `/gsd:execute-phase 2`
5. Verify Phase 2 success criteria

---

_Roadmap created: 2026-02-06_
_Last updated: 2026-02-07 (Phase 2 planned — 2 plans in 1 wave)_
