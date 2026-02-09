# anthropak

> CLI tool to manage plugin dependencies for Claude Code plugins

Initialize and manage dependency declarations for your Claude Code plugins. This tool creates the necessary configuration files and hooks so that users are notified when required plugins are missing.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Commands](#commands)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

## Install

### Homebrew

```bash
brew install zrosenbauer/tap/anthropak
```

### npm

```bash
npm install -g anthropak
```

## Usage

```bash
# Initialize in current directory
anthropak init

# Initialize in specific path
anthropak init ./my-plugin

# Force overwrite existing files
anthropak init --force

# Update hook to latest version
anthropak update
```

## Commands

### `init [path]`

Initialize plugin dependency management in a directory.

| Option    | Alias | Description                       |
| --------- | ----- | --------------------------------- |
| `--force` | `-f`  | Overwrite existing anthropak.yaml |

Creates:

- `anthropak.yaml` - Dependency declarations (in `.claude-plugin/` for plugins, `.claude/` for repos)
- `hook/anthropak.mjs` - Hook script
- Updates `hooks.json` - Registers the hook

### `update [path]`

Update the hook script and hooks.json to the latest version.

## Configuration

### anthropak.yaml

```yaml
dependencies:
  required:
    - plugin: mcp-server-name
      marketplace: marketplace-id # Optional: marketplace identifier
      github: owner/repo # Optional: GitHub repository
      description: Why needed # Optional: human-readable description
      install: custom command # Optional: custom install command
  optional:
    - plugin: another-plugin
      description: Enables extra features
```

**Fields:**

| Field         | Required | Description                              |
| ------------- | -------- | ---------------------------------------- |
| `plugin`      | Yes      | Plugin identifier/name                   |
| `marketplace` | No       | Marketplace identifier for install link  |
| `github`      | No       | GitHub repository in `owner/repo` format |
| `description` | No       | Human-readable description               |
| `install`     | No       | Custom install command                   |

## Contributing

See the [main repository](https://github.com/zrosenbauer/anthropak) for contribution guidelines.

## License

MIT
