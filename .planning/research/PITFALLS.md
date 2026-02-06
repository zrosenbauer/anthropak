# Pitfalls Research

**Domain:** Claude Code Dependency Management - CLI Tool & MCP Server Checking
**Researched:** 2026-02-06
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Cross-Platform CLI Detection with Spaces in Paths

**What goes wrong:**
CLI tool detection fails on Windows when paths contain spaces, even though the CLI is installed. `child_process.spawn()` and `child_process.exec()` handle spaces differently across platforms, leading to ENOENT errors on Windows while working fine on macOS/Linux.

**Why it happens:**
Windows requires paths with spaces to be quoted, but Node.js's child_process module doesn't consistently escape commands. The command lookup uses `options.env.PATH`, but Windows handles PATH differently than Unix-like systems. Additionally, `which` (Unix) and `where` (Windows) have different behaviors and output formats.

**How to avoid:**
- Use libraries like `command-exists` (npm) or `cross-spawn` instead of raw `child_process`
- If implementing manually, use `child_process.exec()` instead of `spawn()` for command checking
- Always quote paths on Windows: wrap command paths in double quotes
- Don't rely on `which` or `command -v` directly - they're not portable
- Test with paths containing spaces: `C:\Program Files\...`

**Warning signs:**
- Works on developer's Mac but fails in CI/CD on Windows
- Error messages like "spawn ENOENT" on Windows only
- CLI detection succeeds for global installs but fails for user-scoped installs
- Different behavior between PowerShell, CMD, and Git Bash on Windows

**Phase to address:**
Phase 1 (CLI Detection Foundation) - Use proven library from the start, don't build custom spawn logic.

