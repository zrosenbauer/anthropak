# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Anthropak is a CLI tool and hook system that lets Claude Code plugins declare and check for dependencies on other plugins. It consists of two packages in a pnpm monorepo managed by Turborepo.

## Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages (hook must build first - handled by turbo)
pnpm dev              # Watch mode for development
pnpm lint             # Lint with oxlint
pnpm format           # Check formatting with oxfmt
pnpm fix              # Auto-fix lint and format issues
pnpm typecheck        # TypeScript type checking
pnpm changeset        # Create a changeset for versioning
```

## Architecture

### Package Structure

- **packages/hook** (`@anthropak/hook`) - The hook script that runs inside Claude Code to check dependencies. Outputs to a single `dist/anthropak.mjs` file.
- **packages/cli** (`anthropak`) - The CLI tool users run to initialize and manage plugin dependencies.

### Build Order Dependency

The CLI embeds the hook script at build time. The build process:

1. `packages/hook` builds first, producing `dist/anthropak.mjs`
2. `packages/cli/scripts/build-assets.ts` runs as a prebuild step, reading the hook output and generating `src/.generated/` files
3. `packages/cli` then builds with the embedded assets

The `src/.generated/` directory contains auto-generated TypeScript files with embedded assets (version, templates, hook script). Never edit these directly.

### Hook Package Flow

When Claude Code loads a plugin with anthropak configured:

1. Hook reads `dependencies.yaml` from the plugin root
2. Validates config structure
3. Loads Claude's `installed_plugins.json` registry
4. Checks if declared dependencies are installed (global or project-scoped)
5. Outputs a JSON response with `systemMessage` if dependencies are missing

### CLI Commands

- `anthropak init [path]` - Scaffolds `dependencies.yaml`, `hook/anthropak.mjs`, and updates `hooks.json`
- `anthropak update [path]` - Updates the hook script to latest version

## Code Conventions

- Uses oxlint for linting and oxfmt for formatting (not ESLint/Prettier)
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- TypeScript with ES modules (`.js` extensions in imports)
- tsdown for bundling (not plain tsc)
