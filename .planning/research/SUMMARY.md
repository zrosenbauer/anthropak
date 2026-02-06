# Project Research Summary

**Project:** Anthropak CLI & MCP Dependency Checking
**Domain:** Claude Code plugin dependency management tooling
**Researched:** 2026-02-06
**Confidence:** HIGH

## Executive Summary

Anthropak is a dependency validation tool for the Claude Code ecosystem that currently checks plugin dependencies. The research reveals a clear path to extend it to validate CLI tools and MCP servers, unifying dependency checking across all three ecosystems. Expert tooling in this domain (flutter doctor, npm doctor, brew doctor) follows a consistent pattern: detect environment prerequisites, provide actionable error messages, and enable programmatic validation via exit codes.

The recommended approach is to build on Anthropak's proven hook architecture while introducing three new abstractions: a checker interface for each dependency type, an extended configuration schema with versioning, and type-grouped output formatting. The core technology choices are clear: ts-pattern for control flow (project constraint), es-toolkit for error handling without try-catch, and which for cross-platform CLI detection. All three packages are modern, well-maintained, and under 100KB combined.

The primary risks are cross-platform CLI detection issues (especially Windows path handling), MCP configuration file location confusion (documentation conflicts exist), and hook crash scenarios that break plugin loading. These are all preventable with established patterns: use battle-tested libraries instead of custom shell execution, check multiple config file locations with graceful fallbacks, and wrap all hook code in comprehensive error handlers that always output valid JSON.

## Key Findings

### Recommended Stack

The stack research identified three core additions to Anthropak's existing TypeScript/Node.js foundation. All recommendations align with project constraints (no Lodash, use ts-pattern for control flow).

**Core technologies:**
- **ts-pattern (^5.5.0):** Exhaustive pattern matching and control flow — eliminates defensive conditionals, 2kB bundle, type-safe matching prevents unhandled cases in dependency checking logic
- **es-toolkit (^1.44.0):** Modern utility library with tuple-based async error handling — 97% smaller than Lodash, `attemptAsync` provides clean error handling without try-catch blocks (matches project style)
- **which (^6.0.0):** Cross-platform CLI tool detection — npm org maintained, handles Windows PATHEXT and Unix permissions correctly, async API for non-blocking checks

**Critical pattern:** Combine all three for robust CLI detection:
```typescript
const [error, path] = await attemptAsync(() => which('docker', { nothrow: true }));
const result = match({ error, path })
  .with({ error: P.not(P.nullish) }, () => ({ found: false, reason: 'error' }))
  .with({ path: P.nullish }, () => ({ found: false, reason: 'not-found' }))
  .with({ path: P.string }, ({ path }) => ({ found: true, path }))
  .exhaustive();
```

### Expected Features

Feature research analyzed doctor-style CLI tools (flutter doctor, npm doctor, brew doctor) and MCP server discovery patterns to identify table stakes vs differentiators.

**Must have (table stakes):**
- CLI tool detection via PATH checking (users expect environment validation)
- MCP server detection via config file parsing (completes the three-ecosystem coverage)
- Extended YAML schema with cli_tools and mcp_servers sections (declarative dependencies)
- Clear error messages grouped by type (plugins, CLI tools, MCP servers)
- Actionable install instructions per dependency type (marketplace links, brew commands, MCP config docs)
- Version checking for CLI tools (basic exact match, not semver ranges initially)
- Exit codes for CI/CD integration (0 = success, 1 = required missing, 2 = optional missing)

**Should have (competitive advantage):**
- Multi-ecosystem support (THE competitive differentiator — no other tool checks plugins + CLI + MCP)
- Auto-fix command generation (output exact install commands that work)
- Smart scope resolution (check both global PATH and project-local node_modules/.bin)
- Dry-run mode for debugging complex configurations

**Defer (v2+):**
- Dependency graph visualization (performance concerns in hook context)
- Watch mode for continuous validation (unclear user need)
- Workspace multi-project support (narrow use case, adds complexity)
- Custom validation scripts (security concerns with arbitrary code execution)

**Anti-features to avoid:**
- Automatic installation (permission issues, breaks user control)
- Real-time monitoring (performance overhead)
- Deep package analysis/security scanning (scope creep)

### Architecture Approach

Architecture research mapped Anthropak's existing monorepo structure and identified clean extension points for CLI and MCP checking without major refactoring.

