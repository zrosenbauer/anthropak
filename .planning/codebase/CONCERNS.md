# Codebase Concerns

**Analysis Date:** 2026-02-06

## Tech Debt

**Silent Error Swallowing in Hook Entry Point:**
- Issue: `packages/hook/src/index.ts` catches all errors at the top level with a bare `catch` block that silently returns empty JSON. No error logging or diagnostics available.
- Files: `packages/hook/src/index.ts` (lines 55-57)
- Impact: When the hook crashes, users see no error message, system message, or indication of failure. Makes debugging production issues impossible. Hook could fail for legitimate reasons (invalid YAML, corrupted registry) with zero visibility.
- Fix approach: Log errors to stderr before returning empty JSON. Consider structured error output or at minimum stderr logging for debugging.

**Loose Error Handling in Config Parsing:**
- Issue: `packages/hook/src/lib/config.ts` (line 28) catches all parse errors and returns `null` without distinguishing between file not found, malformed YAML, and other errors.
- Files: `packages/hook/src/lib/config.ts` (lines 18-30)
- Impact: Can't differentiate between "no config file" and "config file is broken". Users with malformed YAML get silent failures instead of helpful validation errors.
- Fix approach: Split error handling - let parse errors propagate or log them, only catch file not found.

**Registry Load Failures Silently Default:**
- Issue: `packages/hook/src/lib/registry.ts` (lines 32-34) returns default empty registry on any error reading `installed_plugins.json`.
- Files: `packages/hook/src/lib/registry.ts` (lines 25-35)
- Impact: If registry file is corrupted, users get false negatives (plugins marked as missing when they're not). No way to know the registry failed to load.
- Fix approach: Log errors to stderr, consider returning error state instead of silently defaulting.

**Build Dependency on Bun Availability:**
- Issue: Two critical build scripts require Bun: `packages/cli/scripts/build-assets.ts` and `packages/cli/scripts/build-binaries.ts` are marked with `#!/usr/bin/env bun`.
- Files: `packages/cli/scripts/build-assets.ts`, `packages/cli/scripts/build-binaries.ts`
- Impact: Pre-built assets and binaries can only be built with Bun installed. npm CI in CI/CD fails if Bun isn't available. The `pnpm build` command depends on `build:assets` prebuild script which requires Bun.
- Fix approach: Make build-assets compatible with Node.js or ensure Bun is installed in CI before running build.

**Generated Files in Source Control Risk:**
- Issue: `packages/cli/src/.generated/` contains auto-generated files (version.ts, template.ts, hook.ts, index.ts) that are produced by the build process.
- Files: `packages/cli/src/.generated/*`
- Impact: If these files are committed but not regenerated, version or hook script will be stale. Can cause version mismatches between package.json and VERSION constant. Hook script could be outdated after npm install.
- Fix approach: Add `.generated/` to `.gitignore` and ensure CI runs `pnpm build` before any deployment or packaging.

## Known Issues

**Ambiguous Init vs Update Command:**
- Issue: Default command (no args) in `packages/cli/src/commands/default.ts` silently routes to either init or update based on file existence checks.
- Files: `packages/cli/src/commands/default.ts` (lines 11-14, 26-33)
- Impact: User expectation mismatch - `anthropak` with no args silently does init or update without explicit user intent. If someone runs it to check status, they get a side effect instead.
- Fix approach: Make this behavior explicit in help/docs or require explicit `init` or `update` subcommand.

**Hook Script Timeout Hardcoded:**
- Issue: Hook timeout is hardcoded to 5 seconds in `packages/cli/src/lib/templates.ts` (line 35).
- Files: `packages/cli/src/lib/templates.ts` (lines 32-36)
- Impact: If plugin registry is slow or network is slow, hook fails silently. No way for users to adjust timeout. Network timeouts in Claude environment could cause false negatives.
- Fix approach: Make timeout configurable via environment variable or dependencies.yaml.

## Security Considerations

**GitHub URL Formatting in Install Commands:**
- Risk: `packages/hook/src/lib/output.ts` (line 32) directly interpolates GitHub repository into SSH URL without validation.
- Files: `packages/hook/src/lib/output.ts` (lines 22-36)
- Current mitigation: Only used for user display, not executed automatically.
- Recommendations: Validate GitHub URL format (must match `owner/repo`). Consider HTTPS URLs instead of SSH for better compatibility.

**Arbitrary Install Command Execution Risk:**
- Risk: Users can specify custom `install` field in dependencies.yaml that gets rendered as shell command in system message.
- Files: `packages/hook/src/types.ts` (line 17), `packages/hook/src/lib/output.ts` (lines 22-36)
- Current mitigation: Commands are shown to user, not auto-executed. Users must copy/paste to run.
- Recommendations: Document security implications clearly. Consider escaping or validating install commands before display.

**Registry File Location Hardcoded:**
- Risk: `packages/hook/src/lib/constants.ts` (lines 12-17) hardcodes registry path to `~/.claude/plugins/installed_plugins.json`.
- Files: `packages/hook/src/lib/constants.ts`
- Current mitigation: Only reads existing file, doesn't create or modify it.
- Recommendations: Document assumptions. Consider supporting custom registry path via environment variable.

## Performance Bottlenecks

**Linear Search Over Plugin Registry:**
- Problem: `packages/hook/src/lib/registry.ts` (lines 62-68) performs linear key search when marketplace not specified.
- Files: `packages/hook/src/lib/registry.ts` (lines 48-72)
- Cause: Iterates all plugin keys to find ones starting with plugin name.
- Improvement path: Pre-build an index map during registry load, or use Set for O(1) lookups.
- Current impact: Negligible for typical registries (<1000 plugins), but scales poorly.

**Repeated Registry Loading:**
- Problem: Hook process loads registry from disk on every invocation (cold start every session).
- Files: `packages/hook/src/index.ts`, `packages/hook/src/lib/registry.ts`
- Cause: Registry is a per-session JSON file read.
- Improvement path: Consider caching registry with TTL or invalidation strategy if hook runs frequently.
- Current impact: Minimal - single file read per session, but adds startup latency.

## Fragile Areas

**Config File Format Priority:**
- Files: `packages/hook/src/lib/config.ts` (lines 15-32)
- Why fragile: Multiple config formats supported (.yaml, .yml, .json, .jsonc) with priority based on file existence order. If user accidentally creates both `dependencies.yaml` and `dependencies.json`, only YAML is used.
- Safe modification: Document priority clearly. Add warning if multiple config files exist.
- Test coverage: No validation that only one config format exists.

**Hook Entry Point Coupling to CLI:**
- Files: `packages/cli/src/lib/templates.ts` (lines 32-36), `packages/hook/src/index.ts`
- Why fragile: Hook command path is hardcoded in HOOK_ENTRY template. If hook changes location or Node path changes, command fails.
- Safe modification: Hook expects to be called as `node ${CLAUDE_PLUGIN_ROOT}/hook/anthropak.mjs`. Changes to this path break all initialized plugins.
- Test coverage: No integration test that hook runs correctly in Claude environment.

**Timestamp Handling in Dependencies:**
- Files: `packages/hook/src/lib/registry.ts` (lines 9-16)
- Why fragile: Project scope matching uses simple string prefix comparison (`projectDir.startsWith(inst.projectPath + "/")`). Symlinks, relative paths, or path traversal could cause false matches.
- Safe modification: Normalize and resolve paths before comparison.
- Test coverage: No test for symlinked projects or relative paths.

**Default Command Routing Logic:**
- Files: `packages/cli/src/commands/default.ts` (lines 11-33)
- Why fragile: Routes to init or update based on presence of `hook/` and `dependencies.yaml`. If only one is present (corrupted state), command fails silently or does unexpected action.
- Safe modification: Add explicit validation for consistent state before routing.
- Test coverage: No test for partially-initialized plugins.

## Scaling Limits

**Hook Script Bundle Size:**
- Current capacity: Hook script (tsdown bundled) is embedded in CLI as template string.
- Limit: As dependencies/validation logic grows, bundle size increases, embedding size increases. Each init inflates bundle.
- Scaling path: Use external hook download instead of embedding. Or lazy-load dependencies library.

**Registry File Size Assumptions:**
- Current capacity: Registry assumed to fit in memory (single JSON.parse).
- Limit: Claude with thousands of installed plugins would load entire registry at startup.
- Scaling path: Implement streaming parser or indexed lookups for large registries.

## Dependencies at Risk

**Bun as Build Dependency:**
- Risk: Both `build-assets.ts` and `build-binaries.ts` require Bun. npm/Node.js CI won't work without special handling.
- Impact: Monorepo CI/CD must have Bun installed. Pre-built binaries can't be generated in standard Node.js CI.
- Migration plan: Either make build-assets Node.js compatible or document explicit Bun requirement in CI setup.

**liquidjs Template Engine:**
- Risk: `packages/cli/src/lib/templates.ts` uses liquidjs for rendering `dependencies.yaml` template.
- Impact: Large dependency for single template file. If liquidjs has security vulnerability, affects CLI.
- Migration plan: Replace with simpler string template or mustache variant.

## Test Coverage Gaps

**Hook Integration Tests:**
- What's not tested: Hook execution end-to-end. No test that validates hook reads dependencies.yaml, checks registry, and outputs correct system message.
- Files: `packages/hook/src/index.ts`, `packages/hook/src/lib/*.ts`
- Risk: Changes to error handling, registry loading, or output formatting could break hook silently.
- Priority: High - hook is the runtime critical path.

**CLI Command Integration Tests:**
- What's not tested: `init` and `update` commands don't have tests for file creation, hook installation, or hooks.json modification.
- Files: `packages/cli/src/commands/init.ts`, `packages/cli/src/commands/update.ts`
- Risk: File system mutations aren't validated. Could leave plugin in broken state.
- Priority: High - these commands modify user's plugin.

**Config Validation Edge Cases:**
- What's not tested: YAML parsing errors, circular references, very large dependency lists, special characters in names.
- Files: `packages/hook/src/lib/config.ts`
- Risk: Malformed configs could cause unexpected behavior.
- Priority: Medium - YAML parsing is delegated to confbox lib.

**Registry Lookup Scenarios:**
- What's not tested: Global vs project-scoped installations, marketplace-specific lookups, missing registry file scenarios.
- Files: `packages/hook/src/lib/registry.ts`
- Risk: Installation detection could give false positives/negatives.
- Priority: Medium - core logic but simple enough to review.

**Build Script Failures:**
- What's not tested: `build-assets.ts` failure modes (missing template, missing hook build output). `build-binaries.ts` with Bun unavailable.
- Files: `packages/cli/scripts/build-assets.ts`, `packages/cli/scripts/build-binaries.ts`
- Risk: Build can fail with unclear error messages.
- Priority: Low - errors are explicit but could be tested.

**Node Version Check:**
- What's not tested: `checkNodeVersion()` behavior with Node < 18, Bun runtime detection.
- Files: `packages/cli/src/lib/node-version.ts`
- Risk: Version check could fail or be skipped unexpectedly.
- Priority: Low - simple logic, mostly for edge environments.

## Missing Critical Features

**No Validation of Plugin Identity:**
- Problem: Hook doesn't verify that `CLAUDE_PLUGIN_ROOT` actually points to a valid plugin.
- Blocks: Can't detect if user runs hook outside of plugin context.
- Impact: Misleading error messages if hook runs in wrong directory.

**No Hook Version Verification:**
- Problem: Hook version isn't checked. Stale hook could silently fail with old validation logic.
- Blocks: Can't detect version mismatch between hook and dependencies.yaml schema.
- Impact: Updates could be missed, old bugs could resurface.

**No Dependency Graph Validation:**
- Problem: No validation that dependencies themselves don't have conflicting dependencies.
- Blocks: Can't detect transitive dependency conflicts.
- Impact: Users could declare incompatible dependencies that work individually but fail in combination.

**No Dry-Run or Validation Mode:**
- Problem: No way to validate dependencies without actually needing to check against registry.
- Blocks: Can't test dependencies.yaml syntax without Claude environment.
- Impact: Configuration errors only caught at runtime when Claude loads plugin.

---

*Concerns audit: 2026-02-06*
