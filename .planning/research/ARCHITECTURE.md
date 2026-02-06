# Architecture Research

**Domain:** Claude Code dependency management tooling
**Researched:** 2026-02-06
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code Plugin                       │
├─────────────────────────────────────────────────────────────┤
│  dependencies.yaml  │  hook/anthropak.mjs  │  hooks.json    │
│  (declares deps)    │  (validates deps)    │  (hook config) │
└──────────┬──────────┴──────────┬───────────┴────────────────┘
           │                     │
           │                     └─────> Runtime Hook Execution
           │                             (reads config, checks registry)
           │
           └─> Development-Time Scaffolding
               (anthropak init/update)
```

**Current State (Plugin Dependencies Only):**

```
Plugin Load
    ↓
Hook Triggered (hooks.json)
    ↓
Read dependencies.yaml
    ↓
Validate Config (required[], optional[])
    ↓
Load installed_plugins.json
    ↓
Check Plugin Installations
    ↓
Output systemMessage (if missing)
```

**Extended State (Three Dependency Types):**

```
Plugin Load
    ↓
Hook Triggered
    ↓
Read dependencies.yaml
    ↓
Validate Config (plugins, cli_tools, mcp_servers)
    ↓
┌────────────┬─────────────┬──────────────┐
│ Check      │ Check       │ Check        │
│ Plugins    │ CLI Tools   │ MCP Servers  │
│ (registry) │ (which)     │ (.mcp.json)  │
└─────┬──────┴──────┬──────┴──────┬───────┘
      │             │              │
      └─────────────┴──────────────┘
                    ↓
      Format systemMessage (grouped by type)
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `dependencies.yaml` | Declarative dependency specification | YAML/JSON config file with `dependencies.{plugins,cli_tools,mcp_servers}.{required,optional}[]` |
| `hook/anthropak.mjs` | Runtime validation engine | Bundled ES module with zero runtime deps (only confbox bundled in) |
| `packages/hook` | Hook implementation source | TypeScript with config loader, validator, registry checker, output formatter |
| `packages/cli` | Scaffolding and management tool | TypeScript CLI with yargs commands (init, update) and template rendering |
| `.generated/` | Embedded build assets | Auto-generated TypeScript files containing version, templates, hook script |
| `scripts/build-assets.ts` | Asset embedding pipeline | Prebuild script that reads hook output and generates embeddable constants |

## Recommended Project Structure

**Current Structure:**
```
packages/
├── hook/                   # Runtime checker (zero deps)
│   ├── src/
│   │   ├── index.ts        # Entry point (IIFE with try/catch)
│   │   ├── types.ts        # Type definitions
│   │   └── lib/
│   │       ├── config.ts   # YAML/JSON loader + validator
│   │       ├── registry.ts # Plugin installation checker
│   │       ├── output.ts   # Markdown formatter
│   │       ├── io.ts       # Stdin reader, env vars
│   │       ├── constants.ts # Paths, defaults
│   │       └── utils.ts    # JSON parse helper
│   ├── dist/
│   │   └── anthropak.mjs   # Single bundled file (embedded in CLI)
│   └── package.json        # confbox dependency only
│
├── cli/                    # User-facing tool
│   ├── src/
│   │   ├── cli.ts          # Entry point (#!/usr/bin/env node)
│   │   ├── commands/
│   │   │   ├── init.ts     # Scaffold dependencies.yaml, hook, hooks.json
│   │   │   ├── update.ts   # Update hook script to latest
│   │   │   └── default.ts  # Help/version
│   │   ├── lib/
│   │   │   ├── templates.ts # Template renderer + hook getter
│   │   │   └── hooks.ts     # hooks.json parser/writer
│   │   ├── templates/
│   │   │   └── dependencies.yaml.liquid # Template for init
│   │   ├── scripts/
│   │   │   └── build-assets.ts # Prebuild: embed hook + templates
│   │   └── .generated/      # Auto-generated (never edit)
│   │       ├── hook.ts      # export const HOOK_SCRIPT = "..."
│   │       ├── template.ts  # export const DEPENDENCIES_TEMPLATE = "..."
│   │       └── version.ts   # export const VERSION = "..."
│   ├── dist/
│   │   └── cli.js          # Bundled CLI
│   └── package.json        # @clack/prompts, yargs, liquidjs
│
└── turbo.json              # Build order: hook → CLI
```

### Structure Rationale

