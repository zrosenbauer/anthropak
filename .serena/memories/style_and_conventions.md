# Code Style & Conventions

## Language & Module System

- TypeScript with ES modules (`"type": "module"`)
- Use `.js` extensions in imports (TypeScript ESM convention)
- Target: Node.js >=18.0.0

## Linting & Formatting

- **Linter**: oxlint (NOT ESLint)
  - Categories: correctness=error, suspicious=error, perf=warn
  - Style/pedantic/restriction/nursery all off
  - `no-console` allowed (CLI tool)
  - Ignores: dist, bin, node_modules, .generated
- **Formatter**: oxfmt (NOT Prettier)
- Run `pnpm fix` to auto-fix both

## Commit Convention

- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- Changesets for versioning (run `pnpm changeset` before publishing)

## Project Patterns

- tsdown for bundling (not plain tsc)
- `src/.generated/` files are auto-generated at build time — never edit manually
- Templates use LiquidJS (`.liquid` files in `packages/cli/src/templates/`)
- CLI built with yargs, interactive prompts with @clack/prompts

## Git Hooks (lefthook)

- **pre-commit** (parallel):
  - oxlint --fix on staged JS/TS files
  - oxfmt --write on staged JS/TS/JSON/MD/YAML files
  - standard-readme lint on staged README.md files
- **pre-push**: placeholder (no tests yet)

## File Organization

- Monorepo root has shared config (turbo.json, .oxlintrc.json, lefthook.yml)
- Each package has its own tsconfig.json, tsdown.config.ts, package.json
- CLI commands live in `packages/cli/src/commands/`
- Shared lib code in `packages/*/src/lib/`
