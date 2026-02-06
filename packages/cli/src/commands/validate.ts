// Validate command - provides detailed error output for config validation
import * as p from "@clack/prompts";
import { resolve } from "node:path";
import { match } from "ts-pattern";
import type { CommandModule } from "yargs";
import { loadConfig } from "../lib/config-loader.js";
import type { ValidateOptions } from "../types.js";

const command: CommandModule<object, ValidateOptions> = {
  command: "validate [path]",
  describe: "Validate dependencies.yaml configuration",
  builder: (yargs) =>
    yargs.positional("path", {
      describe: "Plugin/project root directory",
      default: ".",
      type: "string",
    }),
  handler: async (argv) => {
    const root = resolve(argv.path);

    p.intro("Validating dependencies.yaml");
    p.log.info(`Root: ${root}`);

    const result = await loadConfig(root);

    match(result)
      .with({ status: "not_found" }, () => {
        p.log.error("No dependencies.yaml found");
        p.log.info("Run `anthropak init` to create one");
        p.outro("Validation failed");
        process.exit(1);
      })
      .with({ status: "parse_error" }, ({ message }) => {
        p.log.error(`Parse error: ${message}`);
        p.log.info("Check that your YAML/JSON syntax is correct and the file is valid");
        p.outro("Validation failed");
        process.exit(1);
      })
      .with({ status: "validation_error" }, ({ errors }) => {
        p.log.error("Validation errors found:");
        errors.forEach((error) => {
          p.log.error(`  • ${error}`);
        });
        p.log.info("\nSuggestions:");
        p.log.info("  • Ensure version: 1 is present");
        p.log.info("  • Include at least one ecosystem section (plugins, cli, or mcp)");
        p.log.info("  • Each section must have required and optional arrays");
        p.log.info("  • Each plugin entry must have a 'plugin' field (string)");
        p.outro("Validation failed");
        process.exit(1);
      })
      .with({ status: "success" }, ({ config }) => {
        const pluginCount = {
          required: config.plugins?.required.length ?? 0,
          optional: config.plugins?.optional.length ?? 0,
        };
        const cliCount = {
          required: config.cli?.required.length ?? 0,
          optional: config.cli?.optional.length ?? 0,
        };
        const mcpCount = {
          required: config.mcp?.required.length ?? 0,
          optional: config.mcp?.optional.length ?? 0,
        };

        p.log.success("dependencies.yaml is valid");
        p.log.info("\nSummary:");

        if (config.plugins) {
          p.log.info(
            `  Plugins: ${pluginCount.required} required, ${pluginCount.optional} optional`,
          );
        }
        if (config.cli) {
          p.log.info(`  CLI tools: ${cliCount.required} required, ${cliCount.optional} optional`);
        }
        if (config.mcp) {
          p.log.info(`  MCP servers: ${mcpCount.required} required, ${mcpCount.optional} optional`);
        }

        p.outro("Validation complete");
      })
      .exhaustive();
  },
};

export default command;
