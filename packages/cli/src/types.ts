// Re-export shared types from utils
export type {
  DependenciesConfig,
  EcosystemSection,
  PluginDependency,
  CliToolDependency,
  DependencyEntry,
  ValidationResult,
  ConfigLoadResult,
} from "@anthropak/utils";

export type Mode = "plugin" | "repo";

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

// Claude Code hook types (settings.json and plugin hooks.json format)
export interface ClaudeHookHandler {
  type: "command";
  command: string;
  timeout?: number;
}

export interface ClaudeHookMatcherGroup {
  matcher?: string;
  hooks: ClaudeHookHandler[];
}

export type ClaudeHooksConfig = Record<string, ClaudeHookMatcherGroup[]>;

export interface SettingsJson {
  hooks?: ClaudeHooksConfig;
  [key: string]: unknown;
}

// Plugin hooks.json is the same structure as the hooks portion of settings.json
export type PluginHooksJson = ClaudeHooksConfig;
