# Phase 2: CLI Tool Dependencies - Research

**Researched:** 2026-02-07
**Domain:** Cross-platform CLI tool detection in Node.js
**Confidence:** HIGH

## Summary

This research covers implementing cross-platform CLI tool detection for Phase 2 of Anthropak. The standard approach uses Node.js built-in `child_process` module with platform detection via `process.platform` to execute appropriate commands (`which` on macOS/Linux, `where` on Windows). The implementation extends the existing checker pattern established in Phase 1 (plugin dependencies) to support a second ecosystem type.

Key technical decisions are already locked from CONTEXT.md: no external dependencies for detection (direct `child_process` wrapper), presence-only checking (no version parsing), parallel execution via `Promise.all`, and timeout-based failure handling. The implementation follows established codebase patterns: `attemptAsync` for error handling, `ts-pattern` for discriminated unions, and the existing nested schema structure.

**Primary recommendation:** Implement a simple internal utility wrapping `child_process.execFile` (not `exec`) for security, using `process.platform` to select between `which` and `where` commands, with individual timeouts (2-3s) and parallel execution via `Promise.all`.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Missing tool messaging:**

- Group by priority: required tools section first, then optional tools section — clear visual separation
- Install guidance is user-provided in config (users specify install instructions per tool in dependencies.yaml)
- Same message format for both required and optional, just tagged (required) or (optional) — no emoji/icon difference between them
- When all CLI tools are found, show a summary line ("CLI Tools: 3/3 found") — but only on session start, not every invocation

**Init scaffolding flow:**

- Init scaffolds an empty cli_tools section — no interactive prompts for adding tools during init
- Include commented-out examples showing the format in the scaffolded YAML (e.g., `# - name: docker\n#   install: brew install docker`)
- Schema uses required/optional arrays (not a per-tool flag):
  ```yaml
  cli_tools:
    required:
      - name: docker
        install: "brew install docker"
    optional:
      - name: terraform
        install: "brew install terraform"
  ```
- Each tool entry has: name (string) and install (string, install instructions)

**Detection behavior:**

- Presence-only detection via which/where — no version checking
- Uniform internal utility wrapping child_process (which on macOS/Linux, where on Windows) — no external dependencies (no shelljs, no npm which package)
- Short timeout per tool lookup (2-3 seconds) — fail gracefully as "not found" if detection hangs
- All tool lookups run in parallel (Promise.all) for speed

**Non-interactive mode:**

- `--yes` flag skips all prompts and uses defaults — fully non-interactive for CI/agent workflows
- `--yes` applies to both `anthropak init` and `anthropak update` (skip confirmations on both)
- No environment variable alternative — flag only
- Quieter output in --yes mode — less decoration/color, cleaner for logs, same content

### Claude's Discretion

- Exact timeout duration per tool lookup (within 2-3 second range)
- `--yes` default scaffolding choices
- Error message formatting details
- How to detect which platform for which vs where

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

The established libraries/tools for CLI tool detection in Node.js:

### Core (Already in Project)

| Library                 | Version  | Purpose                          | Why Standard                                                |
| ----------------------- | -------- | -------------------------------- | ----------------------------------------------------------- |
| Node.js `child_process` | Built-in | Execute shell commands           | Native module, no dependencies, secure when used correctly  |
| `process.platform`      | Built-in | Detect OS (win32/darwin/linux)   | Native property, reliable platform detection                |
| es-toolkit              | ^1.44.0  | Error handling with attemptAsync | Already established in codebase, tuple-based error handling |
| ts-pattern              | ^5.5.0   | Type-safe pattern matching       | Already established in codebase, exhaustive matching        |

### Supporting (Already in Project)

| Library        | Version | Purpose              | When to Use                               |
| -------------- | ------- | -------------------- | ----------------------------------------- |
| confbox        | ^0.2.2  | YAML parsing         | Reading dependencies.yaml config          |
| @clack/prompts | ^1.0.0  | CLI user interaction | Init command prompts (not for --yes mode) |

### Alternatives Considered

