// CLI-specific types and re-exported hook types
// Hook types duplicated here since CLI and hook are separate runtime packages

// ============================================================================
// Schema types (synced with hook package)
// ============================================================================

export interface DependenciesConfig {
  version: 1;
  plugins?: EcosystemSection;
  cli_tools?: EcosystemSection;
  mcp?: EcosystemSection;
}

export interface EcosystemSection {
  required: DependencyEntry[];
  optional: DependencyEntry[];
}

export interface PluginDependency {
  plugin: string;
  github?: string;
  install?: string;
  description?: string;
}

export interface CliToolDependency {
  name: string;
  install: string;
}

// Phase 1: DependencyEntry is same as PluginDependency
// CLI and MCP entries will extend in later phases
export type DependencyEntry = PluginDependency;

// Discriminated union for validation results
export type ValidationResult =
  | { status: "success"; config: DependenciesConfig }
  | { status: "not_found" }
  | { status: "parse_error"; message: string }
  | { status: "validation_error"; errors: string[] };

// Alias for config loading (same structure)
export type ConfigLoadResult = ValidationResult;

// ============================================================================
// CLI-specific types
// ============================================================================

export type InitMode = "plugin" | "repo";

export interface InitOptions {
  path: string;
  force: boolean;
  yes: boolean;
}

export interface UpdateOptions {
  path: string;
  yes: boolean;
}

export interface ValidateOptions {
  path: string;
}

export interface FileAction {
  path: string;
  action: "create" | "update" | "skip";
  reason?: string;
}

// Hooks.json types
export interface HooksJson {
  SessionStart?: HookEntry[];
}

export interface HookEntry {
  name: string;
  script: string;
}
