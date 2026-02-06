# Coding Conventions

**Analysis Date:** 2026-02-06

## Naming Patterns

**Files:**
- Source files: `camelCase.ts` (e.g., `config.ts`, `registry.ts`, `nodeVersion.ts`)
- Entry points: `index.ts` or `cli.ts`
- Commands (CLI): Named as command modules (e.g., `init.ts`, `update.ts`, `default.ts`)
- Configuration files: Lowercase with hyphens (e.g., `tsdown.config.ts`, `tsconfig.json`)

**Functions:**
- camelCase for all functions: `loadConfig()`, `validateConfig()`, `isPluginInstalled()`, `readStdin()`
- Private functions prefixed with underscore for clarity: implied by module scope (no explicit private keyword used, but functions not exported are internal)
- Verb-first pattern common: `load*`, `validate*`, `read*`, `parse*`, `format*`, `get*`, `check*`, `is*`

**Variables:**
- camelCase throughout: `pluginRoot`, `hooksJson`, `depsFile`, `hookScript`, `installedPlugins`
- Constants in UPPER_CASE: `MIN_NODE_VERSION`, `PLUGIN_ROOT`, `PROJECT_DIR`, `INSTALLED_PLUGINS_PATH`, `DEFAULT_REGISTRY`, `HOOK_COMMAND`, `CONFIG_FILES`
- Type variables/generics: Single letter or descriptive (e.g., `<T>`)

**Types/Interfaces:**
- PascalCase for all types and interfaces: `PluginDependency`, `ParsedDependencies`, `RawConfig`, `PluginInstallation`, `InstalledPluginsRegistry`, `HookResponse`, `ValidationResult`, `HooksJson`, `HookEntry`, `CommandModule`
- Convention: Interface names describe the structure they represent without "I" prefix

## Code Style

**Formatting:**
- Tool: `oxfmt` (Oxc formatter, not Prettier)
- Check command: `pnpm format` (oxfmt --check .)
- Auto-fix: `pnpm format:fix` (oxfmt --write .)
- Applied to all TypeScript, JavaScript, and related files

**Linting:**
- Tool: `oxlint` (Oxc linter, not ESLint)
- Rules enforced:
  - `correctness`: error
  - `suspicious`: error
  - `perf`: warn
  - `pedantic`, `style`, `restriction`, `nursery`: off
  - Exceptions: `no-console` off (allows console logging), `unicorn/no-empty-file` off
- Check: `pnpm lint`
- Auto-fix: `pnpm lint:fix`
- Ignored patterns: `dist/**`, `bin/**`, `node_modules/**`, `**/.generated/**`

**TypeScript Compilation:**
- Target: ES2022 (both packages)
- Module: ESNext with bundler module resolution
- Strict mode: enabled
- Declaration files: generated for CLI package, not for hook package
- Both packages use `skipLibCheck: true` and `forceConsistentCasingInFileNames: true`

## Import Organization

**Order:**
1. Node.js built-in imports (`import { ... } from "node:*"`)
2. Third-party dependencies (`import { ... } from "package-name"`)
3. Local relative imports (`import { ... } from "./lib/file.js"`)
4. Type imports via `import type { ... } from "./file.js"`

**Examples from codebase:**
```typescript
// Hook package (packages/hook/src/index.ts)
import type { HookResponse } from "./types.js";
import { readStdin, PLUGIN_ROOT, PROJECT_DIR, INSTALLED_PLUGINS_PATH } from "./lib/io.js";
import { loadConfig, validateConfig } from "./lib/config.js";
import { loadInstalledPlugins, isPluginInstalled } from "./lib/registry.js";
import { formatMissingDeps } from "./lib/output.js";
```

**Path Aliases:**
- Not used in this codebase
- Relative paths with `.js` extensions required (ES module convention)
- Path structure: `./lib/`, `./commands/`, `../lib/` for relative navigation

**File Extensions:**
- All imports use `.js` extensions (required for ES modules)
- TypeScript source files written as `.ts`
- Entry points bundled to `.mjs`

## Error Handling

**Patterns:**
- Broad try-catch with null fallback: Common in config loading functions
  ```typescript
  try {
    // attempt operation
    return result;
  } catch {
    return null; // or default value
  }
  ```
