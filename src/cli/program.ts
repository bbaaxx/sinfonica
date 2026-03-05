import { createRequire } from "node:module";

import { Command } from "commander";

import { runInitCommand } from "./init.js";
import { runValidateCommand } from "./validate.js";
import { runRulesCommand } from "./rules.js";

const require = createRequire(import.meta.url);

const loadVersion = (): string => {
  const candidates = ["../../package.json", "../../../package.json"];
  for (const candidate of candidates) {
    try {
      const pkg = require(candidate) as { version?: string };
      if (typeof pkg.version === "string" && pkg.version.length > 0) {
        return pkg.version;
      }
    } catch {
      continue;
    }
  }

  return "unknown";
};

const version = loadVersion();

export const createProgram = (): Command => {
  const program = new Command();

  program
    .name("sinfonica")
    .description("Sinfonica CLI")
    .version(`sinfonica/${version}`, "-V, --version");

  program
    .command("init")
    .description("Initialize Sinfonica project structure")
    .option("-y, --yes", "Run non-interactively with defaults")
    .option("-f, --force", "Force-refresh all generated files (useful after framework upgrades)")
    .action(async (options: { yes?: boolean; force?: boolean }) => {
      await runInitCommand({ yes: Boolean(options.yes), force: Boolean(options.force) });
    });

  program
    .command("validate")
    .description("Validate persona markdown files")
    .argument("<path>", "Path to persona file or directory")
    .option("--all", "Validate all markdown files recursively")
    .action(async (pathArg: string, options: { all?: boolean }) => {
      const exitCode = await runValidateCommand(pathArg, { all: Boolean(options.all) });
      if (exitCode !== 0) {
        process.exitCode = exitCode;
      }
    });

  program
    .command("rules")
    .description("List all registered enforcement rules")
    .option("--json", "Output rules as JSON")
    .action(async (options: { json?: boolean }) => {
      const exitCode = await runRulesCommand({ json: Boolean(options.json) });
      if (exitCode !== 0) {
        process.exitCode = exitCode;
      }
    });

  return program;
};
