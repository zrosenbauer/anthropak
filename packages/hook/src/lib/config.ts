import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseYAML, parseJSON, parseJSONC } from "confbox";
import { attemptAsync } from "es-toolkit";
import { match, P } from "ts-pattern";
import type { ConfigLoadResult, DependenciesConfig, EcosystemSection } from "../types.js";
import { CONFIG_FILES } from "./constants.js";

/**
 * Loads and parses dependencies config file
 */
export async function loadConfig(rootDir: string): Promise<ConfigLoadResult> {
  for (const configFile of CONFIG_FILES) {
    const filePath = join(rootDir, configFile.name);

    const [readError, content] = await attemptAsync(async () => {
      return await readFile(filePath, "utf-8");
    });

    if (readError) {
      continue; // File doesn't exist, try next
    }

    const [parseError, parsed] = await attemptAsync(async () => {
      const result = match(configFile.format)
        .with("yaml", () => parseYAML(content as string))
        .with("json", () => parseJSON(content as string))
        .with("jsonc", () => parseJSONC(content as string))
        .exhaustive();

      if (result === null) {
        throw new Error("Parser returned null");
      }

      return result as unknown;
    });

    if (parseError) {
      const errorMessage = match(parseError)
        .with(P.instanceOf(Error), (e) => e.message)
        .otherwise(() => "Parse error");
      return { status: "parse_error", message: errorMessage };
    }

    return validateConfig(parsed);
  }

  return { status: "not_found" };
}

/**
 * Validates raw config against new nested schema
 */
export function validateConfig(raw: unknown): ConfigLoadResult {
  const errors: string[] = [];

  if (typeof raw !== "object" || raw === null) {
    return { status: "validation_error", errors: ["Config must be an object"] };
  }

  const obj = raw as Record<string, unknown>;

  // Check version field
  if (!("version" in obj)) {
    return { status: "validation_error", errors: ["Missing required field: version"] };
  }

  if (obj.version !== 1) {
    return {
      status: "validation_error",
      errors: [`Invalid version: ${obj.version}. Expected: 1`],
    };
  }

  // At least one ecosystem section must be present
  const hasPlugins = "plugins" in obj;
  const hasCli = "cli" in obj;
  const hasMcp = "mcp" in obj;

  if (!hasPlugins && !hasCli && !hasMcp) {
    return {
      status: "validation_error",
      errors: ["At least one ecosystem section (plugins, cli, mcp) must be present"],
    };
  }

  const config: DependenciesConfig = { version: 1 };

  // Validate plugins section if present
  if (hasPlugins) {
    const pluginsResult = validateEcosystemSection(obj.plugins, "plugins");
    if (pluginsResult.errors.length > 0) {
      errors.push(...pluginsResult.errors);
    } else {
      config.plugins = pluginsResult.section;
    }
  }

  // Validate cli section if present (structure only for Phase 1)
  if (hasCli) {
    const cliResult = validateEcosystemSection(obj.cli, "cli");
    if (cliResult.errors.length > 0) {
      errors.push(...cliResult.errors);
    } else {
      config.cli = cliResult.section;
    }
  }

  // Validate mcp section if present (structure only for Phase 1)
  if (hasMcp) {
    const mcpResult = validateEcosystemSection(obj.mcp, "mcp");
    if (mcpResult.errors.length > 0) {
      errors.push(...mcpResult.errors);
    } else {
      config.mcp = mcpResult.section;
    }
  }

  if (errors.length > 0) {
    return { status: "validation_error", errors };
  }

  return { status: "success", config };
}

/**
 * Validates an ecosystem section structure
 */
function validateEcosystemSection(
  section: unknown,
  name: string,
): { section?: EcosystemSection; errors: string[] } {
  const errors: string[] = [];

  if (typeof section !== "object" || section === null) {
    return { errors: [`${name} section must be an object`] };
  }

  const obj = section as Record<string, unknown>;

  const required = obj.required ?? [];
  const optional = obj.optional ?? [];

  if (!Array.isArray(required)) {
    errors.push(`${name}.required must be an array`);
    return { errors };
  }

  if (!Array.isArray(optional)) {
    errors.push(`${name}.optional must be an array`);
    return { errors };
  }

  // For plugins section, validate entries deeply
  if (name === "plugins") {
    const validatedRequired = [];
    const validatedOptional = [];

    for (let i = 0; i < required.length; i++) {
      const entryErrors = validatePluginEntry(required[i], `${name}.required[${i}]`);
      if (entryErrors.length > 0) {
        errors.push(...entryErrors);
      } else {
        validatedRequired.push(required[i]);
      }
    }

    for (let i = 0; i < optional.length; i++) {
      const entryErrors = validatePluginEntry(optional[i], `${name}.optional[${i}]`);
      if (entryErrors.length > 0) {
        errors.push(...entryErrors);
      } else {
        validatedOptional.push(optional[i]);
      }
    }

    if (errors.length > 0) {
      return { errors };
    }

    return {
      section: {
        required: validatedRequired,
        optional: validatedOptional,
      },
      errors: [],
    };
  }

  // For cli/mcp sections, just validate structure (Phase 2/3)
  return {
    section: {
      required: required as any[],
      optional: optional as any[],
    },
    errors: [],
  };
}

/**
 * Validates a plugin entry
 */
function validatePluginEntry(entry: unknown, path: string): string[] {
  const errors: string[] = [];

  if (typeof entry !== "object" || entry === null) {
    return [`${path} must be an object`];
  }

  const obj = entry as Record<string, unknown>;

  // plugin field is required
  if (!("plugin" in obj)) {
    errors.push(`${path}: missing required field 'plugin'`);
  } else if (typeof obj.plugin !== "string") {
    errors.push(`${path}.plugin must be a string`);
  } else if (obj.plugin.trim() === "") {
    errors.push(`${path}.plugin must be non-empty`);
  }

  // Optional fields must be strings if present
  const optionalFields = ["github", "install", "description"];
  for (const field of optionalFields) {
    if (field in obj) {
      if (typeof obj[field] !== "string") {
        errors.push(`${path}.${field} must be a string`);
      }
    }
  }

  return errors;
}
