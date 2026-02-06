# Codebase Structure

**Analysis Date:** 2026-02-06

## Directory Layout

```
anthropak/
├── packages/
│   ├── hook/                          # Hook package: dependency validator
│   │   ├── src/
│   │   │   ├── index.ts               # Hook entry point (main executable)
│   │   │   ├── types.ts               # Shared type definitions
│   │   │   └── lib/
│   │   │       ├── config.ts          # Config loading and validation
│   │   │       ├── registry.ts        # Plugin registry checking
│   │   │       ├── output.ts          # Formatted message generation
│   │   │       ├── io.ts              # stdin reading and path constants
│   │   │       ├── utils.ts           # Safe JSON parsing helper
│   │   │       └── constants.ts       # Config file names, defaults
│   │   ├── dist/
│   │   │   └── anthropak.mjs          # Built hook script (bundled, no deps)
│   │   ├── package.json               # Hook package manifest
│   │   └── tsconfig.json              # TypeScript config for hook
│   │
│   └── cli/                           # CLI package: user-facing tool
│       ├── src/
│       │   ├── cli.ts                 # CLI entry point (shebang, yargs setup)
│       │   ├── commands/
│       │   │   ├── init.ts            # init command: scaffold dependencies
│       │   │   ├── update.ts          # update command: sync hook script
│       │   │   └── default.ts         # default command: help/info
│       │   ├── lib/
│       │   │   ├── templates.ts       # Template rendering and asset getters
│       │   │   ├── hooks.ts           # hooks.json read/write/merge operations
│       │   │   ├── node-version.ts    # Node version check middleware
│       │   │   └── [other utils]
│       │   ├── templates/
│       │   │   └── dependencies.yaml.liquid  # Liquid template for dependencies.yaml
│       │   ├── .generated/            # Auto-generated asset embedding
│       │   │   ├── index.ts           # Barrel export
│       │   │   ├── version.ts         # VERSION constant (auto-generated)
│       │   │   ├── template.ts        # DEPENDENCIES_TEMPLATE constant
│       │   │   └── hook.ts            # HOOK_SCRIPT constant (auto-generated)
│       │   └── dist/
│       │       └── cli.mjs            # Built CLI executable
│       ├── scripts/
│       │   ├── build-assets.ts        # Prebuild: embed hook and template
│       │   └── build-binaries.ts      # Binary building for releases
│       ├── package.json               # CLI package manifest
│       └── tsconfig.json              # TypeScript config for CLI
│
├── scripts/
│   └── build-formula.ts               # Homebrew formula generation
│
├── turbo.json                         # Turborepo build orchestration
├── package.json                       # Monorepo root manifest
└── .changeset/                        # Changesets for versioning
```

## Directory Purposes

**`packages/hook/`:**
- Purpose: Self-contained dependency validator bundled as single `.mjs` file
- Contains: Config parsing, validation logic, registry checking, output formatting
- Key files: `src/index.ts` (entry), `src/lib/config.ts`, `src/lib/registry.ts`
- Output: `dist/anthropak.mjs` (zero external dependencies, runs in Claude Code)

**`packages/hook/src/lib/`:**
- `config.ts`: Loads and validates dependencies.yaml/json/jsonc files
- `registry.ts`: Checks if declared plugins are installed (global or project-scoped)
- `output.ts`: Formats missing dependencies as markdown with install commands
- `io.ts`: Reads stdin, exports path constants (PLUGIN_ROOT, PROJECT_DIR, INSTALLED_PLUGINS_PATH)
- `constants.ts`: Config file names (dependencies.yaml, dependencies.yml, etc.)
- `utils.ts`: Safe JSON parsing with fallback defaults

**`packages/cli/`:**
- Purpose: User-facing CLI tool for initializing and managing plugin dependency configurations
- Contains: Command definitions, interactive prompts, template rendering, asset embedding
- Key files: `src/cli.ts` (entry), `src/commands/{init,update}.ts`
- Output: `dist/cli.mjs` (executable via `anthropak` command)

**`packages/cli/src/commands/`:**
- `init.ts`: Scaffolds dependencies.yaml, hook/anthropak.mjs, updates hooks.json
- `update.ts`: Refreshes hook script and hooks.json entries to latest version
- `default.ts`: Default command (help, version)

**`packages/cli/src/lib/`:**
- `templates.ts`: Retrieves embedded hook script and renders dependencies.yaml template
- `hooks.ts`: Reads/writes hooks.json, checks for existing hook entries, merges updates
- `node-version.ts`: Yargs middleware to enforce Node >=18.0.0

