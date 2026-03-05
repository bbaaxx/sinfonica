import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

import { validatePersonaPaths } from "../validators/persona/validator.js";
import { fileExists } from "./fs-utils.js";

// Re-export all types from types.ts for backward compatibility
export type {
  GeneratePersonaArtifactsOptions,
  LoadedPersona,
  LoadPersonaOptions,
  OpencodeAgentEntry,
  PersonaConfig,
  PersonaMode,
  PersonaPermissions,
  PersonaProfile,
  PersonaSections,
  StubGeneratorOptions
} from "./types.js";

// Re-export stub-generator public API for backward compatibility
export {
  generateAllArtifacts as generatePersonaArtifacts,
  generateStub,
  PERSONA_PROFILES
} from "./stub-generator.js";

import type { LoadedPersona, LoadPersonaOptions } from "./types.js";

const parseScalar = (rawValue: string): unknown => {
  const value = rawValue.trim();
  if (value === "") {
    return "";
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return value;
};

const parseFrontmatter = (content: string): { frontmatter: Record<string, unknown>; body: string } => {
  if (!content.startsWith("---\n")) {
    throw new Error("Missing frontmatter");
  }

  const closingIndex = content.indexOf("\n---", 4);
  if (closingIndex === -1) {
    throw new Error("Malformed frontmatter");
  }

  const yaml = content.slice(4, closingIndex).trimEnd();
  const body = content.slice(closingIndex + 4).replace(/^\s+/, "");
  const frontmatter: Record<string, unknown> = {};

  let currentArrayKey: string | null = null;
  for (const line of yaml.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (currentArrayKey && trimmed.startsWith("- ")) {
      (frontmatter[currentArrayKey] as unknown[]).push(parseScalar(trimmed.slice(2)));
      continue;
    }
    currentArrayKey = null;

    const match = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!match) {
      throw new Error("Malformed frontmatter");
    }

    const [, key, rawValue] = match;
    if (rawValue.trim() === "") {
      frontmatter[key] = [];
      currentArrayKey = key;
      continue;
    }
    frontmatter[key] = parseScalar(rawValue);
  }

  return { frontmatter, body };
};

const frameworkDirFromModule = (): string => {
  const here = dirname(new URL(import.meta.url).pathname);
  const candidates = [resolve(here, "../../agents"), resolve(here, "../../../agents")];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
};

export const loadPersona = async (options: LoadPersonaOptions): Promise<LoadedPersona> => {
  const overridePath = join(options.cwd, ".sinfonica/agents", `${options.personaId}.md`);
  const frameworkDir = options.frameworkAgentsDir ?? frameworkDirFromModule();
  const fallbackPath = join(frameworkDir, `${options.personaId}.md`);

  let sourcePath: string;
  let sourceType: "override" | "framework";

  if (options.forceFramework || !(await fileExists(overridePath))) {
    sourcePath = fallbackPath;
    sourceType = "framework";
  } else {
    sourcePath = overridePath;
    sourceType = "override";
  }

  if (!(await fileExists(sourcePath))) {
    throw new Error(`Persona file not found for ${options.personaId}`);
  }

  const validation = await validatePersonaPaths(sourcePath, false);
  if (validation.errorCount > 0) {
    throw new Error(`Persona validation failed for ${options.personaId}`);
  }

  const content = await readFile(sourcePath, "utf8");
  const parsed = parseFrontmatter(content);

  let sidecarMemoryPath: string | undefined;
  if (options.sidecarMemoryEnabled) {
    const candidate = join(options.cwd, ".sinfonica/memory", `${options.personaId}.md`);
    if (await fileExists(candidate)) {
      sidecarMemoryPath = candidate;
    }
  }

  return {
    id: options.personaId,
    sourcePath,
    sourceType,
    frontmatter: parsed.frontmatter,
    body: parsed.body,
    ...(sidecarMemoryPath ? { sidecarMemoryPath } : {})
  };
};

export const personaFilename = (path: string): string => basename(path);
