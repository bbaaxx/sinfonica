import { createRequire } from "node:module";
import { constants } from "node:fs";
import { access, copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const loadFrameworkVersion = (): string => {
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

  return "0.0.0";
};

const FRAMEWORK_VERSION = loadFrameworkVersion();

import { generateWorkflowStubs } from "./generate-stubs.js";
import { generatePersonaArtifacts } from "../persona/loader.js";
import { PERSONA_PROFILES } from "../persona/stub-generator.js";
import { mergeOpenCodeConfig } from "../../surfaces/opencode/src/config.js";
import {
  createConsolePrompt,
  type PromptFn,
  runInitWizard,
  type WizardConfig
} from "./wizard.js";

type PersonaMode = "interactive" | "subagent" | "both";

type FrameworkPersona = {
  id: string;
  title: string;
  mode: PersonaMode;
};

type InitProjectOptions = {
  config?: WizardConfig;
  overwriteConfig?: boolean;
  force?: boolean;
};

type PiSkillStub = {
  name: string;
  description: string;
  workflowId: string;
};

export type RunInitCommandOptions = {
  cwd?: string;
  yes?: boolean;
  force?: boolean;
  prompt?: PromptFn;
};

export const FRAMEWORK_PERSONAS: FrameworkPersona[] = [
  { id: "maestro", title: "Maestro", mode: "interactive" },
  { id: "libretto", title: "Libretto", mode: "subagent" },
  { id: "amadeus", title: "Amadeus", mode: "subagent" },
  { id: "coda", title: "Coda", mode: "subagent" },
  { id: "rondo", title: "Rondo", mode: "subagent" },
  { id: "metronome", title: "Metronome", mode: "subagent" }
];

export const INTERACTIVE_PERSONAS = FRAMEWORK_PERSONAS.filter(
  ({ mode }) => mode === "interactive" || mode === "both"
).map(({ id }) => id);

const DEFAULT_CONFIG: WizardConfig = {
  projectName: "",
  userName: "",
  skillLevel: "intermediate",
  enforcementStrictness: "medium"
};

const PI_SKILL_STUBS: PiSkillStub[] = [
  {
    name: "create-prd",
    description: "Start the Sinfonica create-prd workflow for product requirement documents.",
    workflowId: "create-prd"
  },
  {
    name: "create-spec",
    description: "Start the Sinfonica create-spec workflow for technical specifications.",
    workflowId: "create-spec"
  },
  {
    name: "dev-story",
    description: "Start the Sinfonica dev-story workflow for implementation tasks.",
    workflowId: "dev-story"
  },
  {
    name: "code-review",
    description: "Start the Sinfonica code-review workflow for change reviews.",
    workflowId: "code-review"
  }
];

const quoteYaml = (value: string): string => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const toConfigYaml = (config: WizardConfig): string => `version: "0.1"
sinfonica_version: "${FRAMEWORK_VERSION}"
default_orchestrator: maestro
project_name: "${quoteYaml(config.projectName)}"
user_name: "${quoteYaml(config.userName)}"
skill_level: ${config.skillLevel}
enforcement_strictness: ${config.enforcementStrictness}
`;

const ENFORCEMENT_PLUGIN = `/**
 * Sinfonica Enforcement Plugin
 *
 * Registers enforcement rules that intercept agent tool calls, session events,
 * and shell environment injection to enforce project quality standards.
 *
 * Rules:
 *   ENF-001  TDD Enforcer          — blocks writes without a corresponding test change
 *   ENF-002  Secret Protection     — blocks reads/writes to sensitive credential files
 *   ENF-003  Compaction Preservation — injects workflow state into compaction context
 *   ENF-004  Spec Stop Guard       — warns when workflow has incomplete steps at idle
 *   ENF-005  Shell Env Injection   — injects SINFONICA_* env vars into every shell call
 *   ENF-007  Session-End Completeness — warns on session idle if steps are incomplete
 */

import type { Plugin } from "@opencode/plugin";

import { loadSinfonicaConfig } from "../../src/enforcement/utils.js";
import { createTddEnforcerHandler } from "../../src/enforcement/rules/enf-001-tdd.js";
import { createSecretProtectionHandler } from "../../src/enforcement/rules/enf-002-secrets.js";
import { createCompactionHandler } from "../../src/enforcement/rules/enf-003-compaction.js";
import { createSpecStopGuardHandler } from "../../src/enforcement/rules/enf-004-spec-stop.js";
import { createShellEnvHandler } from "../../src/enforcement/rules/enf-005-shell-env.js";
import { createCompletenessWarningHandler } from "../../src/enforcement/rules/enf-007-completeness.js";

const SinfonicaEnforcement: Plugin = async ({ project, directory }) => {
  const cwd = directory ?? project ?? process.cwd();

  // Load config non-blocking — enforcement degrades gracefully if config missing
  const config = await loadSinfonicaConfig(cwd).catch(() => null);

  return {
    "tool.execute.before": async (params) => {
      // ENF-001: TDD Enforcer
      const tddResult = await createTddEnforcerHandler(cwd)(params).catch(() => null);
      if (tddResult?.block) return tddResult;

      // ENF-002: Secret Protection
      const secretResult = await createSecretProtectionHandler(cwd)(params).catch(() => null);
      if (secretResult?.block) return secretResult;

      return undefined;
    },

    "experimental.session.compacting": async (params) => {
      // ENF-003: Compaction State Preservation
      return createCompactionHandler(cwd)(params).catch(() => undefined);
    },

    "session.idle": async (params) => {
      // ENF-004: Spec Stop Guard
      await createSpecStopGuardHandler(cwd)(params).catch(() => undefined);

      // ENF-007: Session-End Completeness Warning
      await createCompletenessWarningHandler(cwd)(params).catch(() => undefined);
    },

    "shell.env": async () => {
      // ENF-005: Shell Env Injection
      return createShellEnvHandler(cwd)().catch(() => ({}));
    },
  };
};

export default SinfonicaEnforcement;
`;

const ensureDirectory = async (path: string): Promise<void> => {
  await mkdir(path, { recursive: true });
};

const ensureParentDirectory = async (path: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
};

const copyFileIfMissing = async (sourcePath: string, targetPath: string): Promise<boolean> => {
  try {
    await access(targetPath, constants.F_OK);
    return false;
  } catch {
    await ensureParentDirectory(targetPath);
    await copyFile(sourcePath, targetPath);
    return true;
  }
};

const writeIfMissing = async (path: string, content: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return false;
  } catch {
    await ensureParentDirectory(path);
    await writeFile(path, content, "utf8");
    return true;
  }
};

