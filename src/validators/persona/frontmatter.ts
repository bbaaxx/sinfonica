import { basename } from "node:path";

import type { FrontmatterValidationResult, ValidationIssue, ValidationSeverity } from "./types.js";

const PERSONA_MODE = ["interactive", "subagent", "both"] as const;
const KNOWN_LICENSES = new Set([
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "ISC",
  "MPL-2.0",
  "UNLICENSED",
  "Proprietary"
]);

const kebabCasePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const emojiPattern = /^\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*$/u;
const spdxPattern = /^[A-Za-z0-9-.+]+$/;

type ParseResult = {
  frontmatter: Record<string, unknown> | null;
  error: string | null;
};

const issue = (ruleId: string, severity: ValidationSeverity, message: string): ValidationIssue => ({
  ruleId,
  severity,
  message
});

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

const parseFrontmatter = (content: string): ParseResult => {
  if (!content.startsWith("---\n") && content !== "---") {
    return { frontmatter: null, error: "FM-01: frontmatter block is missing" };
  }

  const closingIndex = content.indexOf("\n---", 4);
  if (closingIndex === -1) {
    return { frontmatter: null, error: "FM-11: frontmatter is malformed" };
  }

  const yaml = content.slice(4, closingIndex).trimEnd();
  const result: Record<string, unknown> = {};
  const lines = yaml.split(/\r?\n/);

  let currentArrayKey: string | null = null;
  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (currentArrayKey && trimmed.startsWith("- ")) {
      const nextValue = parseScalar(trimmed.slice(2));
      (result[currentArrayKey] as unknown[]).push(nextValue);
      continue;
    }

    currentArrayKey = null;

    const match = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!match) {
      return { frontmatter: null, error: "FM-11: frontmatter is malformed" };
    }

    const [, key, rawValue] = match;
    if (rawValue.trim() === "") {
      result[key] = [];
      currentArrayKey = key;
      continue;
    }

    result[key] = parseScalar(rawValue);
  }

  return { frontmatter: result, error: null };
};

const ensureStringLength = (
  frontmatter: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
  ruleId: string,
  errors: ValidationIssue[]
): void => {
  const value = frontmatter[key];
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    errors.push(issue(ruleId, "ERROR", `${key} must be ${min}-${max} characters`));
  }
};

export const validatePersonaFrontmatter = (
  filePath: string,
  content: string
): FrontmatterValidationResult => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const parsed = parseFrontmatter(content);
  if (!parsed.frontmatter) {
    errors.push(issue(parsed.error?.startsWith("FM-11") ? "FM-11" : "FM-01", "ERROR", parsed.error ?? "Invalid frontmatter"));
    return { errors, warnings, frontmatter: null };
  }

  const frontmatter = parsed.frontmatter;
  const personaId = frontmatter.persona_id;
  const expectedId = basename(filePath, ".md");

  if (typeof personaId !== "string" || personaId.trim().length === 0) {
    errors.push(issue("FM-02", "ERROR", "persona_id is required"));
  } else {
    if (!kebabCasePattern.test(personaId)) {
      errors.push(issue("FM-02", "ERROR", "persona_id must be kebab-case"));
    }
    if (personaId !== expectedId) {
      errors.push(issue("FM-02", "ERROR", `persona_id must match filename (${expectedId})`));
    }
  }

  ensureStringLength(frontmatter, "name", 1, 50, "FM-03", errors);
  ensureStringLength(frontmatter, "role", 1, 100, "FM-04", errors);
  ensureStringLength(frontmatter, "description", 1, 200, "FM-05", errors);

  if (frontmatter.persona_mode !== undefined) {
    if (typeof frontmatter.persona_mode !== "string" || !PERSONA_MODE.includes(frontmatter.persona_mode as (typeof PERSONA_MODE)[number])) {
      warnings.push(issue("FM-06", "WARN", "persona_mode must be interactive, subagent, or both"));
    }
  }

  if (frontmatter.version !== undefined) {
    if (typeof frontmatter.version !== "string" || !semverPattern.test(frontmatter.version)) {
      warnings.push(issue("FM-07", "WARN", "version should be valid semver"));
    }
  }

  if (frontmatter.icon !== undefined) {
    if (typeof frontmatter.icon !== "string" || !emojiPattern.test(frontmatter.icon)) {
      warnings.push(issue("FM-08", "WARN", "icon should be a single emoji"));
    }
  }

  if (frontmatter.capabilities !== undefined) {
    if (!Array.isArray(frontmatter.capabilities)) {
      warnings.push(issue("FM-09", "WARN", "capabilities should be an array"));
    } else {
      if (frontmatter.capabilities.length > 10) {
        warnings.push(issue("FM-09", "WARN", "capabilities must contain at most 10 entries"));
      }
      const invalidCapability = frontmatter.capabilities.some(
        (item) => typeof item !== "string" || item.length === 0 || item.length > 50
      );
      if (invalidCapability) {
        warnings.push(issue("FM-09", "WARN", "each capability must be 1-50 characters"));
      }
    }
  }

  if (frontmatter.author !== undefined) {
    if (typeof frontmatter.author !== "string" || frontmatter.author.length > 100 || frontmatter.author.length === 0) {
      warnings.push(issue("FM-10", "WARN", "author should be 1-100 characters"));
    }
  }

  if (frontmatter.license !== undefined) {
    const value = frontmatter.license;
    if (typeof value !== "string" || value.length === 0 || (!KNOWN_LICENSES.has(value) && !spdxPattern.test(value))) {
      warnings.push(issue("FM-11", "WARN", "license should be a valid SPDX identifier or Proprietary"));
    }
  }

  return { errors, warnings, frontmatter };
};
