# Task Completion Checklist

After completing a coding task, run these checks:

## Required

1. **Build**: `pnpm build` — ensures both packages compile and the hook→CLI asset pipeline works
2. **Type check**: `pnpm typecheck` — catches type errors across the monorepo
3. **Lint**: `pnpm lint` — oxlint check for correctness/suspicious issues
4. **Format**: `pnpm format` — oxfmt formatting check

## Fix Issues

- Run `pnpm fix` to auto-fix lint + format issues together

## Notes

- No test suite is configured yet — skip test step
- If editing `packages/hook`, rebuild to verify the CLI asset embedding still works
- Never commit changes to `src/.generated/` without rebuilding first
- Use `pnpm changeset` if the change warrants a version bump
