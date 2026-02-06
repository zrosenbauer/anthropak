# Stack Research

**Domain:** Claude Code dependency management tooling (CLI + MCP extension)
**Researched:** 2026-02-06
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| ts-pattern | ^5.5.0 | Pattern matching and control flow | Exhaustive matching eliminates defensive conditionals. Type-safe, 2kB bundle, designed for replacing nested if/else and ternaries. Industry standard for TypeScript pattern matching. |
| es-toolkit | ^1.44.0 | Utility library and async error handling | Modern Lodash replacement: 2-3× faster, 97% smaller bundle, 100% tree-shakeable. `attemptAsync` provides tuple-based error handling without try-catch blocks. |
| which | ^6.0.0 | CLI tool detection on PATH | Cross-platform `which(1)` implementation from npm org. Respects PATH/PATHEXT, async and sync APIs, no caching. The standard for executable discovery in Node.js. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| es-toolkit/compat | ^1.44.0 | Lodash compatibility layer | Only if migrating existing Lodash code. Provides 100% API compatibility for gradual migration. Prefer native es-toolkit imports for new code. |
| command-exists | ^1.2.9 | Alternative CLI detection | Consider if `which` has issues. More battle-tested on Windows edge cases (multiple fixes for path handling), but less maintained (last update 6 years ago). |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| oxlint | Linting | Already established in project. Faster than ESLint. |
| oxfmt | Formatting | Already established in project. No configuration changes needed. |
| tsdown | Bundling | Already established. Handles hook script embedding in CLI. |

## Installation

```bash
# New dependencies to add
pnpm add ts-pattern es-toolkit which

# Already in project (no changes needed)
# - confbox (hook only)
# - yargs, @clack/prompts (CLI only)
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| which ^6.0.0 | command-exists ^1.2.9 | If you encounter Windows-specific PATH issues. More battle-tested on edge cases but unmaintained for 6 years. Lower confidence in future fixes. |
| which ^6.0.0 | hasbin ^1.2.3 | Never. Package is 10 years old, discontinued, missing modern async/await patterns. |
| es-toolkit | lodash / lodash-es | Never for this project. Violates established constraint. es-toolkit is explicitly chosen to replace Lodash patterns. |
| ts-pattern | Manual if/else chains | Never. Project constraint explicitly mandates ts-pattern for matching and eliminating ternaries/nested conditionals. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| hasbin | 10 years old, discontinued, no recent maintenance | which ^6.0.0 |
| try-catch blocks for async | Verbose, masks errors, violates code style constraint | es-toolkit attemptAsync |
| Nested ternaries | Unreadable, violates project constraint | ts-pattern with .match() |
| Lodash | Larger bundle, slower, violates project decision | es-toolkit |
| child_process.exec('which') | Platform-specific, requires shell escaping, error-prone | which package (cross-platform, safe) |

## Stack Patterns by Use Case

### CLI Tool Detection Pattern

```typescript
import { which } from 'which';
import { attemptAsync } from 'es-toolkit';
import { match } from 'ts-pattern';

// Recommended: Combine which + attemptAsync + ts-pattern
const [error, path] = await attemptAsync(() => which('docker', { nothrow: true }));

const result = match({ error, path })
  .with({ error: P.not(P.nullish) }, () => ({ found: false, reason: 'error' }))
  .with({ path: P.nullish }, () => ({ found: false, reason: 'not-found' }))
  .with({ path: P.string }, ({ path }) => ({ found: true, path }))
  .exhaustive();
```

**Why this pattern:**
- `which` handles cross-platform PATH lookup
- `attemptAsync` eliminates try-catch noise
- `ts-pattern` exhaustively handles all cases (error, null, found)
- Type-safe at every level

### MCP Server Detection Pattern

```typescript
import { readFile } from 'fs/promises';
import { attemptAsync } from 'es-toolkit';
import { match, P } from 'ts-pattern';

// Read .mcp.json with error handling
const [error, content] = await attemptAsync(() =>
  readFile('.mcp.json', 'utf-8')
);

const config = match({ error, content })
  .with({ error: P.not(P.nullish) }, () => null) // File read failed
  .with({ content: P.string }, ({ content }) => {
    const [parseError, parsed] = attemptSync(() => JSON.parse(content));
    return parsed ?? null;
  })
  .exhaustive();

// Check if server exists in config
const isRegistered = match(config)
  .with(P.nullish, () => false)
  .with({ mcpServers: P.select() }, (servers) =>
    serverName in servers
  )
  .otherwise(() => false);