- No error logging: Silently returns null/default on errors (appropriate for hook context)
- Validation pattern: Explicit validation results with error arrays
  ```typescript
  function validateConfig(config): ValidationResult {
    const errors: string[] = [];
    // validation logic
    return { valid: false, errors } or { valid: true, errors: [], data };
  }
  ```
- Process exit: Explicit `process.exit(0)` or `process.exit(1)` for CLI and hook completion

## Logging

**Framework:** `console` (Node.js built-in)

**Patterns:**
- Hook context (`packages/hook`): Uses `console.log()` for JSON output and structured responses
- CLI context (`packages/cli`): Uses `@clack/prompts` for interactive output
  - `p.intro()`: Introduction messages
  - `p.log.success()`: Success feedback
  - `p.log.info()`: Informational messages
  - `p.log.warn()`: Warning messages
  - `p.log.error()`: Error messages
  - `p.outro()`: Closing messages

**Example from CLI init command** (`packages/cli/src/commands/init.ts`):
```typescript
p.intro("Initializing plugin dependencies");
p.log.info(`Root: ${root}`);
p.log.success("Created dependencies.yaml");
p.log.warn("dependencies.yaml already exists (use --force to overwrite)");
p.outro("Edit dependencies.yaml to declare your plugin dependencies.");
```

## Comments

**When to Comment:**
- Documented using JSDoc comments
- File-level `@fileoverview` tags on module files
- Function documentation with `@param`, `@returns`, `@example` tags
- Used consistently across all modules

**JSDoc/TSDoc:**
- Applied to all exported functions and types
- Parameter types documented with descriptions
- Return types and descriptions provided
- Examples included for complex functions

**Example from** `packages/hook/src/lib/output.ts`:
```typescript
/**
 * Generates the appropriate install command for a plugin dependency.
 * Prioritizes custom install commands, then marketplace, then GitHub sources.
 *
 * @param dep - Plugin dependency object
 * @returns CLI command to install the plugin
 *
 * @example
 * getInstallCommand({ plugin: 'foo', github: 'owner/foo' })
 * // Returns: 'claude plugin add --git git@github.com:owner/foo.git'
 */
export function getInstallCommand(dep: PluginDependency): string {
```

## Function Design

**Size:** Generally small, focused functions under 100 lines
- Largest: `validateConfig()` in `packages/hook/src/lib/config.ts` (151 lines total with comments)
- Most utility functions 18-60 lines

**Parameters:**
- Typically 1-3 parameters
- Complex config objects preferred over multiple primitives
- Type-safe parameter passing (no `any` types)

**Return Values:**
- Explicit return types on all exported functions
- Null/default returns for error cases (not throwing)
- Structured return objects for complex results (e.g., `ValidationResult`)
- Union types for optional returns: `string | undefined`

## Module Design

**Exports:**
- Named exports used throughout
- Default exports used for yargs `CommandModule` definitions
- Clear separation of exported vs. internal functions

**Barrel Files:**
- Not used in this codebase
- Direct imports from specific modules preferred

**Module Organization:**
- `src/lib/` directory contains utility/library code
- `src/commands/` contains CLI command handlers
- Types centralized in `src/types.ts`
- Index files re-export constants and types from lib

**Example from hook package structure:**
```
packages/hook/src/
├── index.ts           # Entry point (IIFE wrapping main logic)
├── types.ts           # Type definitions
└── lib/
    ├── config.ts      # Config loading and validation
    ├── registry.ts    # Plugin registry handling
    ├── output.ts      # Output formatting
    ├── io.ts          # Input/output utilities
    ├── utils.ts       # General utilities
    └── constants.ts   # Constants
```

## Build and Bundling

**Tool:** `tsdown` (TypeScript bundler)
- Hook package: Single entry `src/index.ts` → `dist/anthropak.mjs`
- CLI package: Single entry `src/cli.ts` → `dist/cli.mjs`
- Both use `shims: true` for Node.js compatibility
- Hook package: `noExternal: ["confbox"]` to bundle dependency

**Generated Assets:**
- CLI package generates `src/.generated/` files at build time
- Contains: `index.ts` with `VERSION`, `DEPENDENCIES_TEMPLATE`, `HOOK_SCRIPT`
- Generated from hook build output and template files
- Never edited manually

---

*Convention analysis: 2026-02-06*
