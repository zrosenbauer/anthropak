<p align="center">
  <img src="./assets/banner.svg" alt="anthropak" width="100%" />
</p>

A CLI tool and hook system that lets Claude Code plugins declare and check for dependencies on other plugins. When a plugin depends on MCP servers or other Claude Code plugins, anthropak ensures users are notified about missing dependencies.

- 📦 **Plugin dependency checking** — verify required and optional plugins against Claude Code's registry
- 🔧 **CLI tool detection** — ensure CLI tools your plugin needs are available on `$PATH`
- 🔌 **MCP server checking** _(coming soon)_ — verify required MCP servers are configured
- 🪝 **Zero-config hook** — single-file hook that runs automatically when Claude Code loads your plugin
- 🚀 **Scaffold in seconds** — `anthropak init` sets up everything in one command

## Install

### Homebrew

```bash
brew install zrosenbauer/tap/anthropak
```

### npm

```bash
npm install -g anthropak
```

### From Source

```bash
git clone https://github.com/zrosenbauer/anthropak.git
cd anthropak
pnpm install
pnpm build
```

## Usage

### Initialize a Plugin

In your Claude Code plugin directory:

```bash
anthropak init
```

This creates:

- `.claude-plugin/anthropak.yaml` - Declare your plugin's dependencies (or `.claude/anthropak.yaml` for repos)
- `hook/anthropak.mjs` - Hook script that checks for missing dependencies
- Updates `hooks.json` - Registers the hook with Claude Code

### Declare Dependencies

Edit `anthropak.yaml`:

```yaml
dependencies:
  required:
    - plugin: some-mcp-server
      marketplace: some-mcp-server
      description: Required for data fetching
  optional:
    - plugin: another-plugin
      github: owner/repo
      description: Enables additional features
```

### Update Hook

To update the hook script to the latest version:

```bash
anthropak update
```

## Packages

| Package                            | Description                                                |
| ---------------------------------- | ---------------------------------------------------------- |
| [anthropak](./packages/cli)        | CLI tool for initializing and managing plugin dependencies |
| [@anthropak/hook](./packages/hook) | Hook script that runs in Claude Code to check dependencies |

## How It Works

1. Plugin authors run `anthropak init` to set up dependency checking
2. Authors declare dependencies in `anthropak.yaml`
3. When Claude Code loads the plugin, the hook script runs
4. The hook checks Claude's installed plugins registry
5. Missing dependencies are reported to the user via system message

## Contributing

PRs welcome. Please open an issue first to discuss changes.

## License

MIT