```

**Why this pattern:**
- Handles file not found, parse errors, missing keys
- No try-catch blocks, all errors as values
- Exhaustive matching prevents unhandled cases
- Type narrowing works correctly

### Error Handling Pattern

```typescript
import { attemptAsync } from 'es-toolkit';
import { match, P } from 'ts-pattern';

// Hook must never crash - always return valid JSON
async function checkDependency(name: string): Promise<DependencyStatus> {
  const [error, result] = await attemptAsync(async () => {
    // Potentially failing operation
    return await someRiskyCheck(name);
  });

  return match({ error, result })
    .with({ error: P.instanceOf(Error) }, ({ error }) => ({
      status: 'error',
      message: error.message,
    }))
    .with({ result: P.not(P.nullish) }, ({ result }) => ({
      status: 'success',
      data: result,
    }))
    .exhaustive();
}
```

**Why this pattern:**
- Errors never throw - returned as tuple values
- Pattern matching ensures all cases handled
- Hook script safety: no unhandled exceptions
- Clear separation of success/failure paths

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| ts-pattern@^5.5.0 | TypeScript@^5.7.3 | Requires TS 5.0+ for proper type inference. Project uses 5.7.3. ✓ |
| es-toolkit@^1.44.0 | Node.js@^18.0.0 | Uses modern JS APIs. Project targets Node 18+. ✓ |
| which@^6.0.0 | Node.js@^18.0.0 | Works on all Node LTS versions. ✓ |
| es-toolkit/compat | lodash@^4.17.0 | 100% API compatible. Only use during migration. |

## ts-pattern Best Practices

### DO: Use .exhaustive() for Critical Paths

```typescript
// ✓ GOOD: Compiler enforces all cases handled
const result = match(dependency.type)
  .with('plugin', () => checkPlugin(dependency))
  .with('cli', () => checkCLI(dependency))
  .with('mcp', () => checkMCP(dependency))
  .exhaustive(); // Compile error if new type added
```

```typescript
// ✗ BAD: No compile-time safety
const result = match(dependency.type)
  .with('plugin', () => checkPlugin(dependency))
  .with('cli', () => checkCLI(dependency))
  .otherwise(() => null); // Silently ignores 'mcp' type
```

### DO: Use P.select() for Extraction

```typescript
// ✓ GOOD: Extract values directly in pattern
const message = match(error)
  .with({ code: 'ENOENT', path: P.select() }, (path) =>
    `File not found: ${path}`
  )
  .with({ message: P.select() }, (msg) => msg)
  .otherwise(() => 'Unknown error');
```

```typescript
// ✗ BAD: Manual destructuring in handler
const message = match(error)
  .with({ code: 'ENOENT' }, (err) => `File not found: ${err.path}`)
  .otherwise((err) => err.message ?? 'Unknown error');
```

### DON'T: Use Catch-All Patterns Too Early

```typescript
// ✗ BAD: Catch-all prevents exhaustiveness checking
const result = match(status)
  .with('ready', () => 'Ready')
  .with(P._, () => 'Other'); // Hides unhandled 'pending', 'error' cases
```

```typescript
// ✓ GOOD: Exhaustive matching catches missing cases
const result = match(status)
  .with('ready', () => 'Ready')
  .with('pending', () => 'Pending')
  .with('error', () => 'Error')
  .exhaustive(); // Compile error if status union grows
```

## es-toolkit Best Practices

### DO: Use attemptAsync for All Async Operations

```typescript
// ✓ GOOD: Errors as values, no throw
const [error, data] = await attemptAsync(() => fetch(url));
if (error) {
  console.log(JSON.stringify({ systemMessage: 'Network error' }));
  process.exit(0);
}
```

```typescript
// ✗ BAD: try-catch violates project style
try {
  const data = await fetch(url);
} catch (error) {
  // Hook crash risk if JSON.stringify throws
  console.log(JSON.stringify({ systemMessage: error.message }));
}
```

### DO: Combine with ts-pattern for Clean Control Flow

```typescript
// ✓ GOOD: Tuple destructuring + pattern matching
const [error, config] = await attemptAsync(() => loadConfig());

return match({ error, config })
  .with({ config: P.not(P.nullish) }, ({ config }) => processConfig(config))
  .with({ error: P.instanceOf(ValidationError) }, () => ({ systemMessage: 'Invalid config' }))
  .otherwise(() => ({}));
