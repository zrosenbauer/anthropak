# Contributing

## Development Setup

```bash
git clone https://github.com/zrosenbauer/anthropak.git
cd anthropak
pnpm install
pnpm build
```

## Making Changes

1. Open an issue first for non-trivial changes
2. Fork and create a branch from `main`
3. Make your changes
4. Run `pnpm lint && pnpm typecheck`
5. Submit a PR

## Project Structure

```
packages/
  cli/     # anthropak CLI tool
  hook/    # @anthropak/hook script
```

## Commit Messages

Use conventional commits:

```
feat: add new feature
fix: resolve bug
docs: update readme
chore: maintenance
```

## Pull Requests

- Keep PRs focused on a single change
- Update relevant documentation
- Add changeset if your change affects published packages: `pnpm changeset`

## Questions

Open an issue.
