import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export type EnforcementSeverity = "blocking" | "advisory" | "injection";

export type EnforcementRuleDefinition = {
  id: string;
  severity: EnforcementSeverity;
  patterns: string[];
  message?: string;
  inject?: string;
  fileName?: string;
};

const RULE_FILE_PATTERN = /\.(json|md|markdown|ya?ml)$/i;

const isSeverity = (value: string): value is EnforcementSeverity => {
  return value === "blocking" || value === "advisory" || value === "injection";
};

const parseScalar = (value: string): string => {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const parseFrontmatter = (raw: string): Record<string, unknown> => {
  if (!raw.startsWith("---\n")) {
    return {};
  }

  const closingIndex = raw.indexOf("\n---", 4);
  if (closingIndex === -1) {
    return {};
  }

  const frontmatterText = raw.slice(4, closingIndex).trimEnd();
  const result: Record<string, unknown> = {};
  let currentListKey: string | null = null;

  for (const rawLine of frontmatterText.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line.trim().length === 0 || line.trim().startsWith("#")) {
      continue;
    }

    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && currentListKey) {
      const existing = result[currentListKey];
      const value = parseScalar(listItem[1]);
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        result[currentListKey] = [value];
      }
      continue;
    }

    const keyValue = line.match(/^([a-zA-Z_][a-zA-Z0-9_\-]*):\s*(.*)$/);
    if (!keyValue) {
      currentListKey = null;
      continue;
    }

    const key = keyValue[1].trim().toLowerCase();
    const rawValue = keyValue[2];
    if (rawValue.length === 0) {
      result[key] = [];
      currentListKey = key;
      continue;
    }

    result[key] = parseScalar(rawValue);
    currentListKey = null;
  }

  return result;
};

const toRuleDefinition = (payload: Record<string, unknown>, fileName: string): EnforcementRuleDefinition | null => {
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  const severity = typeof payload.severity === "string" ? payload.severity.trim().toLowerCase() : "";
  const patternField = payload.patterns ?? payload.pattern ?? [];
  const patterns = Array.isArray(patternField)
    ? patternField.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter((item) => item.length > 0)
    : typeof patternField === "string"
      ? [patternField.trim()].filter((item) => item.length > 0)
      : [];

  if (!id || !isSeverity(severity) || patterns.length === 0) {
    return null;
  }

  const message = typeof payload.message === "string" ? payload.message.trim() : undefined;
  const injectSource = payload.inject ?? payload.context;
  const inject = typeof injectSource === "string" ? injectSource.trim() : undefined;

  return {
    id,
    severity,
    patterns,
    message: message && message.length > 0 ? message : undefined,
    inject: inject && inject.length > 0 ? inject : undefined,
    fileName,
  };
};

const parseRuleFile = async (path: string, fileName: string): Promise<EnforcementRuleDefinition | null> => {
  const raw = await readFile(path, "utf8");
  const trimmed = raw.trimStart();

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return toRuleDefinition(parsed as Record<string, unknown>, fileName);
      }
    } catch {
      return null;
    }
    return null;
  }

  return toRuleDefinition(parseFrontmatter(raw), fileName);
};

export const loadEnforcementRules = async (cwd: string): Promise<EnforcementRuleDefinition[]> => {
  const rulesDir = join(cwd, ".sinfonica", "enforcement", "rules");

  let entries;
  try {
    entries = await readdir(rulesDir, { withFileTypes: true });
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const files = entries
    .filter((entry) => entry.isFile() && RULE_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const rules = await Promise.all(files.map(async (fileName) => parseRuleFile(join(rulesDir, fileName), fileName)));
  return rules.filter((rule): rule is EnforcementRuleDefinition => rule !== null);
};