```

### DON'T: Mix attempt and try-catch

```typescript
// ✗ BAD: Inconsistent error handling
const [error, data] = await attemptAsync(() => fetch(url));
try {
  return JSON.parse(data); // Mixing styles
} catch (e) {
  return null;
}
```

```typescript
// ✓ GOOD: Consistent tuple-based error handling
const [error, data] = await attemptAsync(() => fetch(url));
const [parseError, parsed] = attempt(() => JSON.parse(data ?? ''));
```

## Cross-Platform Considerations

### CLI Detection with `which`

**Windows notes:**
- Automatically checks `.exe`, `.cmd`, `.bat` extensions via `PATHEXT`
- Handles Windows path separators correctly
- No manual platform detection needed

**Unix notes:**
- Respects executable permissions
- Uses `:` PATH separator automatically

**Both:**
- No caching means PATH changes take effect immediately
- Async API preferred for non-blocking checks
- Use `{ nothrow: true }` option to return null instead of throwing

### MCP Config File Paths

| Platform | User Config | Project Config |
|----------|-------------|----------------|
| macOS | `~/.claude.json` | `.mcp.json` |
| Linux | `~/.claude.json` | `.mcp.json` |
| Windows | `~/.claude.json` | `.mcp.json` |
| WSL | `~/.claude.json` | `.mcp.json` |

**Important:**
- `~` expands correctly on all platforms via Node.js
- Project `.mcp.json` is always relative to project root
- Use `path.join()` for constructing paths, never string concatenation
- Managed settings in platform-specific system directories (see MCP docs)

## Performance Notes

### ts-pattern
- Bundle: ~2kB minified
- Runtime: Minimal overhead vs hand-written if/else
- Tree-shakeable: Unused patterns eliminated

### es-toolkit
- Bundle: 97% smaller than Lodash (e.g., `sample`: 88 bytes vs 2000 bytes)
- Runtime: 2-3× faster than Lodash on modern runtimes
- Tree-shakeable: Import only what you use

### which
- Runtime: No caching, each call stats filesystem
- For repeated checks, cache results manually if needed
- Async API is non-blocking, preferred for performance

## Sources

**CLI Tool Detection:**
- [GitHub: npm/node-which](https://github.com/npm/node-which) — Latest version (v6.0.0), API documentation, cross-platform details (HIGH confidence)
- [GitHub: mathisonian/command-exists](https://github.com/mathisonian/command-exists) — Alternative package, Windows path handling notes (MEDIUM confidence)
- [Node.js CLI Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices) — Cross-platform patterns (MEDIUM confidence)

**MCP Configuration:**
- [Claude Code Settings Documentation](https://code.claude.com/docs/en/settings) — Official config file locations, .mcp.json format (HIGH confidence)
- [Getting Started with Local MCP Servers on Claude Desktop](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop) — Configuration file format and location (HIGH confidence)
- [Model Context Protocol: Connect to Local Servers](https://modelcontextprotocol.io/docs/develop/connect-local-servers) — mcpServers JSON structure (HIGH confidence)
- [Feature Request: Support project-based MCP configuration](https://github.com/anthropics/claude-code/issues/5350) — .mcp.json vs .claude.json distinction (HIGH confidence)

**TypeScript Pattern Matching:**
- [GitHub: gvergnaud/ts-pattern](https://github.com/gvergnaud/ts-pattern) — Official repo, latest version, best practices, bundle size (HIGH confidence)
- [ts-pattern NPM](https://www.npmjs.com/package/ts-pattern) — Version info, installation (HIGH confidence)
- [Exhaustive Matching in TypeScript](https://tkdodo.eu/blog/exhaustive-matching-in-type-script) — Best practices and anti-patterns (HIGH confidence)
- [Bringing Pattern Matching to TypeScript](https://dev.to/gvergnaud/bringing-pattern-matching-to-typescript-introducing-ts-pattern-v3-0-o1k) — Author's guide to v3+ features (HIGH confidence)

**es-toolkit:**
- [GitHub: toss/es-toolkit](https://github.com/toss/es-toolkit) — Official repo, version 1.44.0, performance benchmarks (HIGH confidence)
- [es-toolkit Official Documentation](https://es-toolkit.dev/) — API reference, migration guide (HIGH confidence)
- [attemptAsync API Reference](https://es-toolkit.dev/reference/util/attemptAsync.html) — Official API docs, examples, return types (HIGH confidence)
- [Es-Toolkit, a Modern Lodash Alternative - InfoQ](https://www.infoq.com/news/2024/08/es-toolkit-lodash-alternative/) — Bundle size comparisons, adoption (HIGH confidence)
- [Compatibility with Lodash](https://es-toolkit.dev/compatibility.html) — Migration path, compat layer (HIGH confidence)

---
*Stack research for: Claude Code CLI tool and MCP server dependency checking*
*Researched: 2026-02-06*
*All recommendations verified with official documentation or maintained source repositories*