- **`packages/hook/` builds first:** CLI embeds hook output, so hook must complete before CLI prebuild step
- **`.generated/` isolation:** Prevents accidental edits to auto-generated files; clear boundary between source and generated code
- **Single bundled hook:** `dist/anthropak.mjs` has zero external deps; can run in Claude Code's sandbox without node_modules
- **Template-driven scaffolding:** CLI renders `dependencies.yaml` from template; can evolve schema without rewriting CLI logic
- **Monorepo with turbo:** Enforces build order; CLI's `build: { dependsOn: ["^build"] }` ensures hook finishes first

## Architectural Patterns

### Pattern 1: Schema Evolution for Three Dependency Types

**What:** Extend `dependencies.yaml` schema to support plugins, cli_tools, and mcp_servers as sibling keys under `dependencies`.

**Current Schema:**
```yaml
dependencies:
  required:
    - plugin: "example"
      marketplace: "official"
      description: "..."
  optional:
    - plugin: "another"
```

**Extended Schema (Proposed):**
```yaml
dependencies:
  plugins:
    required:
      - plugin: "example"
        marketplace: "official"
        description: "..."
    optional:
      - plugin: "another"

  cli_tools:
    required:
      - name: "git"
        description: "Version control"
        install: "See git-scm.com"
    optional:
      - name: "jq"
        description: "JSON processor"
        install: "brew install jq"

  mcp_servers:
    required:
      - server: "filesystem"
        description: "File operations"
        install: "claude mcp add filesystem"
    optional:
      - server: "github"
```

**Trade-offs:**
- **Pro:** Clear namespace separation; no ambiguity about dependency type
- **Pro:** Each type can have type-specific fields (e.g., `marketplace` for plugins, no version for CLI tools)
- **Pro:** Backward compatible if we support both flat `required`/`optional` (legacy) and nested structure
- **Con:** More verbose; deeper nesting
- **Con:** Breaking change if not handled gracefully

**Migration Strategy:**
- Hook detects flat `dependencies.required` → treats as plugin dependencies (backward compat)
- Hook detects `dependencies.plugins` → uses new structure
- CLI's template generates new structure by default
- Hook emits deprecation warning if flat structure detected

### Pattern 2: Checker Abstraction

**What:** Extract common "check if dependency is satisfied" logic into pluggable checker modules.

**Current Implementation:**
```typescript
// Hook index.ts (monolithic)
const missingRequired = deps.required.filter(dep => {
  return !isPluginInstalled(installedPlugins, dep.plugin, dep.marketplace, PROJECT_DIR);
});
```

**Proposed Implementation:**
```typescript
// packages/hook/src/lib/checkers/base.ts
export interface DependencyChecker<T> {
  check(dep: T): Promise<CheckResult>;
}

export interface CheckResult {
  satisfied: boolean;
  details?: string; // Why missing
}

// packages/hook/src/lib/checkers/plugin.ts
export class PluginChecker implements DependencyChecker<PluginDependency> {
  constructor(
    private registry: InstalledPluginsRegistry,
    private projectDir: string
  ) {}

  async check(dep: PluginDependency): Promise<CheckResult> {
    const installed = isPluginInstalled(
      this.registry,
      dep.plugin,
      dep.marketplace,
      this.projectDir
    );
    return {
      satisfied: installed,
      details: installed ? undefined : `Not found in registry`
    };
  }
}

// packages/hook/src/lib/checkers/cli.ts
export class CliToolChecker implements DependencyChecker<CliToolDependency> {
  async check(dep: CliToolDependency): Promise<CheckResult> {
    const found = await checkCliTool(dep.name); // which/command -v
    return {
      satisfied: found,
      details: found ? undefined : `Not found in PATH`
    };
  }
}

// packages/hook/src/lib/checkers/mcp.ts
export class McpServerChecker implements DependencyChecker<McpServerDependency> {
  constructor(private mcpConfig: McpConfig) {}

  async check(dep: McpServerDependency): Promise<CheckResult> {
    const registered = this.mcpConfig.servers.includes(dep.server);
    return {
      satisfied: registered,
      details: registered ? undefined : `Not registered in .mcp.json or settings`
    };
  }
}

// Hook index.ts (orchestrator)
const pluginChecker = new PluginChecker(registry, PROJECT_DIR);
const cliChecker = new CliToolChecker();
const mcpChecker = new McpServerChecker(mcpConfig);

const missing = {
  plugins: await checkDependencies(deps.plugins, pluginChecker),
  cli_tools: await checkDependencies(deps.cli_tools, cliChecker),
  mcp_servers: await checkDependencies(deps.mcp_servers, mcpChecker),
};
```