**Current architecture:** Hook package builds first, CLI embeds hook output via .generated/ files. Hook reads dependencies.yaml, validates config, checks installed_plugins.json, outputs systemMessage if dependencies missing. CLI provides init/update commands for scaffolding.

**Extension strategy:** Introduce checker abstraction pattern (PluginChecker, CliToolChecker, McpServerChecker) that all implement DependencyChecker<T> interface. Extend dependencies.yaml schema with three top-level sections (plugins, cli_tools, mcp_servers) each containing required/optional arrays. Group systemMessage output by dependency type with type-specific install guidance.

**Major components:**
1. **Hook validators** — Config parser with schema version detection (backward compat), dependency checkers per type (parallel execution), output formatter with type grouping
2. **Registry integrations** — Plugin registry reader (installed_plugins.json), CLI detector (which + PATH), MCP config parser (~/.claude.json + .mcp.json)
3. **CLI commands** — init (scaffolds extended template), update (embeds new hook), validate (future: standalone checking)

**Key architectural decisions:**
- Schema versioning BEFORE adding new fields (prevents breaking existing configs)
- Parallel checker execution with Promise.all (avoid sequential latency)
- Always output valid JSON from hook (catch all errors at top level)
- Check multiple config locations with fallbacks (user-scoped + project-scoped)

### Critical Pitfalls

Pitfalls research identified seven critical issues, each with concrete prevention strategies and real-world source citations.

1. **Cross-platform CLI detection with spaces in paths** — Windows requires path quoting, which Node.js child_process doesn't handle consistently. Use `which` package (npm org maintained) instead of manual spawn logic. Test on actual Windows 10/11, not just WSL.

2. **MCP configuration file location confusion** — Documentation incorrectly points to ~/.claude/settings.json, but MCP servers actually live in ~/.claude.json (user-scoped) and .mcp.json (project-scoped). Must check BOTH locations. Verified by GitHub issue #4976 and community guides.

3. **Hook crashes break plugin loading** — Uncaught exceptions during hook execution cause Claude Code to fail silently. Wrap entire hook in try-catch + uncaughtException/unhandledRejection handlers. Always output valid JSON before exit, default to {} on any error.

4. **Breaking schema changes without versioning** — Adding new required fields breaks existing configs after hook update. Add schemaVersion field NOW, before extending schema. Support both old (flat) and new (nested) structures during migration.

5. **Race conditions reading config files** — Hook reads dependencies.yaml while editor writes it, causing ENOENT or parse errors. Don't use fs.access() before fs.readFile() (creates race window). Catch ENOENT specifically, treat as "no config."

6. **PATH environment not inherited in hook context** — CLI tools installed via Homebrew (/opt/homebrew/bin) or asdf (~/.asdf/shims) may not be in hook's PATH. Check common install locations as fallback, not just process.env.PATH. Consider reading user's shell profile.

7. **Shell-specific command syntax** — command -v works on Unix but not Windows (uses where.exe). PowerShell vs CMD have different built-ins. Never shell out to check commands — use which package or spawn the tool with --version and check exit code.

## Implications for Roadmap

Based on combined research, a four-phase roadmap structure emerges. The ordering prioritizes foundation (reliability + schema versioning) before feature additions (CLI, then MCP), with polish/optimization deferred to v2.

### Phase 0: Foundation Hardening (PREREQUISITE)
**Rationale:** Hook reliability is non-negotiable. All future features depend on robust error handling and schema versioning. Pitfalls research shows hook crashes and breaking schema changes are the highest-severity risks.

**Delivers:**
- Comprehensive error handling (uncaughtException, unhandledRejection handlers)
- Schema versioning in dependencies.yaml (schemaVersion: 1)
- Backward compat for flat structure (required/optional at top level)
- Race condition resilience (retry logic for config reads)
- stdin timeout (prevent hang)
- JSON.stringify safety (handle circular refs)

**Addresses pitfalls:** #3 (hook crashes), #4 (breaking changes), #5 (race conditions)

**Research flag:** SKIP — existing codebase provides clear extension points, patterns are well-established.

### Phase 1: CLI Tool Detection
**Rationale:** Extends Anthropak to second ecosystem. Architecture research shows clean abstraction point (CliToolChecker). Stack research provides clear library choice (which). Simpler than MCP detection (no config file confusion).