**Sources:**
- [Node.js Issue #38490: Cannot spawn shell script if path has spaces](https://github.com/nodejs/node/issues/38490)
- [Node.js Issue #7367: child_process.spawn fails on Windows given a space](https://github.com/nodejs/node/issues/7367)
- [command-exists npm package](https://www.npmjs.com/package/command-exists)

---

### Pitfall 2: MCP Configuration File Location Confusion

**What goes wrong:**
Documentation incorrectly states MCP configuration lives in `~/.claude/settings.json`, but MCP servers are actually configured in `~/.claude.json` (user-scoped) and `.mcp.json` (project-scoped). Reading from the wrong location results in never finding installed MCP servers.

**Why it happens:**
Claude Code has multiple configuration files with overlapping but distinct purposes:
- `~/.claude/settings.json` - User settings (NOT MCP servers)
- `~/.claude/settings.local.json` - Local user settings
- `~/.claude.json` - OAuth, MCP servers (user + local scope), caches
- `.mcp.json` - Project-scoped MCP servers

The documentation discrepancy causes developers to look in the wrong place.

**How to avoid:**
- Read MCP servers from TWO locations: `~/.claude.json` AND `.mcp.json`
- Parse both user-scoped and project-scoped MCP server lists
- Don't use settings.json for MCP detection
- Handle missing files gracefully (either location may not exist)
- Verify with actual Claude Code installation before hardcoding paths

**Warning signs:**
- Hook reports MCP servers as missing when user knows they're installed
- Detection works for some users but not others
- MCP detection only works for project-scoped OR user-scoped, not both
- Error logs mention "file not found" for settings.json

**Phase to address:**
Phase 2 (MCP Detection) - Research actual file locations in real Claude Code installations first.

**Sources:**
- [Claude Code Issue #4976: Documentation incorrect about MCP configuration file location](https://github.com/anthropics/claude-code/issues/4976)
- [Inventive HQ: Where configuration files are stored](https://inventivehq.com/knowledge-base/claude/where-configuration-files-are-stored)
- [Scott Spence: Configuring MCP Tools in Claude Code](https://scottspence.com/posts/configuring-mcp-tools-in-claude-code)

---

### Pitfall 3: Hook Crashes Break Claude Code Plugin Loading

**What goes wrong:**
If the hook script throws an uncaught exception or promise rejection, Claude Code's plugin loading fails silently or displays confusing errors. Users can't use the plugin at all, not even to see what went wrong.

**Why it happens:**
Hooks run during Claude Code's initialization phase. An unhandled exception causes the process to exit non-zero, which Claude Code interprets as a fatal plugin error. The hook's stdout is the only communication channel - if JSON isn't written before the crash, Claude Code receives nothing.

**How to avoid:**
- Wrap ENTIRE hook in try-catch, including top-level async IIFE
- Add `process.on('uncaughtException')` and `process.on('unhandledRejection')` handlers
- ALWAYS output valid JSON before calling `process.exit()`, even on error paths
- Default to empty object `{}` on any error: `console.log(JSON.stringify({}))`
- Never let JSON.stringify throw (can fail on circular refs or large objects)
- Add timeout to stdin reading (don't hang forever waiting for input)

**Warning signs:**
- Plugin loads fine in development but fails for users
- No error message visible to users, just "plugin failed to load"
- Hook works with valid config but crashes on malformed YAML
- File system errors (ENOENT, EACCES) cause plugin to become unusable

**Phase to address:**
Phase 0 (Foundation) - Hook reliability is prerequisite for ALL features. Current hook already has some error handling, but needs comprehensive coverage.

**Sources:**
- [Honeybadger: Error handling in Node.js](https://www.honeybadger.io/blog/errors-nodejs/)
- [Node.js official: Errors documentation](https://nodejs.org/api/errors.html)
- [Sematext: Node.js Error Handling Best Practices](https://sematext.com/blog/node-js-error-handling/)

---

### Pitfall 4: Breaking Schema Changes Without Versioning

**What goes wrong:**
Adding new required fields or renaming existing fields in `dependencies.yaml` breaks all existing plugin configurations. Users update the hook script via `anthropak update`, and their previously valid config suddenly becomes invalid, blocking plugin loading.

**Why it happens:**
YAML config is append-only from user's perspective - they write it once and forget it. When the hook script upgrades and expects new fields or different structure, the old config fails validation. Without schema versioning, the hook can't distinguish "old valid config" from "new invalid config."

**How to avoid:**
- Add `version` field to dependencies.yaml schema (e.g., `schemaVersion: 1`)
- Make ALL new fields optional (never add new required fields)
- Use deprecation instead of removal (warn about deprecated fields, still accept them)
- Provide migration path in CLI: `anthropak migrate` to upgrade configs
- Default to version 1 if `schemaVersion` missing (backward compat)
- Document breaking changes with migration guide in CHANGELOG

**Warning signs:**
- User reports "missing required field" error after updating hook
- Old plugins stop working when hook is updated
- GitHub issues titled "Plugin broke after updating anthropak"
- No way to roll back schema changes for users

**Phase to address:**
Phase 0 (Foundation) - Add schema versioning BEFORE any new features. CLI/MCP detection will both add new fields to dependencies.yaml.

**Sources:**
- [DataExpert: Backward Compatibility in Schema Evolution](https://www.dataexpert.io/blog/backward-compatibility-schema-evolution-guide)
- [SUEWS: YAML Configuration Schema Versioning](https://suews.readthedocs.io/latest/contributing/schema/schema_versioning.html)
- [Confluent: Schema Evolution and Compatibility](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)

---

### Pitfall 5: Race Conditions Reading Config Files

**What goes wrong:**
Hook reads `dependencies.yaml` at the exact moment it's being written by the user or updated by `anthropak update`. This results in parsing errors (incomplete YAML), ENOENT errors (file temporarily deleted during atomic write), or corrupted data. Hook crashes and blocks plugin loading.

**Why it happens:**
File system operations aren't atomic. When a file is updated, there's a window where it might not exist (delete-then-write) or contain partial data. Node.js's `fs.readFileSync()` doesn't retry or handle these transient states. Editors and tools use different atomic write strategies (tempfile-then-rename vs. direct write).

**How to avoid:**
- Don't use `fs.access()` before `fs.readFile()` - creates race condition window
- Catch ENOENT specifically and treat as "no config" (not fatal error)
- Add retry logic with exponential backoff for read failures (max 3 retries)
- Handle partial/invalid YAML gracefully (catch parse errors)
- Never crash on file system errors - return empty config
- Consider file watching for development, but not in production hook

**Warning signs:**
- Intermittent "file not found" errors that disappear on retry
- YAML parse errors when config is known to be valid
- Errors during `anthropak update` or `anthropak init`
- Works 99% of the time but occasionally fails

**Phase to address:**
Phase 0 (Foundation) - Current hook uses try-catch around readFileSync but may need retry logic.

**Sources:**
- [Node.js official: File system documentation](https://nodejs.org/api/fs.html)
- [Node.js Design Patterns: Race conditions](https://nodejsdesignpatterns.com/blog/node-js-race-conditions/)
- [GitHub: node-js-race-conditions examples](https://github.com/lmammino/node-js-race-conditions)

---

### Pitfall 6: PATH Environment Variable Not Inherited in Hook Context

**What goes wrong:**
User has CLI tool installed and can run it in their terminal, but the hook reports it as missing. This happens because the hook process doesn't inherit the user's full PATH environment variable - it gets a sanitized/minimal PATH from Claude Code's process.

**Why it happens:**
Claude Code may run hooks in a restricted environment with a clean PATH for security/consistency. Tools installed via Homebrew (`/opt/homebrew/bin`), asdf (`~/.asdf/shims`), nvm, or user-local npm (`~/.npm-global/bin`) might not be in the PATH. The hook inherits `process.env.PATH`, which may differ from the user's interactive shell PATH.

**How to avoid:**
- Read PATH from multiple sources: `process.env.PATH`, user's shell profile (~/.zshrc, ~/.bashrc)
- On macOS, check common locations: `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`
- On Windows, read PATH from registry (HKCU and HKLM)
- Document that CLI detection may require full path in dependencies.yaml: `command: /opt/homebrew/bin/gh`
- Provide fallback: check common install locations even if not in PATH
- Allow users to specify PATH override in config

**Warning signs:**
- "CLI not found" but `which <tool>` works in user's terminal
- Works for globally installed npm packages but not Homebrew tools
- Different results in different terminals (bash vs zsh vs fish)
- Works when running `node hook/anthropak.mjs` manually but fails in Claude Code

**Phase to address:**
Phase 1 (CLI Detection Foundation) - Environment detection is core to CLI checking.

**Sources:**
- [Node.js official: child_process documentation (env handling)](https://nodejs.org/api/child_process.html)
- [Node.js Issue #12986: Spawn ignoring PATH](https://github.com/nodejs/node/issues/12986)

---

### Pitfall 7: Shell-Specific Command Syntax

**What goes wrong:**
Using `command -v` or `which` directly in spawned shell commands works on macOS/Linux but fails on Windows. PowerShell uses `Get-Command`, CMD uses `where`, and Git Bash uses `which`. The hook either crashes or returns false negatives depending on which shell is available.

**Why it happens:**
Each shell has different built-in commands for checking CLI existence:
- Bash/Zsh: `command -v`, `which`, `type`
- PowerShell: `Get-Command`, `where.exe` (conflicts with CMD's `where`)
- CMD: `where`
- Fish: `type -q`

The hook can't know which shell is available or active.

**How to avoid:**
- NEVER shell out to check commands - use pure Node.js solutions
- If you must shell out, detect platform first: `process.platform === 'win32'`
- On Windows, use `where.exe` (explicit .exe to avoid PowerShell alias)
- Better: use `command-exists` npm package (handles all platforms)
- Best: use `child_process.exec()` to run the tool with `--version` and check exit code

**Warning signs:**
- "command not found: command" error on Windows
- PowerShell vs CMD differences in CI/CD
- Works in WSL but not native Windows
- Different behavior when Claude Code runs with different shell configured

**Phase to address:**
Phase 1 (CLI Detection Foundation) - Platform detection must come first.

**Sources:**
- [DEV Community: Cross-Platform Command Line basics](https://dev.to/justice/devops-ep-2-command-line-basics-50lp)
- [EOL System: Comparison between Linux macOS and Windows CLI commands](https://www.eolsystem.com/tutorials/comparison-between-linux-macos-and-windows-cli-terminal-commands/)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip schema versioning, add new fields directly | Faster feature development | Breaking changes break all existing configs | Never - versioning is cheap to add early, expensive to retrofit |
| Use `JSON.parse()` without try-catch | Cleaner code | Hook crashes on malformed config | Never in hook context (must never crash) |
| Check only `~/.claude.json` for MCP servers | Simpler logic, fewer file reads | Miss half of installed MCP servers (project-scoped) | Never - must check both locations |
| Use `child_process.spawn()` directly for CLI checks | More control over execution | Windows path/space issues, shell differences | Never - use `command-exists` or `execa` |
| Read config once at startup, cache in memory | Faster repeated checks | Miss config updates during hook execution | Only if hook runs <100ms (acceptable for plugin load hook) |
| Assume PATH contains all installed CLIs | Works for most users | Breaks for Homebrew/asdf/nvm users on macOS | Never - must check common install paths |
| Use `fs.access()` before `fs.readFile()` | Explicit permission checking | Race condition window | Never - just try to read and handle error |

## Integration Gotchas

Common mistakes when connecting to external services/files.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude Code config files | Assume single config file location | Check multiple locations: `~/.claude/`, `~/.claude.json`, `.mcp.json` |
| MCP server detection | Parse `settings.json` for MCP config | Parse `~/.claude.json` and `.mcp.json` (NOT settings.json) |
| CLI tool detection | Use `which` or `command -v` in shell | Use `command-exists` npm package or `child_process.exec('<tool> --version')` |
| YAML parsing | Let parser errors crash hook | Catch parse errors, treat as missing/invalid config |
| stdin reading | Wait indefinitely for input | Add timeout, handle empty stdin, catch JSON parse errors |
| PATH environment | Trust `process.env.PATH` completely | Also check common install locations: `/opt/homebrew/bin`, `~/.local/bin`, etc. |
| File existence checking | Use `fs.access()` then `fs.readFile()` | Just use `fs.readFile()` and catch ENOENT |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous file I/O for every check | Hook takes >1 second to complete | Cache config reads, use async I/O | >10 dependency checks |
| Spawning shell for every CLI check | Hook timeout (>5 seconds) | Batch checks, use library that caches results | >5 CLI dependencies |
| No timeout on stdin read | Hook hangs forever waiting for input | Add timeout (e.g., 1 second for stdin) | When Claude Code doesn't send stdin |
| Reading entire `installed_plugins.json` into memory | OOM errors with large plugin lists | Stream parse or use mmap (unlikely needed - file is small) | >1000 plugins (unlikely) |
| Checking every possible config file location | Slow hook execution | Check in priority order, stop on first found | >10 config file variants |
| Deep recursive dependency resolution | Stack overflow, infinite loops | Limit recursion depth, detect cycles | Circular dependencies in plugin graph |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Executing CLI tools from user config without validation | Command injection if user controls tool path | Validate tool names against allowlist, sanitize paths |
| Reading config from any file path in filesystem | Path traversal, reading sensitive files | Only read from plugin root and known config locations |
| Exposing full file paths in error messages | Information disclosure about user's system | Redact full paths, show relative paths only |
| Running CLI checks with inherited user permissions | Escalated permissions if user is admin | Run with minimal required permissions (read-only) |
| Parsing untrusted YAML without size limits | DoS via YAML bomb (deeply nested structures) | Limit file size (e.g., 100KB max for dependencies.yaml) |
| Following symlinks in config file paths | Reading files outside plugin directory | Use `fs.realpath()` and validate within bounds |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent failures (empty JSON on error) | User doesn't know why plugin isn't loading | Include `systemMessage` with actionable error when validation fails |
| Generic error messages ("invalid config") | User can't fix the problem | Specific errors: "dependencies.required[0].plugin: must be a string" |
| No install instructions for missing deps | User knows what's missing but not how to fix it | Include `install` field with copy-paste command |
| Checking for optional deps but not distinguishing them | User thinks optional deps are required | Separate sections: "Missing Required" vs "Missing Optional" |
| No version information in error messages | User can't tell if hook is outdated | Include hook version in systemMessage |
| Errors for config fields that don't matter | User fixes non-issues while real problems exist | Only validate fields that hook actually uses |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **CLI Detection:** Often missing Windows support - verify with actual Windows test, not just WSL
- [ ] **MCP Detection:** Often missing project-scoped `.mcp.json` - verify checking BOTH user and project scopes
- [ ] **Error Handling:** Often missing `unhandledRejection` handler - verify Promise rejections don't crash hook
- [ ] **Config Validation:** Often missing version field - verify schema versioning exists BEFORE adding new fields
- [ ] **PATH Detection:** Often missing Homebrew/asdf paths - verify checking common install locations beyond `process.env.PATH`
- [ ] **Race Condition Handling:** Often missing retry logic - verify ENOENT doesn't crash, just returns empty config
- [ ] **Timeout Handling:** Often missing stdin timeout - verify hook exits within reasonable time even if stdin hangs
- [ ] **JSON Safety:** Often missing circular reference handling - verify JSON.stringify can't throw
- [ ] **Platform Testing:** Often missing actual Windows testing - verify on Win10, Win11, not just macOS/Linux
- [ ] **Shell Compatibility:** Often missing PowerShell testing - verify works in PowerShell, CMD, and bash

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Breaking schema change shipped | HIGH | 1. Add schema version field, 2. Default to v1 for missing version, 3. Support both old and new schema simultaneously, 4. Release `anthropak migrate` command |
| Hook crashes in production | MEDIUM | 1. Add top-level error handler in hook, 2. Release patch version, 3. Document `anthropak update` in support channels |
| MCP detection wrong file location | LOW | 1. Add correct file location to hook, 2. Keep old location as fallback, 3. Release minor version |
| CLI detection broken on Windows | MEDIUM | 1. Replace custom logic with `command-exists`, 2. Add Windows CI testing, 3. Release patch version |
| PATH not detected | LOW | 1. Add common install paths to check list, 2. Document PATH override in config, 3. Release minor version |
| Race condition in config reading | LOW | 1. Add retry logic with backoff, 2. Add integration test with concurrent writes, 3. Release patch version |
| stdin hangs forever | MEDIUM | 1. Add timeout to stdin reading, 2. Default to empty input on timeout, 3. Release patch version |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hook crashes | Phase 0: Foundation | Inject errors in tests, verify JSON output always succeeds |
| Breaking schema changes | Phase 0: Foundation | Add version field before any new features |
| Race conditions in config | Phase 0: Foundation | Concurrent file write test, verify no crashes |
| Cross-platform CLI detection | Phase 1: CLI Detection | Test on Windows 10/11, macOS, Linux (not just WSL) |
| PATH not inherited | Phase 1: CLI Detection | Test with Homebrew, asdf, nvm installations |
| Shell-specific syntax | Phase 1: CLI Detection | Test in PowerShell, CMD, bash, zsh |
| MCP config file location | Phase 2: MCP Detection | Test with user-scoped and project-scoped MCP servers |
| stdin timeout | Phase 0: Foundation | Test with no stdin, verify exits within 5 seconds |
| JSON.stringify exceptions | Phase 0: Foundation | Test with circular refs, huge objects |
| Generic error messages | All phases | User testing: can users fix errors without support? |

## Sources

### Cross-Platform CLI Detection
- [Node.js Issue #38490: Cannot spawn shell script if path has spaces](https://github.com/nodejs/node/issues/38490)
- [Node.js Issue #7367: child_process.spawn fails on Windows given a space](https://github.com/nodejs/node/issues/7367)
- [Node.js Issue #12986: Spawn ignoring PATH](https://github.com/nodejs/node/issues/12986)
- [command-exists npm package](https://www.npmjs.com/package/command-exists)
- [cross-spawn npm package](https://www.npmjs.com/package/cross-spawn)
- [DEV Community: Cross-Platform Command Line basics](https://dev.to/justice/devops-ep-2-command-line-basics-50lp)

### MCP Configuration
- [Claude Code Issue #4976: Documentation incorrect about MCP configuration file location](https://github.com/anthropics/claude-code/issues/4976)
- [Claude Code settings documentation](https://code.claude.com/docs/en/settings)
- [Inventive HQ: Where configuration files are stored](https://inventivehq.com/knowledge-base/claude/where-configuration-files-are-stored)
- [Scott Spence: Configuring MCP Tools in Claude Code](https://scottspence.com/posts/configuring-mcp-tools-in-claude-code)

### Error Handling & Hook Reliability
- [Honeybadger: Error handling in Node.js](https://www.honeybadger.io/blog/errors-nodejs/)
- [Node.js official: Errors documentation](https://nodejs.org/api/errors.html)
- [Sematext: Node.js Error Handling Best Practices](https://sematext.com/blog/node-js-error-handling/)

### Schema Versioning & Backward Compatibility
- [DataExpert: Backward Compatibility in Schema Evolution](https://www.dataexpert.io/blog/backward-compatibility-schema-evolution-guide)
- [SUEWS: YAML Configuration Schema Versioning](https://suews.readthedocs.io/latest/contributing/schema/schema_versioning.html)
- [Confluent: Schema Evolution and Compatibility](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)

### File System & Race Conditions
- [Node.js official: File system documentation](https://nodejs.org/api/fs.html)
- [Node.js Design Patterns: Race conditions](https://nodejsdesignpatterns.com/blog/node-js-race-conditions/)
- [GitHub: node-js-race-conditions examples](https://github.com/lmammino/node-js-race-conditions)

### JSON & Data Handling
- [MDN: JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- [MDN: TypeError: cyclic object value](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value)
- [FreeCodeCamp: Circular Reference Error](https://www.freecodecamp.org/news/circular-reference-in-javascript-explained/)

---
*Pitfalls research for: Claude Code Dependency Management - CLI Tool & MCP Server Checking*
*Researched: 2026-02-06*
