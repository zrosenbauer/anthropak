# Feature Research

**Domain:** Dependency/prerequisite validation tooling for Claude Code ecosystem
**Researched:** 2026-02-06
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Basic Detection** | Core functionality - must detect missing dependencies | LOW | Already implemented for plugins. Need extension to CLI tools (via `command -v`) and MCP servers (via config check) |
| **Clear Error Messages** | Users need to know what's wrong and why | LOW | Must identify: what's missing, why it's needed, how to fix it |
| **Actionable Install Instructions** | Users expect "here's how to fix it" not just "this is broken" | MEDIUM | Different for each type: plugins (marketplace/github), CLI tools (brew/npm/binary), MCP servers (configuration) |
| **Required vs Optional Distinction** | Users need to know urgency/importance | LOW | Already implemented for plugins, extend to CLI tools and MCP servers |
| **Version Checking** | Dependencies may need specific versions | MEDIUM | CLI tools: parse `--version` output. MCP servers: check server metadata. Lockfile-style exact vs range matching |
| **Configuration File** | Declarative dependencies in YAML/JSON | LOW | Extend existing `dependencies.yaml` schema with `cli_tools:` and `mcp_servers:` sections |
| **Non-Interactive Operation** | Must run in CI/CD and hooks without user input | LOW | Hook runs automatically, CLI validates without prompting |
| **Scope Awareness** | Check global AND project-local installations | HIGH | CLI tools: PATH + local node_modules/.bin. MCP servers: global config + project .claude/settings.json |
| **Exit Codes** | Programmatic success/failure detection | LOW | 0 = all deps met, 1 = required missing, 2 = optional missing, etc. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Multi-Ecosystem Support** | Single tool for plugins, CLI tools, AND MCP servers | MEDIUM | Competitive advantage: no other tool checks all three. Positions anthropak as THE dependency checker for Claude Code |
| **Smart Scope Resolution** | Check both global and project-scoped installs automatically | HIGH | Example: detect `npm install -g gh` OR local `./node_modules/.bin/gh`. Reduces false negatives |
| **Dependency Graph Visualization** | Show dependency tree in hook output or CLI | MEDIUM | Help users understand transitive deps. Example: plugin A → MCP server B → CLI tool C |
| **Auto-Fix Suggestions** | Generate exact commands to install missing deps | MEDIUM | "Run: brew install gh && npm install -g typescript && claude mcp add filesystem". One-command fix |
| **Dry-Run Mode** | Preview what would be checked without making changes | LOW | `anthropak validate --dry-run` shows what checks would run. Useful for debugging configs |
| **Continuous Validation** | Watch mode that re-checks on config changes | MEDIUM | `anthropak watch` monitors dependencies.yaml and re-validates. Catches drift during development |
| **Offline Mode** | Cache check results to work without network | MEDIUM | Speed up hook execution. Store "last known good" state, warn on staleness |
| **Granular Severity Levels** | Beyond required/optional: error, warn, info, suggest | LOW | Example: "error" blocks, "warn" notifies, "suggest" hints at complementary tools |
| **Workspace Multi-Project Support** | Check dependencies across monorepo packages | HIGH | Useful for Claude Code plugin collections. Share base deps, specify package-specific ones |
| **Custom Validation Scripts** | Allow users to define custom checks | HIGH | Example: "check that docker daemon is running" or "postgres version >= 14". Escape hatch for edge cases |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Automatic Installation** | "Just fix it for me" convenience | Permission issues, version conflicts, unexpected system changes. User loses control | Provide exact install commands instead. User runs them explicitly |
| **Real-Time Monitoring** | "Alert me when dependencies change" | Performance overhead in hook execution. Clutters system messages | Check only on plugin load. Optionally run `anthropak validate` manually |
| **Deep Package Analysis** | "Scan for vulnerabilities in dependencies" | Scope creep. Security scanning is a separate concern (OWASP Dependency-Check) | Focus on presence/version. Recommend external tools for security |
| **Auto-Update Dependencies** | "Keep everything current automatically" | Breaking changes risk. User loses version control | Notify about updates, don't apply them. Respect lockfile-like behavior |
| **GUI Configuration Tool** | "Visual editor for dependencies.yaml" | Complexity for simple YAML editing. Maintenance burden | Keep YAML hand-editable. Provide clear schema docs and examples |
| **Integration with Every Package Manager** | "Support apt, yum, pacman, chocolatey..." | Maintenance nightmare. Platform fragmentation | Support detection universally (PATH check), installation via major platforms (brew, npm). Document manual install for others |

