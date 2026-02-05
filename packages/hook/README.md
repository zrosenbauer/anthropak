# @anthropak/hook

> Hook script for Claude Code plugin dependency checking

This package contains the hook script that runs when Claude Code loads a plugin. It checks whether required and optional plugin dependencies are installed and notifies the user about any missing dependencies.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [How It Works](#how-it-works)
- [Contributing](#contributing)
- [License](#license)

## Install

This package is not typically installed directly. Instead, use the [anthropak CLI](../cli) which bundles and installs this hook automatically.

```bash
npm install -g anthropak
anthropak init
```

## Usage

The hook is automatically invoked by Claude Code when a plugin is loaded. It reads the `dependencies.yaml` file in the plugin root and checks each dependency against Claude's installed plugins registry.

### Output

When dependencies are missing, the hook returns a system message to Claude Code:

```
**Missing Required Plugin Dependencies**
- some-plugin: Description of why it's needed
  Install: claude mcp add some-plugin

**Missing Optional Plugin Dependencies**
- another-plugin: Enables additional features
  GitHub: https://github.com/owner/repo
```

## How It Works

1. Reads `dependencies.yaml` from the plugin root
2. Validates the configuration structure
3. Loads Claude's installed plugins registry (`~/.claude/plugins/installed.json`)
4. Compares declared dependencies against installed plugins
5. Returns formatted messages for any missing dependencies

### Configuration Format

The hook expects a `dependencies.yaml` file with this structure:

```yaml
dependencies:
  required:
    - plugin: plugin-name
      marketplace: marketplace-id
      description: Why this is needed
  optional:
    - plugin: another-plugin
      github: owner/repo
```

## Contributing

See the [main repository](https://github.com/zrosenbauer/anthropak) for contribution guidelines.

## License

MIT
