// New nested schema types for version 1

export interface DependenciesConfig {
  version: 1;
  plugins?: EcosystemSection;
  cli?: EcosystemSection;
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

// Registry types
export interface InstalledPluginsRegistry {
  plugins: Record<string, PluginInstallation[]>;
}

export interface PluginInstallation {
  scope: "global" | "project";
  projectPath?: string;
}

// Hook response
export interface HookResponse {
  systemMessage?: string;
}

// Check result
export interface CheckResult {
  missingRequired: PluginDependency[];
  missingOptional: PluginDependency[];
}
