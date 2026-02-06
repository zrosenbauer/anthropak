# Testing Patterns

**Analysis Date:** 2026-02-06

## Test Framework

**Status:** Not detected

No automated testing framework is currently configured in this codebase. There are no test files (`*.test.ts`, `*.spec.ts`) and no test runner configuration (`jest.config.*`, `vitest.config.*`).

## Testing Approach

**Manual Testing Only:**
The project relies on manual verification through:

1. **Type checking:** `pnpm typecheck` (TypeScript compiler validation)
2. **Linting:** `pnpm lint` (oxlint static analysis)
3. **Formatting:** `pnpm format` (oxfmt code style validation)
4. **Build verification:** `pnpm build` ensures code compiles and bundles correctly
5. **CI validation:** GitHub Actions workflow (`ci.yml`) runs all above checks on push/PR

## CI/CD Testing Strategy

**GitHub Actions Workflow:** `.github/workflows/ci.yml`

**Steps in order:**
```bash
pnpm lint          # oxlint static analysis
pnpm format        # oxfmt formatting check
pnpm typecheck     # TypeScript strict mode compilation
pnpm build         # Full monorepo build with Turbo
```

**Environments:**
- Runtime: Node.js 22
- Additional: Bun (latest) for binary building

**Build Verification:**
The build process validates correct bundling:
- Hook package: Produces `dist/anthropak.mjs` (validated via tsdown)
- CLI package: Produces `dist/cli.mjs` with embedded assets
- Asset embedding: Validates hook script is correctly embedded in CLI build
- Type declarations: CLI generates `.d.ts` files during build

## Manual Integration Testing

**For Hook Package:**

Test the hook by creating a plugin with `dependencies.yaml`:
```yaml
dependencies:
  required:
    - plugin: example-plugin
      marketplace: official
  optional:
    - plugin: optional-plugin
```

Run hook validation:
```bash
echo '{}' | node packages/hook/dist/anthropak.mjs
```

Expected behavior:
- Returns JSON with `systemMessage` if dependencies missing
- Returns empty JSON `{}` if all satisfied
- Gracefully handles missing config file

**For CLI Package:**

Initialize a plugin directory:
```bash
node packages/cli/dist/cli.mjs init ./test-plugin
```

Verify created files:
- `dependencies.yaml` created with template content
- `hook/anthropak.mjs` created and executable (mode 0o755)
- `hooks.json` created/updated with SessionStart hook

Update existing installation:
```bash
node packages/cli/dist/cli.mjs update ./test-plugin
```

Test type checking:
```bash
pnpm typecheck  # From root or package
```

## Code Quality Tools

**Type Safety:**
- TypeScript strict mode enabled in both packages
- `skipLibCheck: true` for performance
- `forceConsistentCasingInFileNames: true` for consistency
- No `any` types in codebase (enforced by oxlint correctness rules)

**Static Analysis:**
- oxlint for code issues
- Checks: correctness (error), suspicious (error), perf (warn)
- Custom rules: `no-console` off (logging allowed), `unicorn/no-empty-file` off
- Ignored patterns: Generated code, built artifacts, node_modules

**Code Formatting:**
- oxfmt enforces consistent style
- Applied before commits (via lefthook if enabled)

## Pre-commit Hooks

**Configuration:** Lefthook installed via `pnpm prepare`

**Hook setup:** `.lefthook.yml` or direct config expected (if configured)

**Available commands:**
```bash
pnpm lint:fix      # oxlint --fix
pnpm format:fix    # oxfmt --write
pnpm fix           # Both lint and format fixes via turbo
```

## Development Workflow

**Watch Mode:**
```bash
pnpm dev           # Run turbo dev for both packages
```

- Hook package: `tsdown --watch` watches `src/` for changes
- CLI package: `tsdown --watch` watches `src/` for changes
- Rebuilds on file save

**Build Flow:**
```bash
pnpm build         # Full build via turbo
```

**Turbo task dependencies:**
- `build`: Depends on `^build` (dependencies first)
- `typecheck`: Depends on `^build`
- `build:bin`: Depends on completed `build` task
- Asset generation: CLI `prebuild` script runs `build:assets.ts`

## Package-Specific Build Testing

**Hook Package:**

Build command: `pnpm build` (from `packages/hook`)

Artifacts:
- `dist/anthropak.mjs` - Single bundled file
- No type declarations (intentionally excluded)

Validate:
```bash
node dist/anthropak.mjs  # Should handle stdin gracefully
```

**CLI Package:**

Build command: `pnpm build` (from `packages/cli`)

Artifacts:
- `dist/cli.mjs` - Main CLI entry point
- `dist/*.d.ts` - Type declarations
- `dist/hook/anthropak.mjs` - Embedded hook script
- `dist/templates/` - Template files

Pre-build validation:
- `build:assets.ts` validates hook script exists
- Generates `src/.generated/` with embedded content
- CLI TypeScript compilation validates asset generation

## Testing Gaps

**What's not tested:**
- User input handling in CLI commands
- File I/O operations (reading/writing configs)
- Plugin registry lookup logic
- Hook output JSON format
- Edge cases in validation logic
- Integration between hook and CLI
- Bun runtime compatibility (beyond CI setup)
- Binary distributions (built but not tested)

**Risk areas for future testing:**
- Config validation edge cases in `packages/hook/src/lib/config.ts`
- Plugin registry matching in `packages/hook/src/lib/registry.ts`
- File system operations in CLI commands
- Hook/CLI integration workflows

## Running Tests Today

**Validate codebase health:**
```bash
# From repository root
pnpm lint          # Check for issues
pnpm format        # Verify formatting
pnpm typecheck     # Full type checking
pnpm build         # Build and validate bundling
```

**If you encounter issues:**
1. Fix formatting: `pnpm format:fix`
2. Fix linting: `pnpm lint:fix`
3. Rebuild: `pnpm build`
4. Type check: `pnpm typecheck`

---

*Testing analysis: 2026-02-06*
