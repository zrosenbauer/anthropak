import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseYAML, parseJSON, parseJSONC } from "confbox";
import type { PluginDependency, RawConfig, ValidationResult } from "../types.js";
import { CONFIG_FILES } from "./constants.js";

/**
 * Loads the dependencies config from the plugin root.
 * Discovers and parses dependencies.{yaml,yml,json,jsonc}
 *
 * @param pluginRoot - Root directory of the plugin
 * @returns Parsed config object or null if not found or invalid
 */
export function loadConfig(pluginRoot: string): RawConfig | null {
  for (const { name, ext } of CONFIG_FILES) {
    const path = join(pluginRoot, name);
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, "utf8");
        switch (ext) {
          case "yaml":
            return parseYAML(content) as RawConfig;
          case "json":
            return parseJSON(content) as RawConfig;
          case "jsonc":
            return parseJSONC(content) as RawConfig;
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Validates a single dependency object and returns errors.
 */
function validateDependency(dep: unknown, index: number, section: string): string[] {
  const errors: string[] = [];
  const prefix = `dependencies.${section}[${index}]`;

  if (typeof dep !== "object" || dep === null) {
    errors.push(`${prefix}: must be an object`);
    return errors;
  }

  const obj = dep as Record<string, unknown>;

  if (!("plugin" in obj)) {
    errors.push(`${prefix}: missing required field 'plugin'`);
  } else if (typeof obj.plugin !== "string") {
    errors.push(`${prefix}.plugin: must be a string`);
  } else if (obj.plugin.trim() === "") {
    errors.push(`${prefix}.plugin: must be a non-empty string`);
  }

  const optionalFields = ["marketplace", "github", "description", "install"];
  for (const field of optionalFields) {
    if (field in obj) {
      if (typeof obj[field] !== "string") {
        errors.push(`${prefix}.${field}: must be a string`);
      } else if (obj[field] === "") {
        errors.push(`${prefix}.${field}: cannot be empty`);
      }
    }
  }

  return errors;
}

/**
 * Constructs a PluginDependency from a validated object.
 */
function toDependency(obj: Record<string, unknown>): PluginDependency {
  const dep: PluginDependency = {
    plugin: obj.plugin as string,
  };
  if (typeof obj.marketplace === "string") dep.marketplace = obj.marketplace;
  if (typeof obj.github === "string") dep.github = obj.github;
  if (typeof obj.description === "string") dep.description = obj.description;
  if (typeof obj.install === "string") dep.install = obj.install;
  return dep;
}

/**
 * Validates a raw config object and returns parsed dependencies.
 *
 * @param config - Raw config from loadConfig
 * @returns Validation result with errors or parsed data
 */
export function validateConfig(config: RawConfig): ValidationResult {
  const errors: string[] = [];

  if (!config.dependencies) {
    errors.push("Missing 'dependencies' root object");
    return { valid: false, errors };
  }

  if (typeof config.dependencies !== "object" || config.dependencies === null) {
    errors.push("'dependencies' must be an object");
    return { valid: false, errors };
  }

  const deps = config.dependencies;

  if ("required" in deps && !Array.isArray(deps.required)) {
    errors.push("'dependencies.required' must be an array");
  }

  if ("optional" in deps && !Array.isArray(deps.optional)) {
    errors.push("'dependencies.optional' must be an array");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const required: PluginDependency[] = [];
  const optional: PluginDependency[] = [];

  const requiredArr = (deps.required || []) as unknown[];
  for (let i = 0; i < requiredArr.length; i++) {
    const depErrors = validateDependency(requiredArr[i], i, "required");
    if (depErrors.length > 0) {
      errors.push(...depErrors);
    } else {
      required.push(toDependency(requiredArr[i] as Record<string, unknown>));
    }
  }

  const optionalArr = (deps.optional || []) as unknown[];
  for (let i = 0; i < optionalArr.length; i++) {
    const depErrors = validateDependency(optionalArr[i], i, "optional");
    if (depErrors.length > 0) {
      errors.push(...depErrors);
    } else {
      optional.push(toDependency(optionalArr[i] as Record<string, unknown>));
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: { required, optional },
  };
}