| Instead of                | Could Use           | Tradeoff                                                     |
| ------------------------- | ------------------- | ------------------------------------------------------------ |
| Built-in child_process    | which npm package   | External dependency violates user constraint                 |
| Built-in child_process    | shelljs             | External dependency, user explicitly rejected this           |
| execFile                  | spawn               | spawn requires more ceremony for simple which/where commands |
| Built-in process.platform | platform-detect npm | External dependency, built-in is sufficient                  |

**Installation:**

```bash
# No new dependencies required - all tools already in package.json
```

## Architecture Patterns

### Recommended Project Structure

Following Phase 1 patterns:

```
packages/hook/src/
├── checkers/
│   ├── plugins.ts       # Existing plugin checker
│   └── cli-tools.ts     # NEW: CLI tool checker
├── lib/
│   ├── cli-detector.ts  # NEW: Cross-platform detection utility
│   ├── config.ts        # UPDATE: Validate cli_tools schema
│   └── output.ts        # UPDATE: Format CLI tool messages
└── types.ts             # UPDATE: Add CliToolDependency type

packages/cli/src/
├── templates/
│   └── dependencies-yaml.ts  # UPDATE: Uncomment cli_tools section
└── commands/
    └── init.ts               # UPDATE: Handle --yes flag
```

### Pattern 1: Platform-Based Command Selection

**What:** Use `process.platform` to select between `which` (Unix) and `where` (Windows)

**When to use:** Every CLI tool detection call

**Example:**

```typescript
// Source: Node.js official docs + research findings
function getToolDetectionCommand(toolName: string): { command: string; args: string[] } {
  return match(process.platform)
    .with("win32", () => ({
      command: "where",
      args: [toolName],
    }))
    .otherwise(() => ({
      command: "which",
      args: [toolName],
    }))
    .exhaustive();
}
```

### Pattern 2: Timeout with attemptAsync Wrapper

**What:** Wrap child_process calls in attemptAsync with timeout handling

**When to use:** All tool detection operations

**Example:**

```typescript
// Source: es-toolkit docs + codebase patterns
async function checkToolExists(toolName: string): Promise<boolean> {
  const [error, result] = await attemptAsync(async () => {
    const { command, args } = getToolDetectionCommand(toolName);

    return new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout")), 3000);

      execFile(command, args, (err, stdout) => {
        clearTimeout(timeout);
        if (err) {
          resolve(false); // Command failed = tool not found
        } else {
          resolve(true); // Command succeeded = tool found
        }
      });
    });
  });

  // Treat errors (including timeout) as "not found"
  return error ? false : result!;
}
```

### Pattern 3: Parallel Checking with Promise.all

**What:** Run all tool checks concurrently for speed

**When to use:** Checking multiple tools from dependencies.yaml

**Example:**

```typescript
// Source: MDN Promise.all docs + codebase patterns
async function checkAllTools(tools: string[]): Promise<Map<string, boolean>> {
  const results = await Promise.all(
    tools.map(async (tool) => ({
      tool,
      exists: await checkToolExists(tool),
    })),
  );

  return new Map(results.map((r) => [r.tool, r.exists]));
}
```

### Pattern 4: Discriminated Union for Check Results

**What:** Follow Phase 1 pattern for check results

**When to use:** Returning missing tool information

**Example:**

```typescript
// Source: Existing codebase (packages/hook/src/types.ts)
export interface CliToolDependency {
  name: string;
  install: string;
}

export interface CheckResult {
  missingRequired: PluginDependency[];
  missingOptional: PluginDependency[];
  missingRequiredCliTools: CliToolDependency[]; // NEW
  missingOptionalCliTools: CliToolDependency[]; // NEW
}
```

### Anti-Patterns to Avoid