**Trade-offs:**
- **Pro:** Clean separation of concerns; each checker owns one type
- **Pro:** Easy to test checkers in isolation
- **Pro:** Easy to add new dependency types (just implement DependencyChecker)
- **Con:** More files/complexity for current simple case
- **Con:** Async checker interface requires awaiting (CLI tool check via child_process)

**When to use:** Adopt once extending to CLI tools/MCP servers; overkill for plugins-only.

### Pattern 3: Output Formatting with Type-Specific Sections

**What:** Group missing dependencies by type in systemMessage output.

**Current Output (Plugin-Only):**
```markdown
**Missing Required Plugin Dependencies**
- **example-plugin** - Description here
  `claude plugin add example-plugin --marketplace official`

**Missing Optional Plugin Dependencies**
- **another-plugin**
  `claude plugin add another-plugin`
```

**Proposed Output (Multi-Type):**
```markdown
**Missing Required Dependencies**

Plugins:
- **example-plugin** - Description here
  `claude plugin add example-plugin --marketplace official`

CLI Tools:
- **git** - Version control required
  Install: See git-scm.com

MCP Servers:
- **filesystem** - File operations
  `claude mcp add filesystem`

**Missing Optional Dependencies**

Plugins:
- **another-plugin**
  `claude plugin add another-plugin`

CLI Tools:
- **jq** - JSON processor for debugging
  Install: brew install jq
```

**Trade-offs:**
- **Pro:** Clear categorization; user knows exactly what type is missing
- **Pro:** Type-specific install guidance (plugins use `claude plugin add`, CLI tools use custom install, MCP uses `claude mcp add`)
- **Pro:** Extensible to future types
- **Con:** Longer output if many types missing
- **Con:** More complex formatter logic

**Implementation:**
```typescript
export function formatMissingDeps(
  missing: MissingDependencies,
  severity: "required" | "optional"
): string[] {
  const lines: string[] = [];
  const header = severity === "required"
    ? "**Missing Required Dependencies**"
    : "**Missing Optional Dependencies**";

  lines.push(header, "");

  if (missing.plugins.length > 0) {
    lines.push("Plugins:");
    for (const dep of missing.plugins) {
      lines.push(`- **${dep.plugin}**${dep.description ? ` - ${dep.description}` : ""}`);
      lines.push(`  \`${getPluginInstallCommand(dep)}\``);
    }
    lines.push("");
  }

  if (missing.cli_tools.length > 0) {
    lines.push("CLI Tools:");
    for (const dep of missing.cli_tools) {
      lines.push(`- **${dep.name}**${dep.description ? ` - ${dep.description}` : ""}`);
      lines.push(`  Install: ${dep.install || "See tool documentation"}`);
    }
    lines.push("");
  }

  if (missing.mcp_servers.length > 0) {
    lines.push("MCP Servers:");
    for (const dep of missing.mcp_servers) {
      lines.push(`- **${dep.server}**${dep.description ? ` - ${dep.description}` : ""}`);
      lines.push(`  \`${getMcpInstallCommand(dep)}\``);
    }
    lines.push("");
  }

  return lines;
}
```

## Data Flow

### Request Flow (Plugin Load)

```
1. Claude Code loads plugin from directory
   ↓
2. Claude Code reads hooks.json → finds anthropak hook entry
   ↓
3. Claude Code executes: node ${CLAUDE_PLUGIN_ROOT}/hook/anthropak.mjs
   Environment: CLAUDE_PLUGIN_ROOT, CLAUDE_PROJECT_DIR set
   ↓
4. Hook reads stdin (plugin context JSON from Claude)
   ↓
5. Hook discovers dependencies.{yaml,yml,json,jsonc} in PLUGIN_ROOT
   ↓
6. Hook parses config with confbox (YAML/JSON/JSONC support)
   ↓
7. Hook validates config structure:
   - dependencies object exists
   - plugins/cli_tools/mcp_servers are valid structures
   - Each dependency has required fields
   ↓
8. Hook loads verification sources:
   - Plugins: ~/.claude/plugins/installed_plugins.json
   - CLI Tools: PATH (via which/command -v)
   - MCP Servers: ~/.claude/.mcp.json + project .mcp.json
   ↓