## Feature Dependencies

```
[Basic Detection]
    ├──requires──> [Configuration File]
    ├──requires──> [Clear Error Messages]
    └──requires──> [Exit Codes]

[Scope Awareness]
    ├──requires──> [Basic Detection]
    └──enhances──> [Smart Scope Resolution]

[Version Checking]
    ├──requires──> [Basic Detection]
    └──requires──> [Scope Awareness]

[Auto-Fix Suggestions]
    ├──requires──> [Clear Error Messages]
    ├──requires──> [Actionable Install Instructions]
    └──requires──> [Scope Awareness]

[Multi-Ecosystem Support]
    ├──requires──> [Basic Detection]
    └──requires──> [Configuration File] (extended schema)

[Dependency Graph Visualization]
    ├──requires──> [Configuration File]
    └──conflicts──> [Hook Performance] (must be fast)

[Workspace Multi-Project Support]
    ├──requires──> [Configuration File]
    ├──requires──> [Scope Awareness]
    └──conflicts──> [Simple Mental Model]

[Custom Validation Scripts]
    ├──requires──> [Basic Detection]
    └──conflicts──> [Security] (arbitrary code execution)
```

### Dependency Notes

- **Basic Detection → Configuration File:** Can't detect dependencies without knowing what to look for
- **Scope Awareness → Smart Scope Resolution:** Detection must understand scopes before optimizing resolution
- **Auto-Fix Suggestions → Actionable Install Instructions:** Must know how to install before suggesting automated commands
- **Dependency Graph Visualization ↔ Hook Performance:** Rich visualizations slow down hooks. Keep simple or make optional
- **Workspace Multi-Project Support ↔ Simple Mental Model:** Adds complexity. Only valuable in monorepo scenarios
- **Custom Validation Scripts ↔ Security:** Running arbitrary user scripts in hooks is risky. Needs sandboxing or opt-in

## MVP Definition

### Launch With (v1.0)

Minimum viable product — what's needed to validate the concept.

- [x] **Plugin dependency checking** — Already implemented, proven pattern
- [ ] **CLI tool detection** — Core extension: `which`/`command -v` checks for binaries in PATH
- [ ] **MCP server detection** — Core extension: parse Claude Code config for installed MCP servers
- [ ] **Extended configuration schema** — Add `cli_tools:` and `mcp_servers:` to dependencies.yaml
- [ ] **Clear error messages for all types** — Consistent formatting across plugins, CLI tools, MCP servers
- [ ] **Actionable install instructions** — Per-type install guidance (marketplace link, brew command, MCP config docs)
- [ ] **Version checking (basic)** — Exact version match for CLI tools and MCP servers
- [ ] **Scope awareness (global only)** — Check system PATH and global MCP config first
- [ ] **Exit codes** — Programmatic success/failure for CI/CD integration

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Project-scoped dependency checking** — Trigger: users request local node_modules support
- [ ] **Auto-fix command generation** — Trigger: users manually constructing install commands
- [ ] **Version range matching** — Trigger: users need semver-style ">=1.2.0" checks
- [ ] **Dry-run mode** — Trigger: users debugging complex configurations
- [ ] **Granular severity levels** — Trigger: users want more nuance than required/optional
- [ ] **Smart scope resolution** — Trigger: false negatives from global-only checking

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Dependency graph visualization** — Why defer: nice-to-have, performance concerns
- [ ] **Continuous validation (watch mode)** — Why defer: complex, unclear if users need it
- [ ] **Offline mode with caching** — Why defer: optimization, not core functionality
- [ ] **Workspace multi-project support** — Why defer: narrow use case (monorepos), added complexity
- [ ] **Custom validation scripts** — Why defer: security concerns, maintenance burden

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| CLI tool detection | HIGH | LOW | P1 |
| MCP server detection | HIGH | MEDIUM | P1 |
| Extended config schema | HIGH | LOW | P1 |
| Clear error messages (all types) | HIGH | LOW | P1 |
| Actionable install instructions | HIGH | MEDIUM | P1 |
| Basic version checking | MEDIUM | MEDIUM | P1 |
| Scope awareness (global) | HIGH | LOW | P1 |
| Exit codes | MEDIUM | LOW | P1 |
| Project-scoped checking | MEDIUM | HIGH | P2 |
| Auto-fix command generation | MEDIUM | MEDIUM | P2 |
| Version range matching | MEDIUM | MEDIUM | P2 |
| Dry-run mode | LOW | LOW | P2 |
| Granular severity levels | LOW | LOW | P2 |
| Smart scope resolution | MEDIUM | HIGH | P2 |
| Dependency graph viz | LOW | MEDIUM | P3 |
| Watch mode | LOW | HIGH | P3 |
| Offline mode | LOW | MEDIUM | P3 |
| Workspace support | LOW | HIGH | P3 |
| Custom validation scripts | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (v1.0)
- P2: Should have, add when possible (v1.x)
- P3: Nice to have, future consideration (v2+)