- **Using `child_process.exec`:** Opens shell, vulnerable to injection. Use `execFile` instead.
- **Passing user input directly:** Never pass unsanitized input to child processes. Tool names from config should be validated.
- **Using shell: true option:** Enables shell metacharacter interpretation, security risk.
- **Synchronous blocking:** Don't use `execFileSync` - blocks event loop. Use async with Promise.all instead.
- **Ignoring timeout failures:** Treat timeouts as "not found" rather than crashing.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                    | Don't Build                        | Use Instead                 | Why                                                            |
| -------------------------- | ---------------------------------- | --------------------------- | -------------------------------------------------------------- |
| Platform detection         | Custom OS detection logic          | process.platform            | Built-in, reliable, covers all cases (win32/darwin/linux/etc)  |
| Error handling tuples      | Custom try-catch wrapper           | es-toolkit attemptAsync     | Already in codebase, well-tested, TypeScript-friendly          |
| Pattern matching           | Nested if-else or switch           | ts-pattern match/exhaustive | Already in codebase, type-safe, compiler-enforced completeness |
| YAML parsing               | Custom parser or different library | confbox parseYAML           | Already in codebase, compact, supports multiple formats        |
| Command execution security | String concatenation + exec        | execFile with args array    | Prevents injection, no shell interpretation                    |

**Key insight:** The built-in Node.js APIs (child_process, process.platform) are sufficient and more secure than external dependencies. The codebase already has the right patterns established.

## Common Pitfalls

### Pitfall 1: Shell Injection Vulnerabilities

**What goes wrong:** Using `child_process.exec` with concatenated strings allows command injection if tool names aren't sanitized.

**Why it happens:** Developers reach for `exec` because it's simpler than `execFile`, but it invokes a shell.

**How to avoid:**

- Always use `child_process.execFile` with args as an array
- Never pass user input directly to shell commands
- Validate tool names against allowed characters (alphanumeric, dash, underscore)

**Warning signs:**

- Using template strings or string concatenation to build commands
- Seeing `exec(` instead of `execFile(`
- Using `shell: true` option

### Pitfall 2: Platform Detection False Assumptions

**What goes wrong:** Assuming all non-Windows platforms use the same commands, or that Windows always uses `cmd.exe`.

**Why it happens:** Testing only on developer's local OS without considering all platforms.

**How to avoid:**

- Use `process.platform` for explicit platform checks
- Test on all three major platforms (Windows, macOS, Linux)
- Handle unknown platforms gracefully (default to Unix-style commands)

**Warning signs:**

- Code only checks for Windows without handling darwin vs linux
- Hard-coded shell paths like `/bin/bash` or `C:\Windows\System32\cmd.exe`
- Assuming environment variables exist (like $PATH format)

### Pitfall 3: Promise.all Fail-Fast Behavior

**What goes wrong:** One timeout/error in Promise.all rejects the entire batch, even though other tools might be detected.

**Why it happens:** Promise.all rejects immediately on first failure (fail-fast behavior).

**How to avoid:**

- Wrap individual tool checks in attemptAsync to catch errors
- Return boolean results (true/false) instead of throwing errors
- Never let individual tool checks throw - treat all errors as "not found"

**Warning signs:**

- Entire check fails when one tool times out
- No results returned when some tools exist and others don't
- Unhandled promise rejections in parallel operations

### Pitfall 4: Timeout Not Per-Operation

**What goes wrong:** Setting a global timeout for all tools instead of per-tool timeouts.

**Why it happens:** Easier to implement one timeout wrapper around Promise.all.

**How to avoid:**

- Each tool check gets its own 2-3 second timeout
- Use individual timeouts inside the Promise for each execFile call
- Parallel execution is still fast because timeouts run concurrently

**Warning signs:**

- Timeout based on total execution time (e.g., N tools × 3 seconds)
- One slow tool blocks detection of all others
- Timeout rejection from Promise.all level instead of individual checks

### Pitfall 5: Blocking Event Loop with Sync Calls

**What goes wrong:** Using `execFileSync` blocks the Node.js event loop, making the hook unresponsive.

**Why it happens:** Sync APIs are simpler (no promises/callbacks), tempting for CLI tools.

**How to avoid:**

- Always use async variants: `execFile` not `execFileSync`
- Combine with Promise.all for parallel execution
- Hook must remain responsive - never block

**Warning signs:**

- Functions ending in `Sync`
- No `await` or promise handling
- Hook becomes noticeably slower with many tools

### Pitfall 6: Non-Interactive Mode Not Truly Non-Interactive

**What goes wrong:** `--yes` flag still prompts for input or waits for confirmation in some code paths.

**Why it happens:** Prompt checks scattered throughout code, easy to miss one.

**How to avoid:**

- Pass `--yes` flag through entire call chain as a parameter
- Check flag before ANY @clack/prompts call
- Test in actual CI environment (not just local terminal)