9. Hook runs checkers for each dependency type
   ↓
10. Hook formats missing dependencies (grouped by type + severity)
    ↓
11. Hook outputs JSON to stdout: { systemMessage?: string }
    ↓
12. Claude Code displays systemMessage to user (if present)
```

### CLI Initialization Flow

```
1. User runs: anthropak init [path]
   ↓
2. CLI prompts for confirmation via @clack/prompts
   ↓
3. CLI creates hook/ directory (if missing)
   ↓
4. CLI renders dependencies.yaml from embedded template (liquidjs)
   Template includes examples for all three dependency types
   ↓
5. CLI writes hook/anthropak.mjs from embedded HOOK_SCRIPT constant
   Embedded script is output of packages/hook build
   ↓
6. CLI reads/parses hooks.json (if exists)
   ↓
7. CLI adds anthropak hook entry if not present:
   {
     "type": "command",
     "command": "node ${CLAUDE_PLUGIN_ROOT}/hook/anthropak.mjs",
     "timeout": 5
   }
   ↓
8. CLI writes updated hooks.json
   ↓
9. CLI displays success + next steps
```

### Config Validation Flow (Extended)

```
1. Load raw config from dependencies.{yaml,yml,json,jsonc}
   ↓
2. Check root structure:
   - Has dependencies object?
   - Is it an object (not array/string)?
   ↓
3. Detect schema version:
   - Has dependencies.plugins? → New schema
   - Has dependencies.required (flat)? → Legacy schema
   - Has neither? → Empty config (valid)
   ↓
4. For each dependency type (plugins, cli_tools, mcp_servers):
   - Check required/optional arrays exist and are arrays
   - Validate each dependency object:
     * Plugins: has plugin string, optional marketplace/github/description/install
     * CLI Tools: has name string, optional description/install
     * MCP Servers: has server string, optional description/install
   ↓
