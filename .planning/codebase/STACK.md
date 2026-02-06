# Technology Stack

**Analysis Date:** 2026-02-06

## Languages

**Primary:**
- TypeScript 5.7.3 - All source code in both packages
- JavaScript - Generated output (.mjs bundles)

**Secondary:**
- YAML - Configuration files (dependencies.yaml, workflow configs)
- JSON - Configuration (tsconfig.json, package.json, hooks.json)

## Runtime

**Environment:**
- Node.js 18+ (minimum required by CLI package)
- Node.js 22 (used in GitHub Actions CI)

**Package Manager:**
- pnpm 10.13.1
- Lockfile: pnpm-lock.yaml (present)

## Frameworks

**Core:**
- tsdown 0.9.3 - TypeScript bundler for both packages
  - Hook package: Bundles `src/index.ts` → `dist/anthropak.mjs`
  - CLI package: Bundles `src/cli.ts` → `dist/cli.mjs`

**CLI:**
- yargs 17.7.2 - Command-line argument parsing for anthropak CLI
- @clack/prompts 1.0.0 - Interactive CLI prompts (init, update commands)

**Build/Dev:**
- Turborepo 2.4.4 - Monorepo task orchestration
- TypeScript 5.7.3 - Type checking (tsc --noEmit)
- oxlint 1.43.0 - Linting (replaces ESLint)
- oxfmt 0.28.0 - Code formatting (replaces Prettier)
- Changesets 2.29.8 - Versioning and changelog management
- lefthook 2.1.0 - Git hooks framework
- standard-readme 2.0.4 - README validation

**Optional/Deployment:**
- Bun - JavaScript runtime for binary compilation (used in build-binaries.ts)

## Key Dependencies

**Critical:**
- confbox 0.2.2 - YAML/JSON/JSONC parsing library
  - Used in `@anthropak/hook` for loading dependencies.yaml config
  - Bundled into `anthropak.mjs` (noExternal: ["confbox"])

- liquidjs 10.24.0 - Template engine
  - Used in `anthropak` CLI to render dependencies.yaml template
  - Renders Liquid templates for plugin dependency declarations

- yargs 17.7.2 - CLI argument parser
  - Parses commands: init, update, default
  - Handles --force, --path options

- @clack/prompts 1.0.0 - Interactive CLI prompts
  - Used for intro/outro messages and logging in init/update flows

**Node APIs:**
- Node.js fs (readFileSync, writeFileSync, mkdirSync, chmodSync)
- Node.js path (join, resolve)
- Node.js process (stdin, stdout, exit)

## Configuration

**Environment:**
- No environment variables required for core functionality
- GitHub Actions uses: GITHUB_TOKEN, NPM_TOKEN (for release automation)
- No .env file detected (not applicable for this project)

**Build:**
- `tsconfig.json` (hook): ES2022 target, ESNext module, bundler resolution
- `tsconfig.json` (cli): ES2022 target, with declaration files enabled
- `tsdown.config.ts` (hook): Single entry point, ESM format, confbox bundled
- `tsdown.config.ts` (cli): Single entry point with onSuccess hook to embed hook script
- `.oxlintrc.json`: oxlint configuration with custom rules (no-console off, unicorn rules customized)
- `turbo.json`: Task dependencies and output caching

## Platform Requirements

**Development:**
- macOS, Linux, or Windows (runs on all platforms)
- Node.js 18+ (enforced in `packages/cli/package.json` engines field)
- Bun (optional, for binary builds)
- pnpm 10.13.1

**Production:**
- Distributed as npm packages on npm registry
- Hook script runs within Claude Code plugins (Node.js environment)
- CLI runs as standalone tool via `anthropak` command installed globally or locally
- GitHub releases provide pre-built binaries (x86_64-linux, x86_64-macos, aarch64-macos)

---

*Stack analysis: 2026-02-06*