## Competitor Feature Analysis

| Feature | npm doctor | flutter doctor | brew doctor | anthropak (planned) |
|---------|-----------|---------------|-------------|---------------------|
| **Environment health check** | Yes (node, npm, git) | Yes (Flutter SDK, deps) | Yes (Homebrew setup) | N/A (not system doctor) |
| **Missing dependency detection** | Limited | Yes | No | **Yes (core feature)** |
| **Actionable error messages** | Basic | Excellent (✅❌⚠️) | Good | **Excellent (planned)** |
| **Auto-fix suggestions** | No | Partial (run commands) | Partial (warnings only) | **Yes (planned)** |
| **Multiple ecosystems** | No (npm only) | No (Flutter only) | No (Homebrew only) | **Yes (plugins + CLI + MCP)** |
| **Configuration file** | No | No | No | **Yes (dependencies.yaml)** |
| **Version checking** | npm packages only | Flutter version only | No | **Yes (all dep types)** |
| **Scope awareness** | Global only | Global only | System-wide only | **Global + project (planned)** |
| **Exit codes** | Yes | Yes | Yes | **Yes (planned)** |
| **Watch/continuous mode** | No | No | No | Maybe (v2+) |

### Our Approach Differentiators

1. **Multi-ecosystem by design:** Only tool checking plugins, CLI tools, AND MCP servers in one pass
2. **Declarative configuration:** dependencies.yaml as single source of truth
3. **Hook integration:** Runs automatically in Claude Code plugin lifecycle, not manual invocation
4. **Smart scoping:** Understands both global and project-local installs (planned v1.x)
5. **Developer-first messaging:** Clear "what, why, how to fix" format

## Implementation Strategy by Dependency Type

### Plugin Dependencies (Existing)

**Detection method:** Check Claude's `installed_plugins.json` registry
**Scope:** Global (~/.claude/plugins) and project-scoped installations
**Version checking:** Plugin metadata if available
**Install instructions:** Marketplace link or GitHub URL

### CLI Tool Dependencies (New)

**Detection method:**
1. Check system PATH with `command -v <tool>` (POSIX-compliant)
2. Fallback to `which <tool>` for older systems
3. Check project-local binaries in `node_modules/.bin` (if project-scoped)

**Scope:**
- Global: System PATH
- Project: `./node_modules/.bin`, `./.bin`, custom paths

**Version checking:**
1. Run `<tool> --version` (most common)
2. Parse output with regex: `/(\d+\.\d+\.\d+)/`
3. Compare against required version (exact or semver range)

**Install instructions:**
- macOS: `brew install <tool>` (if in Homebrew)
- Node.js tools: `npm install -g <tool>`
- Generic: "Install from <url>"

**Example config:**
```yaml
cli_tools:
  required:
    - name: gh
      version: ">=2.0.0"
      install: brew install gh
      description: GitHub CLI for PR automation
  optional:
    - name: jq
      description: JSON parsing in hooks
```

### MCP Server Dependencies (New)

**Detection method:**
1. Parse Claude Code config file (`~/.claude/settings.json` or `.claude/settings.json`)
2. Check `mcpServers` section for registered server names
3. Verify server is enabled (not just registered)

**Scope:**
- Global: `~/.claude/settings.json`
- Project: `.claude/settings.json` in plugin root

**Version checking:**
- Query MCP server metadata endpoint if available
- Check installed package version for npm-based servers
- Compare against required version