5. Collect validation errors (don't fail fast)
   ↓
6. Return ValidationResult:
   - valid: true + parsed dependencies
   - valid: false + error messages
```

### Registry Checking Flow (Per Type)

**Plugin Check:**
```
1. Load ~/.claude/plugins/installed_plugins.json
   Structure: { plugins: { "plugin@marketplace": [{ scope, projectPath }] } }
   ↓
2. For dependency with marketplace:
   - Look for exact "plugin@marketplace" key
   - Check installations for global OR project-scoped covering PROJECT_DIR
   ↓
3. For dependency without marketplace:
   - Look for any "plugin@*" key
   - Check installations for coverage
   ↓
4. Return satisfied: true/false
```

**CLI Tool Check:**
```
1. Construct check command:
   Unix/Mac: command -v <name>
   Windows: where <name>
   ↓
2. Execute via child_process.exec with timeout
   ↓
3. Return satisfied: exit code 0 (found) vs non-zero (missing)
```

**MCP Server Check:**
```
1. Load MCP configs (priority order):
   - Project .mcp.json (if in PROJECT_DIR)
   - Global ~/.claude/.mcp.json
   ↓
2. Parse JSON config:
   Structure: { mcpServers: { "server-name": { ... } } }
   ↓
3. Check if dependency.server exists in mcpServers keys
   ↓
4. Return satisfied: true (key exists) / false (not registered)
```

### State Management

**Configuration State:**
- Location: `dependencies.yaml` in plugin root
- Mutable by: Plugin developers (manual editing)
- Read by: Hook at plugin load time
- Schema: Declarative YAML/JSON with three sections (plugins, cli_tools, mcp_servers)
- Versioning: No explicit version field; hook detects schema by structure

**Registry State (Plugins):**
- Location: `~/.claude/plugins/installed_plugins.json`
- Mutable by: Claude Code (plugin install/uninstall commands)
- Read by: Hook (read-only)
- Format: `{ plugins: { "plugin@marketplace": [{ scope, projectPath }] } }`

**MCP Registry State:**
- Locations:
  - Global: `~/.claude/.mcp.json`
  - Project: `<PROJECT_DIR>/.mcp.json`
- Mutable by: Claude Code (mcp add/remove commands) or manual editing
- Read by: Hook (read-only)
- Format: `{ mcpServers: { "server-name": { command, args, env?, ... } } }`
- Priority: Project config overrides global

**Build Assets State:**
- Location: `packages/cli/src/.generated/`
- Mutable by: `scripts/build-assets.ts` prebuild script only
- Read by: CLI commands (import constants)
- Contents:
  - `hook.ts`: `export const HOOK_SCRIPT = "..."`
  - `template.ts`: `export const DEPENDENCIES_TEMPLATE = "..."`
  - `version.ts`: `export const VERSION = "x.y.z"`
- Lifecycle: Regenerated on every CLI build; never committed (in .gitignore)

## Key Abstractions

### Dependency Types (New)

**PluginDependency:**
```typescript
interface PluginDependency {
  plugin: string;         // Required: plugin identifier
  marketplace?: string;   // Optional: exact marketplace match
  github?: string;        // Optional: owner/repo for GitHub plugins
  description?: string;   // Optional: human-readable description
  install?: string;       // Optional: custom install command
}
```

**CliToolDependency (Proposed):**
```typescript
interface CliToolDependency {
  name: string;           // Required: CLI command name (e.g., "git", "jq")
  description?: string;   // Optional: what this tool is for
  install?: string;       // Optional: install guidance (e.g., "brew install git")
}
```

**McpServerDependency (Proposed):**
```typescript
interface McpServerDependency {
  server: string;         // Required: MCP server name (matches mcpServers key)
  description?: string;   // Optional: what this server provides
  install?: string;       // Optional: custom install command (default: claude mcp add <server>)
}
```

### ParsedDependencies (Extended)

**Current:**
```typescript
interface ParsedDependencies {
  required: PluginDependency[];
  optional: PluginDependency[];
}
```

**Proposed:**
```typescript
interface ParsedDependencies {
  plugins: {
    required: PluginDependency[];
    optional: PluginDependency[];
  };
  cli_tools: {
    required: CliToolDependency[];
    optional: CliToolDependency[];
  };
  mcp_servers: {
    required: McpServerDependency[];
    optional: McpServerDependency[];
  };
}
```

### ValidationResult

**Purpose:** Type-safe representation of config validation outcome

**Current (Unchanged):**
```typescript
interface ValidationResult {
  valid: boolean;          // Discriminator: true → data exists, false → errors exist
  errors: string[];        // Validation error messages
  data?: ParsedDependencies; // Only present if valid === true
}
```

**Usage Pattern:**
```typescript
const validation = validateConfig(rawConfig);
if (!validation.valid || !validation.data) {
  // Handle errors (hook outputs empty JSON)
  return;
}
// Safe to use validation.data (TypeScript narrows type)
```

### MissingDependencies (New)

**Purpose:** Structured representation of missing dependencies grouped by type and severity

```typescript
interface MissingDependencies {
  required: {
    plugins: PluginDependency[];
    cli_tools: CliToolDependency[];
    mcp_servers: McpServerDependency[];
  };
  optional: {
    plugins: PluginDependency[];
    cli_tools: CliToolDependency[];
    mcp_servers: McpServerDependency[];
  };
}
```

**Usage:**
```typescript
const missing = await checkAllDependencies(deps);

// Check if any required deps missing
const hasRequiredMissing =
  missing.required.plugins.length > 0 ||
  missing.required.cli_tools.length > 0 ||
  missing.required.mcp_servers.length > 0;

// Format output
const messages = formatMissingDeps(missing);
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Claude Code Plugin System | Hook execution via hooks.json command | Hook receives stdin with plugin context; must output valid JSON |
| Claude Code Plugin Registry | Read `~/.claude/plugins/installed_plugins.json` | File path is hardcoded; no API available |
| System PATH | Execute `command -v <name>` (Unix) or `where <name>` (Windows) | CLI tool presence check; no version validation |
| MCP Config Files | Read `~/.claude/.mcp.json` and `<project>/.mcp.json` | JSON files with `mcpServers` object; project overrides global |
| confbox | Parse YAML/JSON/JSONC config files | Bundled into hook; zero runtime deps otherwise |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Hook ↔ CLI | Embedded asset (HOOK_SCRIPT) | CLI builds after hook; embeds hook output in .generated/ files |
| Hook ↔ Config | File read + parse | Hook discovers first matching dependencies.{yaml,yml,json,jsonc} |
| Hook ↔ Registries | File read (plugins, MCP) + exec (CLI tools) | All read-only from hook perspective |
| CLI ↔ User | Interactive prompts (@clack/prompts) | Init/update commands use prompts for confirmation |
| Build ↔ Packages | Turborepo dependency graph | `hook` builds before `cli` via turbo.json dependsOn |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-5 plugins | Current monolithic hook is fine; no abstraction needed |
| 5-20 plugins + CLI tools | Extract checker abstraction (PluginChecker, CliToolChecker); keep flat file structure |
| 20+ dependencies across all types | Consider dependency graph analysis (detect circular deps, suggest install order); add caching for registry reads |

### Scaling Priorities

1. **First bottleneck:** Hook execution time if 20+ dependencies
   - **Fix:** Cache registry loads (plugins, MCP) in hook memory; don't re-read for each dependency
   - **Fix:** Parallelize CLI tool checks with Promise.all (independent checks)

2. **Second bottleneck:** Template complexity if 10+ dependency type-specific fields
   - **Fix:** Move template examples to external docs; generate minimal starter template
   - **Fix:** Add `anthropak add <type> <name>` command to edit dependencies.yaml programmatically

## Anti-Patterns

### Anti-Pattern 1: Version Checking for CLI Tools

**What people might do:** Add semver version requirements to CLI tool dependencies and check installed versions.

**Why it's wrong:**
- Requires parsing version output (inconsistent formats across tools)
- Breaks "just check presence" simplicity
- Most plugins just need tool to exist, not specific version
- Version mismatches rarely cause runtime failures (unlike plugin API incompatibilities)

**Do this instead:**
- Document minimum version in description field
- Trust users to manage tool versions
- If version truly matters, use custom install command to document requirement

### Anti-Pattern 2: Flattening All Dependencies Into One Array

**What people might do:** Keep single `dependencies.required[]` array with type discriminator:
```yaml
dependencies:
  required:
    - type: plugin
      plugin: example
    - type: cli_tool
      name: git
    - type: mcp_server
      server: filesystem
```

**Why it's wrong:**
- Type discriminator makes validation complex (must check type, then validate fields)
- Harder to extend with type-specific fields (plugins have marketplace, CLI tools don't)
- Confusing mental model (plugins have "plugin", CLI tools have "name", MCP has "server")
- Template becomes harder to document (examples must show all types intermixed)

**Do this instead:**
- Separate top-level keys: `dependencies.plugins`, `dependencies.cli_tools`, `dependencies.mcp_servers`
- Each section has its own `required`/`optional` arrays
- Type-specific fields are clear (no discriminator needed)
- Template can show clean examples per type

### Anti-Pattern 3: Running Checkers Synchronously in Sequence

**What people might do:**
```typescript
for (const dep of deps.cli_tools.required) {
  const result = await checkCliTool(dep.name); // Await each check sequentially
  if (!result.satisfied) {
    missing.push(dep);
  }
}
```

**Why it's wrong:**
- CLI tool checks via child_process are I/O-bound
- Checking 5 tools sequentially = 5x latency
- Hook timeout is 5 seconds; sequential checks may exceed timeout

**Do this instead:**
```typescript
const checks = deps.cli_tools.required.map(dep =>
  checkCliTool(dep.name).then(result => ({ dep, result }))
);
const results = await Promise.all(checks);
const missing = results
  .filter(r => !r.result.satisfied)
  .map(r => r.dep);
```
- Parallel execution reduces total latency
- Hook completes faster; less likely to timeout

### Anti-Pattern 4: Hook Throws Errors on Invalid Config

**What people might do:** Let validation errors propagate as exceptions.

**Why it's wrong:**
- Hook crashes → Claude Code displays error to user
- Bad UX: cryptic error instead of helpful message
- Violates hook contract: must always output valid JSON

**Do this instead:**
- Wrap entire hook in try/catch
- On validation error: output empty JSON `{}`
- On missing deps: output `{ systemMessage: "..." }`
- Never crash; graceful degradation

## Build Order Implications

### Current Build Flow

```
1. pnpm install (root + all packages)
   ↓
2. turbo build (orchestrates package builds)
   ↓
3. packages/hook/build runs:
   - tsdown bundles src/ → dist/anthropak.mjs
   - Zero external deps in output (confbox bundled in)
   ↓
4. packages/cli/prebuild runs (scripts/build-assets.ts):
   - Reads ../hook/dist/anthropak.mjs
   - Reads templates/dependencies.yaml.liquid
   - Reads package.json version
   - Generates src/.generated/{hook,template,version}.ts
   - Exits with error if hook missing → halts build
   ↓
5. packages/cli/build runs:
   - tsdown bundles src/ → dist/cli.js
   - Imports .generated/ constants (hook script embedded)
```

### Implications for CLI Tool + MCP Server Additions

**No build order changes needed:**
- Hook package evolves (new types, checkers, validators)
- Hook output still goes to `dist/anthropak.mjs`
- CLI prebuild still embeds hook output
- Template evolves (examples for new types)
- No new packages or build steps required

**Key constraint:**
- Hook must build successfully before CLI prebuild runs
- If hook build fails (TS errors, bundling issues), CLI build blocked
- This is good: ensures CLI always embeds working hook

### Suggested Build Order for Development

**When extending hook:**
1. Update types (PluginDependency → CliToolDependency, McpServerDependency)
2. Update validation logic (validateConfig supports new types)
3. Add checkers (CliToolChecker, McpServerChecker)
4. Update output formatter (formatMissingDeps groups by type)
5. Test hook in isolation: `pnpm --filter @anthropak/hook build && node dist/anthropak.mjs`
6. Once hook works, update CLI template (dependencies.yaml.liquid examples)
7. Rebuild CLI: `pnpm --filter anthropak build` (embeds new hook + template)

**When testing end-to-end:**
1. Build all: `pnpm build` (turbo handles order)
2. Run CLI: `./packages/cli/dist/cli.js init test-plugin`
3. Edit `test-plugin/dependencies.yaml` (add test dependencies)
4. Run hook manually: `cd test-plugin && node hook/anthropak.mjs` (pipe sample stdin)
5. Verify systemMessage output

## Component Boundaries

### What Talks to What

```
Developer
    ↓ (runs command)
CLI (anthropak init/update)
    ↓ (writes files)
Plugin Directory (dependencies.yaml, hook/anthropak.mjs, hooks.json)
    ↓ (loaded by)
Claude Code Plugin System
    ↓ (executes hook)
Hook (anthropak.mjs)
    ↓ (reads)
┌──────────────┬──────────────────┬─────────────┐
│ dependencies │ Plugin Registry  │ MCP Config  │
│ .yaml        │ (installed_      │ (.mcp.json) │
│              │  plugins.json)   │             │
└──────────────┴──────────────────┴─────────────┘
    ↓ (checks CLI tools)
System PATH (command -v)
    ↓ (outputs)
systemMessage → Claude Code → User
```

**Boundary Rules:**
- Hook never writes files (read-only)
- Hook never calls external APIs (only reads local files + executes local commands)
- CLI never executes hook (only embeds hook script as data)
- Hook and CLI share types (via TypeScript) but never call each other's functions

### Data Flow Direction

**Unidirectional (Read-Only):**
- Hook → Config files (dependencies.yaml)
- Hook → Plugin registry (installed_plugins.json)
- Hook → MCP config (.mcp.json)
- Hook → System PATH (command -v)

**Unidirectional (Write-Only):**
- CLI → Plugin directory (creates/updates files)
- Build script → .generated/ (regenerates constants)

**Bidirectional (None):**
- No components have bidirectional communication
- All data flow is unidirectional (read or write, never both)

## Sources

- **Existing Codebase (HIGH confidence):**
  - `/packages/hook/src/types.ts` — Current type definitions
  - `/packages/hook/src/index.ts` — Hook execution flow
  - `/packages/hook/src/lib/config.ts` — Validation logic
  - `/packages/hook/src/lib/registry.ts` — Plugin installation checker
  - `/packages/hook/src/lib/output.ts` — Markdown formatter
  - `/packages/cli/src/commands/{init,update}.ts` — CLI scaffolding
  - `/packages/cli/scripts/build-assets.ts` — Asset embedding
  - `/.planning/codebase/ARCHITECTURE.md` — Existing architecture analysis

- **Claude Code Behavior (MEDIUM confidence, inferred from code):**
  - Hook receives stdin with plugin context (readStdin function exists)
  - Plugin registry at `~/.claude/plugins/installed_plugins.json` (hardcoded path)
  - MCP config files expected at `~/.claude/.mcp.json` and project `.mcp.json` (standard MCP config locations)
  - Environment variables: `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PROJECT_DIR` (used in constants.ts)

---

*Architecture research for: Claude Code dependency management tooling*
*Researched: 2026-02-06*
