// Re-export shared types from utils
import type { PluginDependency, CliToolDependency } from "@anthropak/utils";
export type {
  DependenciesConfig,
  EcosystemSection,
  PluginDependency,
  CliToolDependency,
  DependencyEntry,
  ValidationResult,
  ConfigLoadResult,
} from "@anthropak/utils";

// Registry types
export interface InstalledPluginsRegistry {
  plugins: Record<string, PluginInstallation[]>;
}

export interface PluginInstallation {
  scope: "global" | "project";
  projectPath?: string;
}

// Hook response
export interface SessionStartResponse {
  systemMessage: string;
  hookSpecificOutput: {
    hookEventName: "SessionStart";
    additionalContext: string;
  };
}

export interface UserPromptSubmitBlockResponse {
  decision: "block";
  reason: string;
}

export type HookResponse =
  | Record<string, never>
  | SessionStartResponse
  | UserPromptSubmitBlockResponse;

export interface HookStdinData {
  hook_event_name: string;
  session_id: string;
  [key: string]: unknown;
}

export interface CacheData {
  blocked: boolean;
  reason: string;
}

export interface DependencyCheckResult {
  response: HookResponse;
  cache: CacheData;
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