**`packages/cli/src/.generated/`:**
- Auto-generated via `scripts/build-assets.ts`
- **NEVER edit directly** - regenerated before each build
- Contains: VERSION (from package.json), HOOK_SCRIPT (from hook's dist), DEPENDENCIES_TEMPLATE (from Liquid file)
- Used by: CLI commands to inject assets without filesystem reads (enables standalone binary)

**`packages/cli/scripts/`:**
- `build-assets.ts`: Prebuild step that embeds hook and template into src/.generated/
- `build-binaries.ts`: Post-build step for standalone binary generation (npm/Homebrew distributions)

**`packages/cli/src/templates/`:**
- `dependencies.yaml.liquid`: Liquid template for generated dependencies.yaml files
- Rendered at init time; contains inline comments and example dependency declarations

## Key File Locations

**Entry Points:**
- `packages/hook/src/index.ts`: Hook executable invoked by Claude Code
- `packages/cli/src/cli.ts`: CLI entry point with shebang `#!/usr/bin/env node`
- `packages/cli/scripts/build-assets.ts`: Prebuild asset generation script

**Configuration:**
- `turbo.json`: Build task definitions and dependencies (hook must build before CLI)
- `package.json` (root): Monorepo scripts (build, dev, test, format, lint)
- `packages/hook/package.json`: Hook package exports `dist/anthropak.mjs`
- `packages/cli/package.json`: CLI exports bin entry `dist/cli.mjs`

**Core Logic:**
- `packages/hook/src/lib/config.ts`: Config loading and validation
- `packages/hook/src/lib/registry.ts`: Plugin installation checking
- `packages/hook/src/lib/output.ts`: Dependency formatting
- `packages/cli/src/commands/init.ts`: Initialization logic
- `packages/cli/src/lib/hooks.ts`: hooks.json file operations

**Testing:**
- Not detected in codebase (no test directory or test files)

**Build Artifacts:**
- `packages/hook/dist/anthropak.mjs`: Bundled hook script
- `packages/cli/dist/cli.mjs`: Bundled CLI executable
- `packages/cli/src/.generated/`: Auto-generated asset embedding files
- `packages/cli/bin/`: Standalone binaries (created by build-binaries.ts)

## Naming Conventions

**Files:**
- `.ts` extension for TypeScript source
- `.mjs` extension for bundled ES modules (outputs only, not sources)
- `.liquid` extension for Liquid template files
- `dependencies.yaml` as config file (also supports .yml, .json, .jsonc)
- `hooks.json` as Claude Code hooks registry

**Directories:**
- `src/` for TypeScript sources
- `lib/` for internal modules and utilities
- `commands/` for CLI command definitions
- `templates/` for template files
- `.generated/` for auto-generated asset files
- `dist/` for bundled outputs
- `scripts/` for build/tooling scripts

**TypeScript Files:**
- Modules in `lib/` use `lib/` prefix in directory structure (not nested further)
- Commands in `commands/` use module name matching command name (e.g., `init.ts` for `init` command)
- Exported functions use descriptive verbs: `loadConfig`, `validateConfig`, `formatMissingDeps`, `isPluginInstalled`

**Exports:**
- Barrel files: `src/.generated/index.ts` (single re-export point for generated assets)
- Package exports: `package.json` `exports` field points to bundled outputs (`dist/anthropak.mjs`, `dist/cli.mjs`)

## Where to Add New Code

**New Feature in Hook:**
- Core logic: `packages/hook/src/lib/[name].ts`
- Types: Add to `packages/hook/src/types.ts`
- Tests: Create alongside source (not present yet - would go in `packages/hook/src/lib/[name].test.ts` if testing added)
- After build, hook output auto-embeds into CLI via `build-assets.ts`

**New CLI Command:**
- Command definition: `packages/cli/src/commands/[command].ts`
- Command must export default CommandModule<object, Args> via yargs
- Command must be imported and registered in `packages/cli/src/cli.ts`
- Supporting utilities: Add to `packages/cli/src/lib/` as needed

**New Template:**
- Liquid template: `packages/cli/src/templates/[name].liquid`
- Export constant: Add to `build-assets.ts` generation logic
- Export in: `packages/cli/src/.generated/index.ts` (auto-generated)
- Import and use: `packages/cli/src/lib/templates.ts` or commands

**Shared Utilities:**
- Hook-side helpers: `packages/hook/src/lib/`
- CLI-side helpers: `packages/cli/src/lib/`
- Shared types: `packages/hook/src/types.ts` (imported by both)

**Dependencies:**
- Hook: Minimize external deps (currently only `confbox` for config parsing)
- CLI: Add to `packages/cli/package.json` dependencies
- Monorepo tools: Add to root `package.json` devDependencies

## Special Directories

**`packages/cli/src/.generated/`:**
- Purpose: Hold compile-time embedded assets
- Generated: Yes (via `scripts/build-assets.ts` prebuild)
- Committed: No (gitignored)
- Actions: DO NOT EDIT manually. Files regenerate before each build. If editing template or hook, rebuild will update generated files.

**`packages/hook/dist/`:**
- Purpose: Bundled hook script output
- Generated: Yes (via `pnpm build` in packages/hook)
- Committed: No (gitignored)
- Actions: Consumed by CLI prebuild; regenerate with `pnpm build`

**`packages/cli/dist/`:**
- Purpose: Bundled CLI executable
- Generated: Yes (via `pnpm build` in packages/cli)
- Committed: No (gitignored)
- Actions: Used as `anthropak` command entry point (from bin field in package.json)

**`packages/cli/bin/`:**
- Purpose: Standalone platform-specific binaries
- Generated: Yes (via `scripts/build-binaries.ts` if run)
- Committed: No (gitignored)
- Actions: Created for distribution (npm, Homebrew); not part of standard build

---

*Structure analysis: 2026-02-06*
