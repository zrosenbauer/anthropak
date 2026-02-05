/**
 * @fileoverview Type definitions for the check-deps hook.
 */

/**
 * Represents a plugin dependency declaration.
 */
export interface PluginDependency {
  /** The plugin identifier/name */
  plugin: string;
  /** Optional marketplace identifier */
  marketplace?: string;
  /** Optional GitHub repository in "owner/repo" format */
  github?: string;
  /** Optional human-readable description */
  description?: string;
  /** Optional custom install command */
  install?: string;
}

/**
 * Parsed structure of dependencies config file.
 */
export interface ParsedDependencies {
  /** Required plugin dependencies */
  required: PluginDependency[];
  /** Optional plugin dependencies */
  optional: PluginDependency[];
}

/**
 * Raw config file structure before validation.
 */
export interface RawConfig {
  dependencies?: {
    required?: unknown[];
    optional?: unknown[];
  };
}

/**
 * Represents a single plugin installation record.
 */
export interface PluginInstallation {
  /** Installation scope */
  scope: "global" | "project";
  /** Project path for project-scoped installations */
  projectPath?: string;
}

/**
 * Structure of Claude's installed plugins registry.
 */
export interface InstalledPluginsRegistry {
  /** Map of plugin keys to installations */
  plugins: Record<string, PluginInstallation[]>;
}

/**
 * Response structure for the hook output.
 */
export interface HookResponse {
  /** Optional system message to display */
  systemMessage?: string;
}

/**
 * Result of config validation.
 */
export interface ValidationResult {
  /** Whether validation succeeded */
  valid: boolean;
  /** Validation errors if any */
  errors: string[];
  /** Parsed dependencies if valid */
  data?: ParsedDependencies;
}
