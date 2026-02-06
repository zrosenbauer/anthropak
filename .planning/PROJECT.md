# Anthropak

## What This Is

Anthropak is a CLI tool and hook system that lets Claude Code plugins declare and check for dependencies — other plugins, CLI tools, and MCP servers. When dependencies are missing, the hook tells Claude Code what's wrong and how to fix it. Think of it as a package manager's dependency checker, but for the Claude Code ecosystem.

## Core Value

When a plugin loads, the user immediately knows what's missing and how to install it — no silent failures, no mysterious breakage.

## Requirements

### Validated

- ✓ Plugin dependency declaration via `dependencies.yaml` — existing
- ✓ Hook checks Claude's `installed_plugins.json` registry for declared plugin dependencies — existing
- ✓ Missing plugin dependencies reported to Claude Code with install guidance — existing
- ✓ CLI scaffolds `dependencies.yaml`, hook script, and `hooks.json` entry via `anthropak init` — existing
- ✓ CLI updates hook script to latest version via `anthropak update` — existing
- ✓ Required vs optional dependency distinction with different severity levels — existing
- ✓ Global and project-scoped plugin installation detection — existing
- ✓ Marketplace-specific plugin matching — existing

### Active

- [ ] Codebase hardened — bugs fixed, logic traced end-to-end, TS best practices (ts-pattern, es-toolkit, attempt async), no ternary soup or nested conditionals
- [ ] CLI tool dependency support — declare CLI tools in `dependencies.yaml`, hook checks via `which`/`command -v`, reports missing tools with install guidance
- [ ] MCP server dependency support — declare MCP servers in `dependencies.yaml`, hook checks Claude Code's `.mcp.json` / settings for registered servers, reports missing servers
- [ ] Unit tests for critical/dangerous paths

### Out of Scope

- Version checking for CLI tools — just presence check via PATH, not semver validation
- MCP server health/running checks — only check if registered in Claude Code config, not if actually running
- Documentation site or extensive docs — this is a dev tool, README is sufficient
- GUI or web interface — CLI-only tool

## Context

- Existing codebase is functional for plugin dependencies but needs code quality hardening before extending
- Hook runs inside Claude Code's plugin system — must never crash, always return valid JSON
- CLI is distributed as npm package and pre-built binaries
- Monorepo: `packages/hook` (runtime checker) and `packages/cli` (scaffolding tool)
- Build pipeline: hook builds first → CLI embeds hook at build time → CLI ships with embedded hook
- Uses tsdown for bundling, oxlint/oxfmt for linting/formatting, Turborepo for orchestration
- Claude Code stores MCP server config in `.mcp.json` (project-level) and global settings
- The three dependency types share the same declare → check → report pattern, just different verification methods

## Constraints

- **Tech stack**: TypeScript, pnpm monorepo, tsdown bundling — established and non-negotiable
- **Code style**: ts-pattern for matching, es-toolkit utilities (including `attempt` for async error handling), no ternaries or deeply nested conditionals
- **Hook safety**: Hook must never throw — always output valid JSON or empty object
- **Build order**: Hook must build before CLI (CLI embeds hook output)
- **Zero runtime deps in hook**: Only `confbox` is bundled; hook runs in Claude Code's sandbox
- **Phase order**: Quality hardening → CLI tools → MCP servers → Tests (last)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| CLI tool check via `which`/`command -v` | Simple, universal, no version parsing complexity | — Pending |
| MCP check via Claude Code config files | If Claude Code can see it, it's "installed" — matches user mental model | — Pending |
| Code hardening before new features | Solid foundation prevents compounding bugs as surface area grows | — Pending |
| Tests as final phase | Ship working features first, test critical paths last | — Pending |
| Plugin → CLI → MCP order | Plugins already done; CLI simpler than MCP; each builds on patterns from previous | — Pending |

---
*Last updated: 2026-02-06 after initialization*