**Warning signs:**

- CI/agent workflows hang waiting for input
- Some prompts still appear with `--yes` flag
- Process.stdin.isTTY checks without flag checks

## Code Examples

Verified patterns from official sources:

### Cross-Platform Tool Detection

```typescript
// Source: Node.js child_process docs + codebase patterns (lib/io.ts, lib/config.ts)
import { execFile } from "node:child_process";
import { attemptAsync } from "es-toolkit";
import { match } from "ts-pattern";

interface DetectionCommand {
  command: string;
  args: string[];
}

function getToolDetectionCommand(toolName: string): DetectionCommand {
  return match(process.platform)
    .with("win32", () => ({
      command: "where",
      args: [toolName],
    }))
    .otherwise(() => ({
      command: "which",
      args: [toolName],
    }))
    .exhaustive();
}

async function checkToolExists(toolName: string): Promise<boolean> {
  const [error, result] = await attemptAsync(async () => {
    const { command, args } = getToolDetectionCommand(toolName);

    return new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Detection timeout"));
      }, 3000);

      // execFile is safe - no shell interpretation
      execFile(command, args, (err) => {
        clearTimeout(timeout);
        // which/where return non-zero exit if tool not found
        resolve(!err);
      });
    });
  });

  // Treat any error (timeout, command not found, etc) as tool not installed
  return error ? false : (result ?? false);
}
```

### Parallel Tool Checking

```typescript
// Source: MDN Promise.all + codebase patterns (checkers/plugins.ts)
interface CliToolDependency {
  name: string;
  install: string;
}

interface CliToolCheckResult {
  missingRequired: CliToolDependency[];
  missingOptional: CliToolDependency[];
}

async function checkCliTools(
  required: CliToolDependency[],
  optional: CliToolDependency[],
): Promise<CliToolCheckResult> {
  // Check all tools in parallel
  const allTools = [...required, ...optional];
  const results = await Promise.all(
    allTools.map(async (tool) => ({
      name: tool.name,
      exists: await checkToolExists(tool.name),
    })),
  );

  // Build lookup map
  const existsMap = new Map(results.map((r) => [r.name, r.exists]));

  return {
    missingRequired: required.filter((t) => !existsMap.get(t.name)),
    missingOptional: optional.filter((t) => !existsMap.get(t.name)),
  };
}
```

### Message Formatting (Following Phase 1 Pattern)

```typescript
// Source: Codebase pattern (lib/output.ts)
function formatMissingCliTools(missing: CliToolDependency[], required: boolean): string {
  const header = match(required)
    .with(true, () => "**Missing Required CLI Tools**")
    .with(false, () => "**Missing Optional CLI Tools**")
    .exhaustive();

  const lines = [header];

  for (const tool of missing) {
    lines.push(`- **${tool.name}** (${required ? "required" : "optional"})`);
    lines.push(`  \`${tool.install}\``);
  }

  return lines.join("\n");
}
```

### Schema Validation Extension

```typescript
// Source: Codebase pattern (lib/config.ts validateEcosystemSection)
interface CliToolEntry {
  name: string;
  install: string;
}

function validateCliToolEntry(entry: unknown, path: string): string[] {
  const errors: string[] = [];

  if (typeof entry !== "object" || entry === null) {
    return [`${path} must be an object`];
  }

  const obj = entry as Record<string, unknown>;

  // name field is required
  if (!("name" in obj)) {
    errors.push(`${path}: missing required field 'name'`);
  } else if (typeof obj.name !== "string") {
    errors.push(`${path}.name must be a string`);
  } else if (obj.name.trim() === "") {
    errors.push(`${path}.name must be non-empty`);
  }

  // install field is required
  if (!("install" in obj)) {
    errors.push(`${path}: missing required field 'install'`);
  } else if (typeof obj.install !== "string") {
    errors.push(`${path}.install must be a string`);
  } else if (obj.install.trim() === "") {
    errors.push(`${path}.install must be non-empty`);
  }

  return errors;
}
```

### Non-Interactive Mode Handling

```typescript
// Source: Codebase pattern (commands/init.ts) + @clack/prompts patterns
import * as p from "@clack/prompts";

