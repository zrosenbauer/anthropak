# Codebase Structure

```
anthropak/
├── .changeset/            # Changeset config
├── .claude/               # Claude Code config
├── .github/               # CI/CD workflows
├── packages/
│   ├── hook/              # @anthropak/hook
│   │   └── src/
│   │       ├── index.ts           # Entry point
│   │       ├── types.ts           # Type definitions
│   │       └── lib/
│   │           ├── config.ts      # Config loading/validation
│   │           ├── constants.ts   # Shared constants
│   │           ├── io.ts          # File I/O utilities
│   │           ├── output.ts      # Output formatting
│   │           ├── registry.ts    # Plugin registry handling
│   │           └── utils.ts       # General utilities
│   └── cli/               # anthropak CLI
│       ├── scripts/               # Build scripts (build-assets.ts, build-binaries.ts)
│       └── src/
│           ├── cli.ts             # CLI entry point (yargs)
│           ├── commands/
│           │   ├── default.ts     # Default command
│           │   ├── init.ts        # `anthropak init`
│           │   └── update.ts      # `anthropak update`
│           ├── lib/
│           │   ├── hooks.ts       # Hook management
│           │   ├── node-version.ts# Node version checks
│           │   └── templates.ts   # Template rendering (liquidjs)
│           └── templates/
# Note: templates directory was removed; templates are now rendered inline
├── scripts/               # Root-level scripts (build-formula.ts)
├── turbo.json             # Turborepo config
├── lefthook.yml           # Git hooks
├── .oxlintrc.json         # Linter config
├── package.json           # Root workspace config
└── pnpm-workspace.yaml    # pnpm workspace definition
```
