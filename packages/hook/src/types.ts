// New nested schema types for version 1

export interface DependenciesConfig {
  version: 1;
  plugins?: EcosystemSection;
  cli_tools?: EcosystemSection; // Phase 2: Renamed from 'cli' per CONTEXT.md
  mcp?: EcosystemSection;
}

// Generic ecosystem section - entries vary by ecosystem
// plugins entries: PluginDependency shape
// cli_tools entries: CliToolDependency shape
// mcp entries: (Phase 3)
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

// Phase 2: DependencyEntry now includes CLI tool dependencies
export type DependencyEntry = PluginDependency | CliToolDependency;

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

export interface CliToolCheckResult {
  missingRequired: CliToolDependency[];
  missingOptional: CliToolDependency[];
  totalRequired: number;
  totalOptional: number;
}