**Install instructions:**
- Marketplace: Link to Claude Code MCP marketplace
- Custom: "Add to .claude/settings.json: <config snippet>"
- npm-based: `npm install -g @server/package && configure in Claude Code`

**Example config:**
```yaml
mcp_servers:
  required:
    - name: filesystem
      marketplace: filesystem
      description: Required for file operations
  optional:
    - name: github
      marketplace: github
      description: Enhanced GitHub integration
```

## Technical Specifications

### Configuration Schema Extension

```yaml
# dependencies.yaml (extended)
dependencies:
  # Existing plugin support
  required:
    - plugin: some-mcp-server
      marketplace: some-mcp-server
      description: Required for data fetching
  optional:
    - plugin: another-plugin
      github: owner/repo
      description: Enables additional features

  # NEW: CLI tool support
  cli_tools:
    required:
      - name: gh
        version: ">=2.0.0"  # Optional: exact or semver range
        install: brew install gh  # Optional: custom install command
        description: GitHub CLI for PR automation
    optional:
      - name: jq
        install: brew install jq
        description: JSON parsing in hooks

  # NEW: MCP server support
  mcp_servers:
    required:
      - name: filesystem
        marketplace: filesystem  # Optional: marketplace ID
        config: |  # Optional: example config snippet
          {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem"]
          }
        description: Required for file operations
    optional:
      - name: github
        marketplace: github
        description: Enhanced GitHub integration
```

### Hook Output Format

```
**Missing Required Dependencies**

Plugins:
  • some-mcp-server: Required for data fetching
    Install: claude mcp add some-mcp-server

CLI Tools:
  • gh (>=2.0.0): GitHub CLI for PR automation
    Install: brew install gh
    Current: not found

MCP Servers:
  • filesystem: Required for file operations
    Install: claude mcp add filesystem
    Config: Add to .claude/settings.json

**Missing Optional Dependencies**

CLI Tools:
  • jq: JSON parsing in hooks
    Install: brew install jq

Run 'anthropak validate' for details or 'anthropak fix --dry-run' to preview install commands.
```

### Exit Code Specification

| Code | Meaning | Use Case |
|------|---------|----------|
| 0 | All dependencies satisfied | CI/CD success path |
| 1 | Required dependency missing | CI/CD fail, block execution |
| 2 | Optional dependency missing | CI/CD warn, continue execution |
| 10 | Configuration parse error | Invalid dependencies.yaml |
| 11 | Validation error (bad version format, etc.) | Invalid config values |
| 20 | System error (file not found, permission denied) | Environmental issue |

## Error Message Best Practices

Based on research into flutter doctor, npm doctor, and brew doctor:

### Good Error Messages Include

1. **What:** Clearly identify what's missing
2. **Why:** Explain the impact (what breaks without it)
3. **How:** Exact command to fix
4. **Context:** Version requirements, scope (global vs local)
5. **Visual hierarchy:** Use symbols (✅❌⚠️) or formatting for scan-ability

### Example: Good vs Bad

**Bad:**
```
Dependency 'gh' not found
```

**Good:**
```
❌ gh (>=2.0.0): GitHub CLI for PR automation
   Why needed: Creates PRs from hooks
   Install: brew install gh
   Current: not found in PATH
   Scope: global required (checked system PATH)
```

## Security Considerations

### Risks by Feature

| Feature | Security Risk | Mitigation |
|---------|--------------|------------|
| CLI tool detection | Path injection | Use `command -v`, sanitize tool names |
| Version checking | Command injection via `--version` | Allowlist of known safe flags, sanitize output |
| Custom validation scripts | Arbitrary code execution | Disable by default, require opt-in, sandbox if possible |
| Auto-fix commands | Privilege escalation | Never use `sudo`, warn about permissions |
| MCP config parsing | Path traversal | Validate paths, restrict to known config locations |

### Safe Defaults

- Read-only operations only in hook
- No automatic installations
- No sudo/elevated privileges
- Validate all user input against schema
- Fail closed: unknown config = error, don't guess

## Performance Targets

| Operation | Target | Rationale |
|-----------|--------|-----------|
| Hook execution (all checks) | <500ms | Keep Claude Code startup fast |
| CLI tool detection (single) | <50ms | Simple PATH check |
| MCP server detection (all) | <100ms | Parse one JSON file |
| Version check (single tool) | <200ms | Spawn process, parse output |
| Config parsing | <50ms | YAML parse is fast |