**Delivers:**
- CLI tool presence checking via which package
- Extended dependencies.yaml schema (cli_tools: required/optional)
- Cross-platform path detection (Windows + Unix)
- Common install location checks (/opt/homebrew/bin, ~/.local/bin)
- Basic version checking (exact match via --version)
- Type-grouped output (separate Plugins/CLI Tools sections)

**Uses stack:** which (^6.0.0), es-toolkit attemptAsync, ts-pattern for result matching

**Implements architecture:** CliToolChecker class, parallel execution with Promise.all, extend ParsedDependencies type

**Addresses pitfalls:** #1 (cross-platform detection), #6 (PATH inheritance), #7 (shell syntax)

**Research flag:** SKIP for core detection — patterns are standard. OPTIONAL for version parsing if complex (most tools have inconsistent --version output).

### Phase 2: MCP Server Detection
**Rationale:** Completes three-ecosystem coverage (the key differentiator). More complex than CLI due to config file location confusion and scope resolution (user vs project).

**Delivers:**
- MCP server detection via config file parsing
- Check both ~/.claude.json AND .mcp.json
- Project-scoped override handling
- Extended dependencies.yaml schema (mcp_servers: required/optional)
- MCP-specific install guidance (claude mcp add commands)
- Complete multi-ecosystem systemMessage formatting

**Uses stack:** confbox for JSON parsing (already bundled), es-toolkit for file read error handling

**Implements architecture:** McpServerChecker class, priority-ordered config loading (project > user), extend MissingDependencies type

**Addresses pitfalls:** #2 (config file location confusion)

**Research flag:** NEEDED — pitfalls research found documentation conflicts about config locations. Verify actual Claude Code behavior with test installations before implementing.

### Phase 3: Polish & Optimization (v1.x)
**Rationale:** Core functionality complete. Add convenience features based on user feedback.

**Delivers:**
- Auto-fix command generation (output single copy-paste install script)
- Dry-run mode (validate config without checking)
- Version range matching (semver-style >=1.2.0)
- Smart scope resolution (project-local node_modules/.bin + global PATH)
- Granular severity levels (error/warn/info beyond required/optional)

**Addresses features:** Second-tier items from FEATURES.md prioritization

**Research flag:** SKIP — all patterns are well-documented.

### Phase Ordering Rationale

- **Foundation first:** Schema versioning must exist before any extensions. Error handling prevents cascading failures.
- **CLI before MCP:** Simpler implementation (no config file confusion), validates checker abstraction pattern, lower risk.
- **MCP completes core value prop:** Three-ecosystem coverage is the differentiator. Once complete, can market as "THE dependency checker for Claude Code."
- **Polish deferred:** Auto-fix and dry-run are convenience, not essential. Add when users request, not speculatively.

**Dependency chain:**
```
Phase 0 (Foundation)
    ├──> Phase 1 (CLI) — requires schema versioning
    └──> Phase 2 (MCP) — requires schema versioning

Phase 1 + Phase 2
    └──> Phase 3 (Polish) — requires all detection types
```

### Research Flags

**Needs deeper research:**
- **Phase 2 (MCP Detection):** Config file location verification — pitfalls research found conflicting docs. Test with actual Claude Code installations on all platforms. Verify ~/.claude.json vs .mcp.json distinction.

**Standard patterns (skip research):**
- **Phase 0 (Foundation):** Error handling and schema versioning are well-documented Node.js patterns
- **Phase 1 (CLI Detection):** which package docs cover all use cases, cross-platform handling is documented
- **Phase 3 (Polish):** All features have established patterns in doctor-style tools

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries verified with official docs, version compatibility confirmed, patterns tested in similar projects |
| Features | HIGH | Doctor-style tool patterns well-established, MCP discovery research from official sources and GitHub issues |
| Architecture | HIGH | Existing codebase provides clear structure, checker abstraction is proven pattern, no major refactoring needed |
| Pitfalls | HIGH | All pitfalls sourced from real Node.js/Claude Code issues with concrete examples and prevention strategies |

**Overall confidence:** HIGH

The research converges on clear recommendations across all four areas. Stack choices align with project constraints. Feature prioritization has strong precedent in doctor-style tooling. Architecture extends existing patterns without breaking changes. Pitfalls are well-documented with actionable mitigations.

