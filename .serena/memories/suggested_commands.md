# Suggested Commands

## Development

| Command        | Description                                      |
| -------------- | ------------------------------------------------ |
| `pnpm install` | Install all dependencies                         |
| `pnpm build`   | Build all packages (hook builds first via turbo) |
| `pnpm dev`     | Watch mode for development                       |
| `pnpm clean`   | Remove all build artifacts                       |

## Quality Checks

| Command            | Description                            |
| ------------------ | -------------------------------------- |
| `pnpm lint`        | Lint with oxlint                       |
| `pnpm format`      | Check formatting with oxfmt            |
| `pnpm fix`         | Auto-fix both lint and format issues   |
| `pnpm typecheck`   | TypeScript type checking               |
| `pnpm lint:readme` | Lint README files with standard-readme |

## Versioning & Release

| Command                 | Description                       |
| ----------------------- | --------------------------------- |
| `pnpm changeset`        | Create a changeset for versioning |
| `pnpm version-packages` | Apply changesets to bump versions |
| `pnpm release`          | Publish packages                  |

## Per-Package Commands

Run from within `packages/hook/` or `packages/cli/`:
| Command | Description |
|---------|-------------|
| `pnpm build` | Build the individual package with tsdown |
| `pnpm dev` | Watch mode for the individual package |
| `pnpm typecheck` | Type-check the individual package |
| `pnpm clean` | Remove dist/bin artifacts |

## System Utils (macOS / Darwin)

| Command | Description                |
| ------- | -------------------------- |
| `git`   | Version control            |
| `pnpm`  | Package manager (v10.13.1) |
| `node`  | Runtime (>=18.0.0)         |

## Notes

- No test runner is configured yet (pre-push hook just echoes a placeholder)
- Git hooks managed by lefthook (pre-commit runs lint + format on staged files)
