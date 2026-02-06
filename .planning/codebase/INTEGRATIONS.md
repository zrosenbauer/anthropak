# External Integrations

**Analysis Date:** 2026-02-06

## APIs & External Services

**None detected** - This project does not integrate with external APIs or third-party services.

## Data Storage

**Databases:**
- None - Not applicable. Anthropak does not use databases.

**File Storage:**
- Local filesystem only
  - Reads: `dependencies.yaml`, `dependencies.json`, `dependencies.jsonc` from plugin root
  - Reads: `installed_plugins.json` from Claude Code's plugin registry directory
  - Writes: `dependencies.yaml`, `hooks.json`, `hook/anthropak.mjs` to plugin directory

**Caching:**
- None implemented

## Authentication & Identity

**Auth Provider:**
- None - Not applicable. No user authentication required.

**Access Control:**
- Uses file system permissions only
- Hook script sets executable bit on `anthropak.mjs` (chmod 0o755)
- Reads Claude Code's plugin registry (read-only access)

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- Console output via `console.log()` and `@clack/prompts` logging
- Hook outputs JSON to stdout (JSON response with systemMessage if dependencies missing)
- CLI outputs status messages via prompts (intro, log.success, log.warn, log.error, outro)

**Debug:**
- No structured logging framework
- Hook reads stdin (JSON config passed from Claude Code)
- Errors caught and logged as empty JSON response: `{}`

## CI/CD & Deployment

**Hosting:**
- npm registry (packages published publicly)
- GitHub (source repository)
- GitHub Releases (binary artifacts)

**CI Pipeline:**
- GitHub Actions
  - `.github/workflows/ci.yml`: Lint, format, typecheck, build on push/PR to main
  - `.github/workflows/release.yml`: Automated release via Changesets on main branch
  - `.github/workflows/build-binaries.yml`: Builds platform-specific binaries (triggered by release)
  - Uses: pnpm, Node.js 22, Bun
  - Caching: pnpm cache via actions/setup-node

**Release Process:**
- Changesets workflow (`changesets/action@v1`)
  - Creates release PRs for version management
  - Publishes to npm on merge
  - Triggers binary build workflow via GitHub Actions API

## Environment Configuration

**Required env vars:**
- None for core functionality

**Secrets:**
- GITHUB_TOKEN - GitHub Actions built-in token (for release workflow)
- NPM_TOKEN - Required for publishing packages to npm registry (used in release.yml)

**Secrets location:**
- GitHub Actions secrets (configured in repository settings)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- GitHub Actions workflow dispatch: `build-binaries.yml` triggered by release workflow
  - Endpoint: `github.rest.actions.createWorkflowDispatch()`
  - Payload: `version` from published packages

## Git Hooks

**Pre-commit:**
- oxlint auto-fix (staged TypeScript/JavaScript files)
- oxfmt auto-fix (staged source and config files)
- standard-readme lint (README.md validation)
- Tool: lefthook 2.1.0

**Pre-push:**
- Placeholder: "No tests configured yet"

## Plugin Registry Integration

**Claude Code Plugin Registry:**
- Reads: `installed_plugins.json` from Claude Code's local registry
  - Location: `~/.claude/installed_plugins.json` or project-scoped equivalent
  - Format: JSON with plugins object, keyed by `plugin@marketplace`
  - Fields: scope (global/project), projectPath (if project-scoped), installPath

**Configuration Files:**
- Reads: `dependencies.yaml|json|jsonc` from plugin root
  - Schema: `{ dependencies: { required: [...], optional: [...] } }`
  - Each dependency: `{ plugin, marketplace?, github?, description?, install? }`

- Reads: `hooks.json` from plugin root
  - Used to check if anthropak hook already registered

**Hook Integration:**
- Hook script location: `hook/anthropak.mjs` (relative to plugin root)
- Registration: Entry in `hooks.json` with type=command, timeout=5
- Command: `node ${CLAUDE_PLUGIN_ROOT}/hook/anthropak.mjs`
- Input: JSON via stdin
- Output: JSON to stdout with optional `systemMessage` field

---

*Integration audit: 2026-02-06*
