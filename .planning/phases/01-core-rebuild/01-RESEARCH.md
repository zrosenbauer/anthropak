# Phase 1: Core Rebuild - Research

**Researched:** 2026-02-06
**Domain:** TypeScript library development, CLI tooling, pattern matching, async error handling
**Confidence:** HIGH

## Summary

Phase 1 rebuilds the hook and CLI from scratch using modern TypeScript patterns: ts-pattern for all control flow, es-toolkit's attemptAsync for async error handling, and es-toolkit utilities replacing custom code. The new nested schema (plugins/cli/mcp with version field) supports three ecosystems but only implements plugin detection in this phase.

The standard stack is well-established: ts-pattern (v5.x) for exhaustive pattern matching, es-toolkit (v1.44+) for utilities and attemptAsync error handling, confbox (v0.2.x) for multi-format config parsing, and @clack/prompts (v1.0) for beautiful CLI confirmations. These libraries prioritize TypeScript-first design, zero dependencies, and excellent type inference.

Key architectural decisions from CONTEXT.md drive implementation: the hook must never crash (always valid JSON or empty object), the CLI must confirm before filesystem mutations, and the schema supports .yaml/.yml/.json/.jsonc extensions with plugins-only detection in Phase 1.

**Primary recommendation:** Use ts-pattern's .exhaustive() method for all control flow paths, wrap every async operation in attemptAsync for consistent [error, data] tuples, and validate the new nested schema structure manually (Zod deferred for now given greenfield status and performance considerations).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Schema shape:**
- Top-level `version: 1` field (schema format version, not dependency version)
- Three ecosystem sections: `plugins`, `cli`, `mcp` (short names, not `cli_tools`/`mcp_servers`)
- All sections optional, but **at least one must be present** (can't have version-only config)
- Each section has `required[]` and `optional[]` arrays
- Plugin entry fields: `plugin` (required), `github`, `install`, `description` (all optional) — `marketplace` field dropped
- Supports `.yaml`, `.yml`, `.json`, `.jsonc` file extensions (carry forward from current)

**Missing dependency messages:**
- Empty object `{}` when everything is installed — completely silent
- Exact install command shown (not docs links) — e.g., `claude plugin add --git git@github.com:owner/repo.git`
- Descriptive format: name + description + install command per missing dep

**CLI init experience:**
- Scaffold only — create empty config files, no interactive wizard for declaring deps
- Two modes: **plugin** (distributed plugin declaring deps) and **repo** (any codebase ensuring contributors have right tools)
- Auto-detect mode (check for plugin markers like existing hooks.json), then confirm with user
- Both modes use hooks.json for hook triggering
- Same dependencies.yaml schema for both modes — hook doesn't care about the mode
- Summary + confirm before writing files: show list of files to be created/modified, then "Proceed? (y/N)"

**Error behavior:**
- Malformed config: warn in systemMessage (generic message like "dependencies.yaml has errors — run `anthropak validate` to see details")
- No config file: hint in systemMessage ("No dependencies.yaml found — run `anthropak init` to set up")
- CLI commands (`init`, `update`): more verbose errors with detailed suggestions — interactive context allows it
- Hook never crashes — always outputs valid JSON

### Claude's Discretion

- Dependency message grouping strategy (by type first vs required/optional first)
- CLI framework choice (yargs, citty, or other)
- Detection heuristics for plugin vs repo mode during init
- Exact prompt library (@clack/prompts or alternative)
- Loading/progress UX in CLI

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| [ts-pattern](https://github.com/gvergnaud/ts-pattern) | ^5.5.0 | Pattern matching, exhaustive control flow | De facto standard for TypeScript pattern matching, 11K+ stars, exhaustiveness checking, smart type inference |
| [es-toolkit](https://es-toolkit.dev/) | ^1.44.0 | Utilities, attemptAsync error handling | Modern lodash replacement, 2-3x faster, 97% smaller bundle, 100% test coverage, attemptAsync for Go/Rust-style errors |
| [confbox](https://github.com/unjs/confbox) | ^0.2.2 | YAML/JSON/JSONC parsing | Zero dependencies, tree-shakable, supports all required formats, UnJS ecosystem quality |
| [@clack/prompts](https://www.clack.cc/) | ^1.0.0 | CLI user prompts and confirmations | Beautiful UX, 2.5M weekly downloads, simple async/await API, used by major tools |
| [tsdown](https://tsdown.dev/) | ^0.9.3 | TypeScript bundler for libraries | Elegant, zero-config defaults, proper .d.ts generation, modern isolated-declarations support |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| [yargs](https://www.npmjs.com/package/yargs) | ^17.7.2 | CLI argument parsing | Already in use, mature, extensive ecosystem — replace in future if needed |
| [@types/node](https://www.npmjs.com/package/@types/node) | ^24.10.10 | Node.js TypeScript types | All file system operations, path handling |
| [turborepo](https://turbo.build/repo) | ^2.4.4 | Monorepo build orchestration | Already configured, handles build order dependency (hook → CLI) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| yargs | [citty](https://github.com/unjs/citty) or [optique](https://github.com/geut/optique) | Citty: cleaner TypeScript types but smaller ecosystem. Optique: composition-based, excellent type safety, but newer/less proven. Keep yargs for now (works, stable), revisit post-v1. |
| @clack/prompts | [@inquirer/prompts](https://www.npmjs.com/package/@inquirer/prompts) | Inquirer has larger community, more docs, but clack has better UX/design and simpler API. Stick with clack. |
| Manual validation | [Zod](https://zod.dev/) | Zod v4 is 14x faster than v3, excellent DX, but adds dependency and complexity. For greenfield with simple schema, manual validation sufficient for now. Consider Zod if schema grows in Phase 2/3. |
| confbox | [yaml](https://www.npmjs.com/package/yaml) | yaml package more feature-rich but larger. confbox's zero-dep, multi-format support fits better. |

**Installation:**
```bash
pnpm add ts-pattern es-toolkit confbox @clack/prompts
pnpm add -D tsdown @types/node
```

## Architecture Patterns

### Recommended Project Structure

Current monorepo structure already solid, maintain it:

```
packages/
├── hook/                # @anthropak/hook - runs inside Claude Code
│   ├── src/
│   │   ├── index.ts            # Entry point with attemptAsync wrapper
│   │   ├── types.ts            # Shared types for new schema
│   │   ├── lib/
│   │   │   ├── config.ts       # Load/validate dependencies.yaml (ts-pattern)
│   │   │   ├── registry.ts     # Check installed_plugins.json
│   │   │   ├── output.ts       # Format systemMessage
│   │   │   └── constants.ts    # File names, defaults
│   │   └── checkers/
│   │       └── plugins.ts      # Plugin detection logic (Phase 1 only)
│   └── dist/
│       └── anthropak.mjs       # Single bundled output
│
└── cli/                 # anthropak - user-facing CLI tool
    ├── src/
    │   ├── cli.ts              # Entry point, yargs setup
    │   ├── types.ts            # Shared types (sync with hook/types.ts)
    │   ├── commands/
    │   │   ├── init.ts         # Scaffold config/hook/hooks.json
    │   │   ├── update.ts       # Update hook script
    │   │   └── validate.ts     # NEW: verbose config validation
    │   ├── lib/
    │   │   ├── templates.ts    # Config/hook templates
    │   │   ├── hooks.ts        # hooks.json manipulation
    │   │   └── fs.ts           # File system helpers with attemptAsync
    │   └── .generated/         # Auto-gen from hook build
    │       └── assets.ts       # Embedded templates, version
    └── scripts/
        └── build-assets.ts     # Prebuild step
```

### Pattern 1: attemptAsync Everywhere

**What:** Wrap every async operation in es-toolkit's attemptAsync for consistent error handling
**When to use:** ALL async operations (file reads, file writes, parsing, registry checks)
**Example:**
```typescript
// Source: https://es-toolkit.dev/reference/util/attemptAsync.html
import { attemptAsync } from 'es-toolkit';

// File read
const [readError, content] = await attemptAsync(async () => {
  return await fs.readFile(path, 'utf8');
});

if (readError) {
  // Handle error - hook: return {}, CLI: log detailed message
  return {};
}

// File write with confirmation
const [writeError] = await attemptAsync(async () => {
  await fs.writeFile(path, content);
});

if (writeError) {
  console.error(`Failed to write ${path}: ${writeError.message}`);
  process.exit(1);
}
```

**Key advantage:** Returns `[error, data]` tuples like Go/Rust, eliminates try-catch blocks entirely, consistent pattern across entire codebase.

### Pattern 2: ts-pattern for All Control Flow

**What:** Use match() and .with() for all conditionals, .exhaustive() to enforce completeness
**When to use:** Config validation, ecosystem type checking, error handling branches, state management
**Example:**
```typescript
// Source: https://github.com/gvergnaud/ts-pattern
import { match, P } from 'ts-pattern';

type ConfigLoadResult =
  | { status: 'success'; config: Config }
  | { status: 'not_found' }
  | { status: 'parse_error'; error: Error }
  | { status: 'validation_error'; errors: string[] };

const response = match(loadResult)
  .with({ status: 'success' }, ({ config }) => {
    // Process valid config
    return checkDependencies(config);
  })
  .with({ status: 'not_found' }, () => {
    // Hook: hint message, CLI: detailed instructions
    return { systemMessage: "No dependencies.yaml found — run `anthropak init` to set up" };
  })
  .with({ status: 'parse_error' }, ({ error }) => {
    // Hook: generic warning, CLI: show parse error
    return { systemMessage: "dependencies.yaml has errors — run `anthropak validate` to see details" };
  })
  .with({ status: 'validation_error' }, ({ errors }) => {
    // Hook: generic warning, CLI: list all errors
    return { systemMessage: "dependencies.yaml has errors — run `anthropak validate` to see details" };
  })
  .exhaustive(); // TypeScript enforces all cases handled
```

**Key advantage:** Exhaustiveness checking catches missing cases at compile time, eliminates nested if/else and ternaries, type narrowing within each branch.

### Pattern 3: Discriminated Unions for Schema

**What:** Use discriminated unions with literal type discriminators for schema sections
**When to use:** Representing ecosystem types, validation results, hook responses
**Example:**
```typescript
// New schema structure from CONTEXT.md
interface DependenciesConfig {
  version: 1; // Schema version, literal type
  plugins?: EcosystemSection;
  cli?: EcosystemSection;
  mcp?: EcosystemSection;
}

interface EcosystemSection {
  required: DependencyEntry[];
  optional: DependencyEntry[];
}

// Plugin entry (marketplace field DROPPED per CONTEXT.md)
interface PluginDependency {
  plugin: string; // Required
  github?: string;
  install?: string;
  description?: string;
}

// Validation result as discriminated union
type ValidationResult =
  | { valid: true; config: DependenciesConfig }
  | { valid: false; error: 'missing_version' }
  | { valid: false; error: 'invalid_version'; found: unknown }
  | { valid: false; error: 'no_ecosystems' }
  | { valid: false; error: 'schema_error'; details: string[] };
```

**Key advantage:** TypeScript narrows types based on discriminator, works seamlessly with ts-pattern, explicit about possible states.

### Pattern 4: Manual Schema Validation (No Zod Yet)

**What:** Validate new nested schema with explicit checks using ts-pattern
**When to use:** Config loading in hook and CLI validate command
**Example:**
```typescript
function validateConfig(raw: unknown): ValidationResult {
  // Check basic structure
  if (typeof raw !== 'object' || raw === null) {
    return { valid: false, error: 'schema_error', details: ['Config must be an object'] };
  }

  const obj = raw as Record<string, unknown>;

  // Check version field (required, must be 1)
  if (!('version' in obj)) {
    return { valid: false, error: 'missing_version' };
  }

  if (obj.version !== 1) {
    return { valid: false, error: 'invalid_version', found: obj.version };
  }

  // Check at least one ecosystem present (per CONTEXT.md)
  const hasPlugins = 'plugins' in obj;
  const hasCli = 'cli' in obj;
  const hasMcp = 'mcp' in obj;

  if (!hasPlugins && !hasCli && !hasMcp) {
    return { valid: false, error: 'no_ecosystems' };
  }

  // Validate each ecosystem section using ts-pattern
  const errors: string[] = [];

  if (hasPlugins) {
    const pluginErrors = validateEcosystemSection(obj.plugins, 'plugins');
    errors.push(...pluginErrors);
  }

  // cli and mcp sections exist but checkers not implemented in Phase 1
  // Still validate structure for forward compatibility

  if (errors.length > 0) {
    return { valid: false, error: 'schema_error', details: errors };
  }

  return { valid: true, config: obj as DependenciesConfig };
}
```

**Rationale:** Greenfield code with simple schema doesn't need Zod's overhead yet. Manual validation with ts-pattern gives full control, zero dependencies, and excellent error messages. Consider Zod in Phase 2/3 if complexity grows.

### Pattern 5: Hook Never Crashes

**What:** Top-level try-catch or attemptAsync wrapper ensures hook always outputs valid JSON
**When to use:** Hook entry point (index.ts)
**Example:**
```typescript
// Hook entry point with failsafe
(async () => {
  const [error, response] = await attemptAsync(async () => {
    // All hook logic here
    const config = await loadAndValidateConfig();
    const missing = await checkDependencies(config);
    return formatResponse(missing);
  });

  // If anything fails, output empty object (silent per CONTEXT.md)
  const output = error ? {} : response;
  console.log(JSON.stringify(output));
  process.exit(0);
})();
```

**Critical:** Hook runs inside Claude Code. Crashes break the plugin loading flow. Empty object `{}` is silent success per CONTEXT.md.

### Anti-Patterns to Avoid

- **Nested if/else or ternaries:** Use ts-pattern match instead — exhaustiveness checking prevents missing cases
- **try-catch blocks:** Use attemptAsync for consistent error tuple pattern throughout codebase
- **Custom utility functions:** Check es-toolkit first (isEmpty, isNil, pick, omit, etc.) before rolling your own
- **Throwing errors in hook:** Hook must never crash — always return valid JSON or empty object
- **Filesystem mutations without confirmation:** CLI must show summary and confirm before writing files

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML/JSON/JSONC parsing | Custom parser with yaml + JSON.parse | confbox parseYAML/parseJSON/parseJSONC | Handles all formats, auto-detects indentation, zero dependencies, battle-tested |
| Error handling patterns | try-catch everywhere | es-toolkit attemptAsync | Consistent [error, data] tuples, eliminates try-catch, functional style |
| Pattern matching / control flow | Nested if/else or switch | ts-pattern match().with().exhaustive() | Compile-time exhaustiveness, type narrowing, readable |
| CLI confirmations | Custom readline/stdin logic | @clack/prompts confirm() | Beautiful UX, simple API, cancellation handling, proper TTY detection |
| Lodash utilities | Copy lodash or write custom | es-toolkit equivalents | 2-3x faster, 97% smaller, TypeScript-first, tree-shakable |
| Schema validation | Hand-written validation for complex schemas | Zod (if schema complexity grows) | Type inference, runtime validation, excellent errors — but defer for now given simple schema |

**Key insight:** These libraries exist because the problems have subtle edge cases. attemptAsync handles Promise rejection vs throw correctly. confbox handles JSONC comment stripping and YAML quirks. ts-pattern's exhaustiveness checking prevents bugs at compile time. Don't rebuild what's already excellent.

## Common Pitfalls

### Pitfall 1: Forgetting .exhaustive() in ts-pattern

**What goes wrong:** Missing pattern match cases go undetected until runtime
**Why it happens:** TypeScript allows non-exhaustive matches without .exhaustive() call
**How to avoid:** ALWAYS end match() chains with .exhaustive() — make it a linting rule
**Warning signs:** "This expression is not callable" TypeScript error when a new union variant is added but not matched

**Example:**
```typescript
// BAD - not exhaustive, breaks when new status added
const result = match(status)
  .with('idle', () => '...')
  .with('loading', () => '...')
  .otherwise(() => '...'); // New 'error' status silently falls through

// GOOD - exhaustive, compile error if status not covered
const result = match(status)
  .with('idle', () => '...')
  .with('loading', () => '...')
  .with('error', () => '...')
  .exhaustive(); // TypeScript enforces all Status values handled
```

### Pitfall 2: Not Handling attemptAsync Errors

**What goes wrong:** `[error, data]` tuple has error but code uses data anyway (null/undefined access)
**Why it happens:** Developers familiar with try-catch forget to check error first
**How to avoid:** Establish pattern of checking error immediately with early return or match()
**Warning signs:** "Cannot read property X of null/undefined" runtime errors

**Example:**
```typescript
// BAD - uses data without checking error
const [error, config] = await attemptAsync(() => loadConfig());
processConfig(config); // config is null if error occurred!

// GOOD - check error first
const [error, config] = await attemptAsync(() => loadConfig());
if (error) {
  return { systemMessage: 'Config load failed' };
}
processConfig(config); // TypeScript knows config is non-null here

// BETTER - use ts-pattern to handle both cases
const [error, config] = await attemptAsync(() => loadConfig());
return match({ error, config })
  .with({ error: P.not(null) }, ({ error }) => {
    return { systemMessage: 'Config load failed' };
  })
  .with({ config: P.not(null) }, ({ config }) => {
    return processConfig(config);
  })
  .exhaustive();
```

### Pitfall 3: Synchronous fs Methods in Hook

**What goes wrong:** Blocking operations freeze Claude Code's plugin loading
**Why it happens:** fs.readFileSync seems simpler than async
**How to avoid:** Use fs.promises or fs/promises import, wrap in attemptAsync
**Warning signs:** Plugin loading hangs or feels slow

**Example:**
```typescript
// BAD - blocks event loop
import { readFileSync } from 'fs';
const content = readFileSync(path, 'utf8'); // Blocks!

// GOOD - async with error handling
import { readFile } from 'fs/promises';
const [error, content] = await attemptAsync(async () => {
  return await readFile(path, 'utf8');
});
```

### Pitfall 4: Forgetting Empty Object on Hook Errors

**What goes wrong:** Hook crashes or outputs non-JSON, breaking plugin load
**Why it happens:** Error paths forget to return valid JSON
**How to avoid:** Wrap entire hook in attemptAsync, always output empty object on error
**Warning signs:** Plugin fails to load, no error message in Claude Code

**Per CONTEXT.md:** "Hook never crashes — always outputs valid JSON" and "Empty object `{}` when everything is installed — completely silent"

### Pitfall 5: File Writes Without User Confirmation in CLI

**What goes wrong:** Files created/overwritten without user seeing what's happening
**Why it happens:** Eager to get to implementation, skip confirmation step
**How to avoid:** Show file list, use @clack/prompts confirm(), abort if rejected
**Warning signs:** User complaints about unexpected file changes

**Per CONTEXT.md:** "Summary + confirm before writing files: show list of files to be created/modified, then 'Proceed? (y/N)'"

**Example:**
```typescript
import { confirm } from '@clack/prompts';

// Show what will be created/modified
console.log('\nThe following files will be created/modified:');
console.log('  - dependencies.yaml');
console.log('  - hook/anthropak.mjs');
console.log('  - hooks.json');

// Confirm with user
const shouldProceed = await confirm({
  message: 'Proceed?',
  initialValue: false, // Default to No for safety
});

if (!shouldProceed || shouldProceed === Symbol.for('clack:cancel')) {
  console.log('Aborted.');
  process.exit(0);
}

// Now safe to write files
```

### Pitfall 6: Shared Types Diverging Between Packages

**What goes wrong:** Hook and CLI have different type definitions for same schema
**Why it happens:** Manual duplication instead of sharing types
**How to avoid:** Use TypeScript project references or export types from hook package
**Warning signs:** CLI accepts config that hook rejects, or vice versa

**Recommended approach for monorepo:**
```typescript
// packages/hook/src/types.ts - source of truth
export interface DependenciesConfig {
  version: 1;
  plugins?: EcosystemSection;
  cli?: EcosystemSection;
  mcp?: EcosystemSection;
}

// packages/cli/src/types.ts - re-export
export type { DependenciesConfig, EcosystemSection } from '@anthropak/hook';
// Plus CLI-specific types
export interface InitOptions { /* ... */ }
```

**Consideration:** Given both packages are in same monorepo, could establish shared types package, but for Phase 1 with simple types, re-exporting from hook is sufficient.

## Code Examples

Verified patterns from official sources:

### Loading Multi-Format Config Files

```typescript
// Source: https://github.com/unjs/confbox
import { parseYAML, parseJSON, parseJSONC } from 'confbox';
import { readFile } from 'fs/promises';
import { attemptAsync } from 'es-toolkit';
import { match } from 'ts-pattern';

const CONFIG_FILES = [
  { name: 'dependencies.yaml', parser: parseYAML },
  { name: 'dependencies.yml', parser: parseYAML },
  { name: 'dependencies.json', parser: parseJSON },
  { name: 'dependencies.jsonc', parser: parseJSONC },
] as const;

async function loadConfig(rootDir: string): Promise<ConfigLoadResult> {
  for (const { name, parser } of CONFIG_FILES) {
    const path = join(rootDir, name);
    const [readError, content] = await attemptAsync(() => readFile(path, 'utf8'));

    if (readError) continue; // File doesn't exist, try next

    const [parseError, raw] = await attemptAsync(() => parser(content));

    if (parseError) {
      return { status: 'parse_error', error: parseError };
    }

    const validation = validateConfig(raw);

    return match(validation)
      .with({ valid: true }, ({ config }) => ({ status: 'success', config }))
      .with({ valid: false }, (result) => ({
        status: 'validation_error',
        errors: 'details' in result ? result.details : [result.error]
      }))
      .exhaustive();
  }

  return { status: 'not_found' };
}
```

### Checking Plugin Installation

```typescript
// Source: Current implementation reference (packages/hook/src/lib/registry.ts)
// Adapted for new schema and ts-pattern

interface InstalledPluginsRegistry {
  plugins: Record<string, PluginInstallation[]>;
}

interface PluginInstallation {
  scope: 'global' | 'project';
  projectPath?: string;
}

function isPluginInstalled(
  registry: InstalledPluginsRegistry,
  pluginName: string,
  projectDir: string
): boolean {
  const plugins = registry.plugins || {};

  // Check for any installation matching plugin name
  for (const [key, installations] of Object.entries(plugins)) {
    // Key format: "pluginName@marketplace" but marketplace dropped in new schema
    // So just check if key starts with pluginName
    if (key.startsWith(`${pluginName}@`)) {
      // Check if any installation covers this project
      const covered = installations.some(inst =>
        match(inst)
          .with({ scope: 'global' }, () => true)
          .with({ scope: 'project', projectPath: P.string }, ({ projectPath }) => {
            return projectDir === projectPath ||
                   projectDir.startsWith(projectPath + '/');
          })
          .with({ scope: 'project' }, () => false) // No projectPath
          .exhaustive()
      );

      if (covered) return true;
    }
  }

  return false;
}
```

### CLI Init with Confirmation

```typescript
// Source: https://www.clack.cc/ + CONTEXT.md requirements
import { intro, outro, confirm, log } from '@clack/prompts';
import { attemptAsync } from 'es-toolkit';

async function initCommand(options: InitOptions) {
  intro('Initializing anthropak dependency management');

  // Detect mode (plugin vs repo)
  const detectedMode = detectMode(options.path);
  const mode = await confirmMode(detectedMode);

  // Build file list
  const files = [
    { path: 'dependencies.yaml', action: 'create' },
    { path: 'hook/anthropak.mjs', action: 'create' },
    { path: 'hooks.json', action: 'update' },
  ];

  // Show what will happen
  log.info('The following files will be created/modified:');
  files.forEach(({ path, action }) => {
    log.step(`  ${action === 'create' ? '✓' : '~'} ${path}`);
  });

  // Confirm with user (CONTEXT.md requirement)
  const shouldProceed = await confirm({
    message: 'Proceed?',
    initialValue: false, // Default to No per CONTEXT.md
  });

  if (!shouldProceed || shouldProceed === Symbol.for('clack:cancel')) {
    outro('Initialization cancelled.');
    process.exit(0);
  }

  // Safe to write files now
  const [error] = await attemptAsync(async () => {
    await writeConfigFiles(options.path, mode);
  });

  if (error) {
    log.error(`Failed: ${error.message}`);
    process.exit(1);
  }

  outro('Edit dependencies.yaml to declare your dependencies.');
}
```

### Formatting Missing Dependencies Message

```typescript
// Per CONTEXT.md: "Descriptive format: name + description + install command per missing dep"

function formatMissingDependencies(
  missing: PluginDependency[],
  required: boolean
): string {
  const header = required
    ? '**Missing Required Plugin Dependencies**'
    : '**Missing Optional Plugin Dependencies**';

  const entries = missing.map(dep => {
    const parts = [`- **${dep.plugin}**`];

    if (dep.description) {
      parts.push(`  ${dep.description}`);
    }

    // Install command (exact, not docs link per CONTEXT.md)
    const installCmd = dep.install
      ? dep.install
      : dep.github
        ? `claude plugin add --git git@github.com:${dep.github}.git`
        : `claude plugin add ${dep.plugin}`;

    parts.push(`  Install: \`${installCmd}\``);

    return parts.join('\n');
  });

  return [header, '', ...entries].join('\n');
}

// Hook response (empty object if all installed, per CONTEXT.md)
function buildHookResponse(
  missingRequired: PluginDependency[],
  missingOptional: PluginDependency[]
): HookResponse {
  if (missingRequired.length === 0 && missingOptional.length === 0) {
    return {}; // Completely silent per CONTEXT.md
  }

  const parts: string[] = [];

  if (missingRequired.length > 0) {
    parts.push(formatMissingDependencies(missingRequired, true));
  }

  if (missingOptional.length > 0) {
    parts.push(formatMissingDependencies(missingOptional, false));
  }

  return { systemMessage: parts.join('\n\n') };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| try-catch blocks | attemptAsync error tuples | 2024-2025 | Cleaner error handling, functional style, consistent pattern |
| switch/if-else | ts-pattern match().exhaustive() | 2020-present | Compile-time safety, exhaustiveness checking, type narrowing |
| lodash utilities | es-toolkit equivalents | 2024 (es-toolkit release) | 2-3x faster, 97% smaller bundle, modern JS features |
| Zod v3 | Zod v4 | 2025 (v4 release) | 14x faster string parsing, 7x faster arrays, 6.5x faster objects, 1.9KB mini variant |
| Manual YAML parsing | confbox multi-format | 2020s | Zero dependencies, handles YAML/JSON/JSONC, auto-detects indentation |
| yargs/commander | Optique/citty composition | 2025-2026 | Better TypeScript types, composition-based, but ecosystem smaller — defer for Phase 1 |

**Deprecated/outdated:**
- **Flat dependencies schema:** Old approach had `dependencies.required[]` at top level. New schema has `version` field + nested `plugins`/`cli`/`mcp` sections with `required[]`/`optional[]` each. No backward compatibility needed (greenfield rebuild per STATE.md).
- **marketplace field:** Dropped in new schema per CONTEXT.md. Plugin identity is just `plugin` name + optional `github` for install command generation.
- **try-catch in async code:** Replace all with attemptAsync for consistent error handling patterns across codebase.

## Open Questions

Things that couldn't be fully resolved:

1. **Message grouping strategy (Claude's discretion per CONTEXT.md)**
   - What we know: Could group by ecosystem type first (plugins/cli/mcp) or by required/optional first
   - What's unclear: Which provides better UX in Claude Code's systemMessage display
   - Recommendation: Group by required/optional first (more actionable — user knows what's critical). Within each group, can sub-group by ecosystem type if needed. Test both in practice, iterate.

2. **Mode detection heuristics for init (Claude's discretion per CONTEXT.md)**
   - What we know: Two modes: plugin (distributed plugin) vs repo (contributor tooling). Same schema, both use hooks.json.
   - What's unclear: Exact heuristics to auto-detect mode before confirming with user
   - Recommendation: Check for `.claude-plugin/plugin.json` or existing `hooks.json` → suggests plugin mode. Otherwise repo mode. Always confirm detection with user before proceeding.

3. **Zod adoption timing**
   - What we know: Zod v4 is excellent (14x faster, great DX), but adds dependency
   - What's unclear: When schema complexity justifies the dependency
   - Recommendation: Start with manual validation in Phase 1 (schema is simple, greenfield). Revisit in Phase 2 when CLI tool detection adds complexity, or Phase 3 for MCP servers. Zod shines when schema has deep nesting, complex validation rules, or needs transform pipelines.

4. **CLI framework replacement**
   - What we know: yargs works but TypeScript types are "bolted on", newer options (citty, optique) have better TS-first design
   - What's unclear: Whether migration effort justified for Phase 1
   - Recommendation: Keep yargs for Phase 1 (working, stable, known). Evaluate citty or optique post-v1 when API is stable and migration can be done incrementally.

## Sources

### Primary (HIGH confidence)

- [ts-pattern GitHub](https://github.com/gvergnaud/ts-pattern) - Pattern matching API, exhaustiveness checking, examples
- [es-toolkit documentation](https://es-toolkit.dev/) - attemptAsync API, utility functions, performance benchmarks
- [confbox GitHub](https://github.com/unjs/confbox) - Multi-format parsing (YAML/JSON/JSONC), API documentation
- [@clack/prompts website](https://www.clack.cc/) - CLI prompts API, confirm() usage
- [tsdown documentation](https://tsdown.dev/) - Bundler configuration, isolated-declarations, best practices
- [TypeScript exhaustiveness checking](https://gibbok.github.io/typescript-book/book/exhaustiveness-checking/) - never type patterns, compile-time safety

### Secondary (MEDIUM confidence)

- [Building CLI apps with TypeScript in 2026](https://dev.to/hongminhee/building-cli-apps-with-typescript-in-2026-5c9d) - Optique recommendation, modern CLI patterns
- [TypeScript discriminated unions best practices](https://angelogentileiii.medium.com/pattern-matching-how-discriminated-unions-enhance-your-typescript-development-cef417ef8b01) - Pattern matching with unions
- [Node.js file system best practices](https://dev.to/ayako_yk/best-practices-for-handling-filesystems-in-nodejs-3931) - Async operations, Promise-based syntax, resource management
- [Live types in TypeScript monorepo](https://colinhacks.com/essays/live-types-typescript-monorepo) - Sharing types between packages

### Tertiary (LOW confidence)

- [Zod v4 performance improvements](https://www.infoq.com/news/2025/08/zod-v4-available/) - InfoQ article on v4 release (third-party coverage)
- [WebSearch results] - CLI framework comparisons, prompt library comparisons (multiple sources, cross-referenced)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs/Context7/npm stats, established patterns
- Architecture: HIGH - Patterns sourced from official documentation, ts-pattern examples, es-toolkit API docs
- Pitfalls: MEDIUM-HIGH - Based on library documentation warnings, common TypeScript patterns, and existing codebase analysis
- Open questions: MEDIUM - Claude's discretion items flagged in CONTEXT.md, reasonable approaches proposed but not validated in practice

**Research date:** 2026-02-06
**Valid until:** ~30 days (libraries are stable/mature, not fast-moving)

**Next steps for planner:**
1. Use this research to create granular tasks for rebuilding hook and CLI
2. Ensure all tasks use ts-pattern for control flow, attemptAsync for async, es-toolkit for utilities
3. Prioritize hook rebuild first (CLI depends on hook's embedded script per build order)
4. Create validation task for new schema structure (manual validation with ts-pattern)
5. Create CLI init task with mode detection + confirmation flow
6. Reference code examples when writing task action instructions
