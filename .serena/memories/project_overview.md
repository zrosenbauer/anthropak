# Anthropak - Project Overview

## Purpose

Anthropak is a CLI tool and hook system that lets Claude Code plugins declare and check for dependencies on other plugins.

## Tech Stack

- **Language**: TypeScript (ES modules, `.js` extensions in imports)
- **Monorepo**: pnpm (v10.13.1) + Turborepo
- **Bundler**: tsdown (not plain tsc)
- **Linting**: oxlint (not ESLint)
- **Formatting**: oxfmt (not Prettier)
- **Git hooks**: lefthook (pre-commit: lint+format, pre-push: placeholder for tests)
- **Versioning**: Changesets
- **Node requirement**: >=18.0.0

## Package Structure

- `packages/hook` (`@anthropak/hook`) - Hook script for Claude Code dependency checking, outputs `dist/anthropak.mjs`
- `packages/cli` (`anthropak`) - CLI tool for initializing/managing plugin dependencies, entry at `dist/cli.mjs`

## Build Order

1. `packages/hook` builds first → `dist/anthropak.mjs`
2. `packages/cli/scripts/build-assets.ts` (prebuild) reads hook output → generates `src/.generated/`
3. `packages/cli` builds with embedded assets

**Never edit `src/.generated/` files directly.**

## CLI Commands

- `anthropak init [path]` - Scaffolds dependencies.yaml, hook script, updates hooks.json
- `anthropak update [path]` - Updates hook script to latest version

## Hook Flow

1. Reads `dependencies.yaml` from plugin root
2. Validates config structure
3. Loads Claude's `installed_plugins.json` registry
4. Checks if declared dependencies are installed
5. Outputs JSON response with `systemMessage` if deps are missing

## Key Dependencies

- **hook**: confbox (YAML parsing)
- **cli**: @clack/prompts (interactive CLI), liquidjs (templating), yargs (CLI parsing)