### Gaps to Address

**MCP configuration file locations (MEDIUM priority):**
- Pitfalls research found documentation conflicts about where MCP servers are configured
- Need to verify actual file locations with test Claude Code installations before Phase 2
- Mitigation: Check all possible locations with fallbacks during Phase 2 implementation
- Validation approach: Install MCP servers globally and project-scoped, inspect config files

**CLI version parsing (LOW priority):**
- Version checking assumes consistent --version output format
- Many tools have inconsistent output (some use stdout, some stderr, formats vary)
- Mitigation: Start with exact version matching only, defer semver ranges to Phase 3
- Validation approach: Test with top 10 common CLI tools (git, docker, node, npm, gh, jq, etc.)

**Windows testing coverage (MEDIUM priority):**
- Stack research covers Windows path handling, but verification needed
- Pitfalls research emphasizes Windows-specific issues with spaces in paths
- Mitigation: Add Windows 10/11 to CI testing during Phase 1, not just macOS/Linux/WSL
- Validation approach: Test with Chocolatey installs, Program Files paths, user-scoped npm globals

## Sources

### Primary (HIGH confidence)

**Stack Research:**
- [GitHub: npm/node-which](https://github.com/npm/node-which) — CLI detection library, API documentation
- [GitHub: gvergnaud/ts-pattern](https://github.com/gvergnaud/ts-pattern) — Pattern matching library, exhaustive matching patterns
- [GitHub: toss/es-toolkit](https://github.com/toss/es-toolkit) — Utility library, attemptAsync error handling
- [ts-pattern NPM](https://www.npmjs.com/package/ts-pattern) — Version info, bundle size verification
- [es-toolkit Official Documentation](https://es-toolkit.dev/) — API reference, Lodash migration guide

**Feature Research:**
- [Flutter Doctor Command Guide](https://www.dhiwise.com/post/flutter-doctor-command-a-vital-tool-for-developers) — Doctor-style tool patterns
- [npm doctor command](https://www.geeksforgeeks.org/node-js/npm-doctor-command/) — Environment validation patterns
- [Model Context Protocol Roadmap](https://modelcontextprotocol.io/development/roadmap) — MCP server discovery patterns
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/) — Dependency validation best practices

**Architecture Research:**
- Existing codebase files (packages/hook/src/*, packages/cli/src/*) — Current architecture, extension points
- [.planning/codebase/ARCHITECTURE.md] — Existing architecture analysis

**Pitfalls Research:**
- [Node.js Issue #38490: Cannot spawn shell script if path has spaces](https://github.com/nodejs/node/issues/38490) — Windows path handling
- [Node.js Issue #7367: child_process.spawn fails on Windows given a space](https://github.com/nodejs/node/issues/7367) — Windows spawn issues
- [Claude Code Issue #4976: Documentation incorrect about MCP configuration file location](https://github.com/anthropics/claude-code/issues/4976) — Config file location confusion
- [Honeybadger: Error handling in Node.js](https://www.honeybadger.io/blog/errors-nodejs/) — Hook error handling patterns
- [DataExpert: Backward Compatibility in Schema Evolution](https://www.dataexpert.io/blog/backward-compatibility-schema-evolution-guide) — Schema versioning patterns

### Secondary (MEDIUM confidence)

- [command-exists npm package](https://www.npmjs.com/package/command-exists) — Alternative CLI detection (battle-tested on Windows)
- [Inventive HQ: Where configuration files are stored](https://inventivehq.com/knowledge-base/claude/where-configuration-files-are-stored) — Claude Code config locations
- [Scott Spence: Configuring MCP Tools in Claude Code](https://scottspence.com/posts/configuring-mcp-tools-in-claude-code) — MCP setup guide
- [Node.js Design Patterns: Race conditions](https://nodejsdesignpatterns.com/blog/node-js-race-conditions/) — File read race condition patterns

### Tertiary (LOW confidence)

- [Azure MCP Server Discovery](https://learn.microsoft.com/en-us/azure/api-center/register-discover-mcp-server) — Enterprise MCP patterns (may not apply to Claude Code)
- [MCP .well-known Discovery Endpoint](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1960) — Future MCP feature (not yet implemented)

---
*Research completed: 2026-02-06*
*Ready for roadmap: yes*