async function runWithYesFlag(yesMode: boolean) {
  if (yesMode) {
    // Skip prompts, use defaults
    p.log.info("Running in non-interactive mode (--yes)");
    // Proceed with defaults
  } else {
    const confirmed = await p.confirm({
      message: "Proceed?",
      initialValue: false,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }
  }
}
```

## State of the Art

| Old Approach                 | Current Approach                 | When Changed       | Impact                                      |
| ---------------------------- | -------------------------------- | ------------------ | ------------------------------------------- |
| which npm package            | Built-in child_process           | 2023+              | Fewer dependencies, better security control |
| Callback-based child_process | Promisified with attemptAsync    | ES2017+            | Cleaner error handling, composable          |
| Manual platform checks       | process.platform with ts-pattern | TypeScript era     | Type-safe, exhaustive matching              |
| try-catch blocks             | attemptAsync tuples              | 2024+ (es-toolkit) | Zero-exception policy, composable errors    |
| execSync for simplicity      | async execFile with Promise.all  | Node.js 10+        | Non-blocking, parallel execution            |

**Deprecated/outdated:**

- **shelljs**: Adds dependency, user explicitly rejected
- **which npm package**: Unnecessary dependency when built-in works
- **exec with shell**: Security risk, use execFile instead
- **Synchronous child_process**: Blocks event loop, use async variants
- **AbortController for simple timeouts**: Overkill for this use case, setTimeout is sufficient

## Open Questions

Things that couldn't be fully resolved:

1. **Session-start detection for "all found" message**
   - What we know: User wants summary line only on session start, not every invocation
   - What's unclear: How to detect "session start" vs subsequent invocations - hook is stateless
   - Recommendation: Defer to implementation phase - may need to pass context from Claude Code or track in temp file

2. **Tool name validation strictness**
   - What we know: Names come from user's dependencies.yaml
   - What's unclear: How strict to validate (alphanumeric only? allow dots? allow slashes for paths?)
   - Recommendation: Start permissive (allow common chars), add validation if abuse detected

3. **@clack/prompts --yes mode**
   - What we know: @clack/prompts handles interactive prompts, user wants --yes to skip all
   - What's unclear: Whether @clack/prompts has built-in non-interactive mode or if we check flag manually
   - Recommendation: Manual flag checking before each prompt (demonstrated in existing init.ts code)

## Sources

### Primary (HIGH confidence)

- [Node.js child_process documentation](https://nodejs.org/api/child_process.html) - execFile, timeout options, security guidance
- [es-toolkit attemptAsync](https://es-toolkit.dev/reference/util/attemptAsync.html) - API, usage examples, return types
- [MDN Promise.all()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) - Parallel execution, error handling
- Anthropak codebase - Established patterns in packages/hook/src and packages/cli/src
- [GitHub - unjs/confbox](https://github.com/unjs/confbox) - YAML parsing already in use

### Secondary (MEDIUM confidence)

- [GitHub - gvergnaud/ts-pattern](https://github.com/gvergnaud/ts-pattern) - Exhaustive pattern matching (already in use)
- [Node.js Security Best Practices](https://nodejs.org/en/learn/getting-started/security-best-practices) - child_process security
- [Windows 'where' equivalent to 'which'](https://www.shellhacks.com/windows-which-equivalent-cmd-powershell/) - Cross-platform commands
- [GitHub - bcoe/awesome-cross-platform-nodejs](https://github.com/bcoe/awesome-cross-platform-nodejs) - Cross-platform patterns
- [@clack/prompts npm](https://www.npmjs.com/package/@clack/prompts) - CLI prompts library (already in use)

### Tertiary (LOW confidence)

- Various Medium/Dev.to articles on cross-platform Node.js - General patterns, no specific implementation details verified

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already in codebase, well-established patterns
- Architecture: HIGH - Extending proven Phase 1 patterns, minimal new architecture
- Pitfalls: HIGH - Well-documented security concerns, common mistakes verified from official sources
- CLI tool detection: HIGH - Built-in Node.js APIs, official documentation, established approach

**Research date:** 2026-02-07
**Valid until:** ~60 days (stable technologies, slow-changing domain)
