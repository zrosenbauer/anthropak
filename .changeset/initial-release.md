---
"anthropak": minor
---

# Initial Release

Anthropak is a CLI tool and hook system that lets Claude Code plugins declare and check for dependencies on other plugins and CLI tools.

## Core Features

- **`anthropak init [path]`** - Scaffold a `anthropak.yaml` config, hook script (`hook/anthropak.mjs`), and wire up `hooks.json` for any Claude Code plugin
- **`anthropak update [path]`** - Update an existing hook script to the latest embedded version
- **`anthropak validate [path]`** - Validate a `anthropak.yaml` config file without running the full hook
- **Plugin dependency checking** - Declare required and optional plugin dependencies in `anthropak.yaml`; the hook checks Claude Code's `installed_plugins.json` registry (global and project-scoped) at load time
- **CLI tool dependency checking** - Declare required and optional CLI tool dependencies; the hook verifies they are available on `$PATH`
- **Hook system** - A single-file hook (`anthropak.mjs`) that runs inside Claude Code, reads the plugin's `anthropak.yaml`, and outputs a JSON response with a `systemMessage` when dependencies are missing
- **Non-interactive mode** - All CLI commands support `--non-interactive` / `--ni` for CI and scripted usage
- **Node.js version guard** - Enforces Node.js >= 18 at CLI startup