const readJson = async (path: string): Promise<Record<string, unknown> | null> => {
  try {
    const data = await readFile(path, "utf8");
    const parsed = JSON.parse(data) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new Error("opencode.json must contain a JSON object");
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

const toPiPackageConfig = (): Record<string, unknown> => ({
  name: "sinfonica-pi-workflows",
  private: true,
  version: "0.0.0",
  type: "module",
  pi: {
    skills: ["./skills"]
  }
});

const toPiSkillStub = (skill: PiSkillStub): string => `---
name: ${skill.name}
description: ${skill.description}
---

# ${skill.name}

Use this skill when the user asks to run the ${skill.workflowId} workflow.

## Start workflow

Use the \`sinfonica_start_workflow\` tool with:

- \`workflowType: ${skill.workflowId}\`
- \`context\` (optional)
`;

const writePiPackageConfig = async (cwd: string, force: boolean): Promise<void> => {
  const packagePath = join(cwd, ".pi/package.json");
  const packageText = `${JSON.stringify(toPiPackageConfig(), null, 2)}\n`;

  if (force) {
    await ensureParentDirectory(packagePath);
    await writeFile(packagePath, packageText, "utf8");
    return;
  }

  await writeIfMissing(packagePath, packageText);
};

const writePiSkillStubs = async (cwd: string, force: boolean): Promise<void> => {
  for (const skill of PI_SKILL_STUBS) {
    const skillPath = join(cwd, ".pi/skills", skill.name, "SKILL.md");
    const content = toPiSkillStub(skill);

    if (force) {
      await ensureParentDirectory(skillPath);
      await writeFile(skillPath, content, "utf8");
      continue;
    }

    await writeIfMissing(skillPath, content);
  }
};

const writeOpenCodeConfig = async (cwd: string): Promise<void> => {
  const path = join(cwd, ".opencode/opencode.json");
  const existing = await readJson(path);
  const next = mergeOpenCodeConfig(existing ?? {}, PERSONA_PROFILES);
  const nextText = `${JSON.stringify(next, null, 2)}\n`;

  if (existing !== null) {
    const existingText = await readFile(path, "utf8");
    if (existingText === nextText) {
      return;
    }
  }

  await writeFile(path, nextText, "utf8");
};

const resolveFrameworkWorkflowsDir = async (): Promise<string | null> => {
  const candidates = [
    fileURLToPath(new URL("../../workflows", import.meta.url)),
    fileURLToPath(new URL("../../../workflows", import.meta.url))
  ];

  for (const candidate of candidates) {
    try {
      const details = await stat(candidate);
      if (details.isDirectory()) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  return null;
};

const copyDirectoryTree = async (sourceDir: string, targetDir: string, force: boolean): Promise<void> => {
  await ensureDirectory(targetDir);
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const sourcePath = join(sourceDir, entry.name);
    const targetPath = join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDirectoryTree(sourcePath, targetPath, force);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (force) {
      await ensureParentDirectory(targetPath);
      await copyFile(sourcePath, targetPath);
      continue;
    }

    await copyFileIfMissing(sourcePath, targetPath);
  }
};

const scaffoldWorkflows = async (cwd: string, force: boolean): Promise<void> => {
  const targetDir = join(cwd, ".sinfonica/workflows");
  await ensureDirectory(targetDir);

  const sourceDir = await resolveFrameworkWorkflowsDir();
  if (!sourceDir) {
    console.warn("[sinfonica:init] Framework workflows directory not found; created empty .sinfonica/workflows.");
    return;
  }

  await copyDirectoryTree(sourceDir, targetDir, force);
};

const readInstalledVersion = async (cwd: string): Promise<string | null> => {
  try {
    const content = await readFile(join(cwd, ".sinfonica/config.yaml"), "utf8");
    const match = content.match(/^sinfonica_version:\s*"?([^"\n]+)"?\s*$/m);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

const updateConfigVersion = async (cwd: string): Promise<void> => {
  const configPath = join(cwd, ".sinfonica/config.yaml");
  try {
    let content = await readFile(configPath, "utf8");
    if (/^sinfonica_version:/m.test(content)) {
      content = content.replace(/^sinfonica_version:.*$/m, `sinfonica_version: "${FRAMEWORK_VERSION}"`);
    } else {
      // Insert after the version line
      content = content.replace(/^(version:.*\n)/m, `$1sinfonica_version: "${FRAMEWORK_VERSION}"\n`);
    }
    await writeFile(configPath, content, "utf8");
  } catch {
    // Config doesn't exist yet — will be created by initProject
  }
};

const ensureSinfonicaRootIsDirectory = async (cwd: string): Promise<void> => {
  const path = join(cwd, ".sinfonica");

  try {
    const details = await stat(path);
    if (!details.isDirectory()) {
      throw new Error(".sinfonica exists as a file");
    }
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
};

const hasExistingInit = async (cwd: string): Promise<boolean> => {
  try {
    const details = await stat(join(cwd, ".sinfonica/config.yaml"));
    return details.isFile();
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
};

export const initProject = async (
  cwd: string = process.cwd(),
  options: InitProjectOptions = {}
): Promise<void> => {
  const force = options.force ?? false;

  await ensureSinfonicaRootIsDirectory(cwd);

  await ensureDirectory(join(cwd, ".sinfonica/agents"));
  await ensureDirectory(join(cwd, ".sinfonica/handoffs"));
  await ensureDirectory(join(cwd, ".sinfonica/memory"));
  await scaffoldWorkflows(cwd, force);

  const configPath = join(cwd, ".sinfonica/config.yaml");
  const configYaml = toConfigYaml(options.config ?? DEFAULT_CONFIG);
  if (options.overwriteConfig) {
    await writeFile(configPath, configYaml, "utf8");
  } else {
    await writeIfMissing(configPath, configYaml);
    // Stamp framework version in existing config without overwriting user preferences
    await updateConfigVersion(cwd);
  }

  const enforcementPluginPath = join(cwd, ".opencode/plugins/sinfonica-enforcement.ts");
  if (force) {
    await ensureParentDirectory(enforcementPluginPath);
    await writeFile(enforcementPluginPath, ENFORCEMENT_PLUGIN, "utf8");
  } else {
    await writeIfMissing(enforcementPluginPath, ENFORCEMENT_PLUGIN);
  }

  await writeOpenCodeConfig(cwd);
  await writePiPackageConfig(cwd, force);
  await writePiSkillStubs(cwd, force);
  await generatePersonaArtifacts({ cwd, force });
  await generateWorkflowStubs(cwd, force);
};

export const runInitCommand = async (options: RunInitCommandOptions = {}): Promise<void> => {
  const cwd = options.cwd ?? process.cwd();
  const yes = Boolean(options.yes);
  const force = Boolean(options.force);
  const previous = await hasExistingInit(cwd);

  // Version check when re-initializing
  if (previous) {
    const installedVersion = await readInstalledVersion(cwd);
    if (installedVersion && installedVersion !== FRAMEWORK_VERSION) {
      if (force) {
        console.error(`\x1b[36m↻ Force-refreshing all generated files (framework ${installedVersion} → ${FRAMEWORK_VERSION})\x1b[0m`);
      } else {
        console.error(`\x1b[33mℹ Framework version changed: ${installedVersion} → ${FRAMEWORK_VERSION}`);
        console.error(`  Run 'sinfonica init --force' to update all generated files.\x1b[0m`);
      }
    } else if (force) {
      console.error(`\x1b[36m↻ Force-refreshing all generated files\x1b[0m`);
    }
  }

  let closePrompt: (() => void) | undefined;
  let prompt = options.prompt;

  if (!yes && !prompt) {
    const consolePrompt = createConsolePrompt();
    prompt = consolePrompt.prompt;
    closePrompt = consolePrompt.close;
  }

  try {
    const wizard = await runInitWizard({
      yes,
      hasPreviousInit: previous,
      ...(prompt ? { prompt } : {})
    });

    if (wizard.action === "cancel") {
      return;
    }

    if (wizard.action === "resume") {
      await initProject(cwd, { force });
      return;
    }

    await initProject(cwd, {
      config: wizard.config,
      overwriteConfig: previous,
      force
    });
  } finally {
    if (closePrompt) {
      closePrompt();
    }
  }
};