### Optimization Strategies

1. **Parallel checks:** Check all CLI tools simultaneously
2. **Cache results:** Store "last known good" for 5 minutes in hook
3. **Lazy version checking:** Only check versions if tool is found
4. **Skip optional checks on failure:** If required dep missing, skip optional to fail fast

## Sources

### Dependency Checking and Validation Tools
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/)
- [OWASP Dependency-Track Updates](https://www.reversinglabs.com/blog/owasp-dependency-track-update-key-changes-and-limitations-on-software-risk-management)
- [GitLab Dependency Scanning](https://docs.gitlab.com/user/application_security/dependency_scanning/)
- [Vulnerable Dependency Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Management_Cheat_Sheet.html)

### Doctor Commands and Diagnostic Tools
- [Flutter Doctor Command Guide](https://www.dhiwise.com/post/flutter-doctor-command-a-vital-tool-for-developers)
- [npm doctor command](https://www.geeksforgeeks.org/node-js/npm-doctor-command/)
- [Homebrew brew doctor](https://docs.brew.sh/Common-Issues)
- [Check if a Command Exists in Bash](https://www.baeldung.com/linux/bash-script-check-program-exists)

### MCP Server Discovery and Configuration
- [Model Context Protocol Roadmap](https://modelcontextprotocol.io/development/roadmap)
- [Azure MCP Server Discovery](https://learn.microsoft.com/en-us/azure/api-center/register-discover-mcp-server)
- [MCP Servers on GitHub](https://github.com/modelcontextprotocol/servers)
- [MCP Discovery Tools](https://github.com/liuyoshio/mcp-compass)
- [MCP .well-known Discovery Endpoint](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1960)

### Dependency Management Best Practices
- [Locking Versions (Gradle)](https://docs.gradle.org/current/userguide/dependency_locking.html)
- [Google Cloud Dependency Management Best Practices](https://cloud.google.com/blog/topics/developers-practitioners/best-practices-dependency-management)
- [Lockfile Format Design and Tradeoffs](https://nesbitt.io/2026/01/17/lockfile-format-design-and-tradeoffs.html)
- [npm Lock Files Best Practices](https://blog.inedo.com/npm/how-to-handle-npm-dependencies-with-lock-files)

### Configuration and Scope Management
- [Qodana Global Project Configuration](https://blog.jetbrains.com/qodana/2026/01/introducing-global-project-configuration-one-place-to-manage-all-your-qodana-rules/)
- [Visual Studio 2026 Configuration Scopes](https://learn.microsoft.com/en-us/visualstudio/releases/2026/release-notes)
- [Firebase Environment Configuration](https://firebase.google.com/docs/functions/config-env)

### Auto-Fix and Recovery
- [Ubuntu Auto-Install Dependencies](https://linuxsimply.com/linux-basics/package-management/dependencies/ubuntu-install-dependencies-automatically/)
- [Fix Broken Packages in Ubuntu](https://phoenixnap.com/kb/ubuntu-fix-broken-packages)

### Dry-Run and Simulation Features
- [Google Cloud VPC Service Controls Dry Run](https://docs.cloud.google.com/vpc-service-controls/docs/dry-run-mode)
- [Ansible Check Mode](https://docs.ansible.com/projects/ansible/2.9/user_guide/playbooks_checkmode.html)
- [dbt Dry Runs for Data Engineers](https://medium.com/towards-data-engineering/a-guide-to-dbt-dry-runs-safe-simulation-for-data-engineers-7e480ce5dcf7)
- [Backstage Dry Run Testing](https://backstage.io/docs/features/software-templates/dry-run-testing/)

### Continuous Monitoring and Validation
- [2026 Software Supply Chain Security Predictions](https://www.efficientlyconnected.com/2026-predictions-software-supply-chain-security-shifts-to-continuous-verification/)
- [Application Security Trends 2026](https://www.ox.security/blog/application-security-trends-in-2026/)
- [CI/CD Pipeline Monitoring Best Practices](https://www.splunk.com/en_us/blog/learn/monitoring-ci-cd.html)
- [Deepchecks Continuous ML Monitoring](https://github.com/deepchecks/monitoring)

---
*Feature research for: Anthropak CLI and MCP dependency checking extension*
*Researched: 2026-02-06*
