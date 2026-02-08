# Requirements: Anthropak

**Defined:** 2026-02-06
**Core Value:** When a plugin loads, the user immediately knows what's missing and how to install it

## v1 Requirements

### Core Rebuild

- [x] **HARD-01**: All control flow uses ts-pattern instead of ternaries or nested conditionals
- [x] **HARD-02**: All async error handling uses es-toolkit attemptAsync instead of try-catch
- [x] **HARD-03**: Custom utility checks replaced with es-toolkit equivalents
- [x] **HARD-04**: All hook and CLI logic built from scratch with proper patterns (ts-pattern, attemptAsync, es-toolkit)
- [x] **HARD-05**: dependencies.yaml uses new nested schema (plugins/cli_tools/mcp_servers) with version field

### CLI Tool Dependencies

- [x] **CTOOL-01**: dependencies.yaml schema supports `cli_tools` section with required/optional arrays
- [x] **CTOOL-02**: Hook checks CLI tool presence via `which` package (cross-platform PATH check)
- [x] **CTOOL-03**: Missing CLI tools reported in systemMessage with install guidance
- [x] **CTOOL-04**: `anthropak init` scaffolds CLI tool dependencies in dependencies.yaml

### MCP Server Dependencies

- [ ] **MCP-01**: dependencies.yaml schema supports `mcp_servers` section with required/optional arrays
- [ ] **MCP-02**: Hook checks MCP server registration in Claude Code config (`.mcp.json` + global settings)
- [ ] **MCP-03**: Missing MCP servers reported in systemMessage with setup guidance
- [ ] **MCP-04**: `anthropak init` scaffolds MCP server dependencies in dependencies.yaml

### CLI Experience

- [x] **CLI-01**: CLI prompts for confirmation before any filesystem mutations
- [x] **CLI-02**: CLI supports non-interactive mode (flag) for agent/CI usage — skips prompts, assumes defaults
- [ ] **CLI-03**: CLI provides status/list command showing declared dependencies and their found/missing state (one-level-deep visualization)

## v2 Requirements

### Convenience

- **CONV-01**: Auto-fix command generation (output exact install commands)
- **CONV-02**: Version range matching for CLI tools (semver-style >=1.2.0)
- **CONV-03**: Smart scope resolution (project-local node_modules/.bin + global PATH)
- **CONV-04**: Granular severity levels (error/warn/info beyond required/optional)

### Testing

- **TEST-01**: Config validation tests (schema parsing, edge cases)
- **TEST-02**: Checker tests (plugin, CLI, MCP checker logic)
- **TEST-03**: Output formatting tests (systemMessage generation)

## Out of Scope

| Feature                                 | Reason                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------- |
| Preserving old dependencies.yaml format | Greenfield rewrite — no backward compat needed                            |
| Migration from existing schema          | Not in production yet — just use new schema                               |
| Version checking for CLI tools          | Just presence check via PATH, not semver — keep v1 simple                 |
| MCP server health/running checks        | Only check registration in config, not if process is running              |
| Dry-run mode                            | Unnecessary complexity — CLI already confirms before mutations            |
| Auto-installation of dependencies       | Permission issues, breaks user control — provide install guidance instead |
| Watch/continuous mode                   | Unclear user need, performance overhead                                   |
| Workspace multi-project support         | Narrow use case, adds complexity                                          |
| Custom validation scripts               | Security concerns with arbitrary code execution                           |

## Traceability

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| HARD-01     | Phase 1 | Complete |
| HARD-02     | Phase 1 | Complete |
| HARD-03     | Phase 1 | Complete |
| HARD-04     | Phase 1 | Complete |
| HARD-05     | Phase 1 | Complete |
| CLI-01      | Phase 1 | Complete |
| CTOOL-01    | Phase 2 | Complete |
| CTOOL-02    | Phase 2 | Complete |
| CTOOL-03    | Phase 2 | Complete |
| CTOOL-04    | Phase 2 | Complete |
| CLI-02      | Phase 2 | Complete |
| MCP-01      | Phase 3 | Pending  |
| MCP-02      | Phase 3 | Pending  |
| MCP-03      | Phase 3 | Pending  |
| MCP-04      | Phase 3 | Pending  |
| CLI-03      | Phase 3 | Pending  |

**Coverage:**

- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---

_Requirements defined: 2026-02-06_
_Last updated: 2026-02-07 — Phase 2 requirements complete_
