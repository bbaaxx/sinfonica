import { access } from "node:fs/promises";
import { constants } from "node:fs";

export type HandoffValidationIssue = {
  ruleId: string;
  severity: "ERROR" | "WARN";
  message: string;
};

export type HandoffValidationResult = {
  errors: HandoffValidationIssue[];
  warnings: HandoffValidationIssue[];
};

type ParsedEnvelope = {
  frontmatter: Record<string, unknown>;
  sections: Record<string, string>;
  raw: string;
};

const issue = (ruleId: string, severity: "ERROR" | "WARN", message: string): HandoffValidationIssue => ({
  ruleId,
  severity,
  message
});

const nonEmpty = (value: unknown): boolean => typeof value === "string" && value.trim().length > 0;

const requiredSectionsByType: Record<string, string[]> = {
  dispatch: ["Artifacts", "Task", "Context", "Constraints"],
  return: ["Artifacts", "Summary", "Completion Assessment", "Blockers", "Recommendations"],
  revision: ["Artifacts", "Revision Required", "Feedback", "Next Steps"],
  direct: ["Artifacts", "Message"]
};

const countWords = (text: string): number => text.trim().split(/\s+/).filter((item) => item.length > 0).length;

const isValidType = (value: unknown): boolean =>
  typeof value === "string" && ["dispatch", "return", "revision", "direct"].includes(value);

const parseScalar = (rawValue: string): unknown => {
  const value = rawValue.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (/^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  return value;
};

const readEnvelope = async (filePath: string): Promise<ParsedEnvelope> => {
  const { readFile } = await import("node:fs/promises");
  const raw = await readFile(filePath, "utf8");
  
  if (!raw.startsWith("---\n")) {
    throw new Error("HV-02: frontmatter missing or malformed");
  }

  const closingIndex = raw.indexOf("\n---", 4);
  if (closingIndex === -1) {
    throw new Error("HV-02: frontmatter missing or malformed");
  }

  const frontmatterText = raw.slice(4, closingIndex).trimEnd();
  const body = raw.slice(closingIndex + 4).replace(/^\s+/, "");

  const frontmatter: Record<string, unknown> = {};
  for (const line of frontmatterText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!match) {
      throw new Error("HV-02: frontmatter missing or malformed");
    }
    frontmatter[match[1]] = parseScalar(match[2]);
  }

  const sections: Record<string, string> = {};
  let currentSection: string | null = null;
  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      currentSection = heading[1].trim();
      sections[currentSection] = "";
      continue;
    }

    if (currentSection) {
      sections[currentSection] = sections[currentSection].length > 0 ? `${sections[currentSection]}\n${line}` : line;
    }
  }

  return {
    frontmatter,
    sections,
    raw
  };
};

export const validateHandoffEnvelope = async (filePath: string): Promise<HandoffValidationResult> => {
  const errors: HandoffValidationIssue[] = [];
  const warnings: HandoffValidationIssue[] = [];

  try {
    await access(filePath, constants.F_OK);
  } catch {
    errors.push(issue("HV-01", "ERROR", "Envelope file does not exist"));
    return { errors, warnings };
  }

  let parsed: ParsedEnvelope;
  try {
    parsed = await readEnvelope(filePath);
  } catch (error) {
    errors.push(issue("HV-02", "ERROR", error instanceof Error ? error.message : "Invalid frontmatter"));
    return { errors, warnings };
  }

  const frontmatter = parsed.frontmatter;
  const requiredFields = [
    "handoff_id",
    "session_id",
    "sequence",
    "source_persona",
    "target_persona",
    "handoff_type",
    "status",
    "created_at",
    "word_count"
  ];

  for (const field of requiredFields) {
    if (!(field in frontmatter)) {
      errors.push(issue("HV-03", "ERROR", `Missing required field: ${field}`));
    }
  }

  if (!nonEmpty(frontmatter.handoff_id) || !/^s-\d{8}-\d{6}-\d{3}$/.test(String(frontmatter.handoff_id))) {
    errors.push(issue("HV-04", "ERROR", "handoff_id must follow s-YYYYMMDD-HHMMSS-XXX format"));
  }

  if (!nonEmpty(frontmatter.session_id) || !/^s-\d{8}-\d{6}$/.test(String(frontmatter.session_id))) {
    errors.push(issue("HV-05", "ERROR", "session_id must follow s-YYYYMMDD-HHMMSS format"));
  }

  if (typeof frontmatter.sequence !== "number" || frontmatter.sequence < 1 || frontmatter.sequence > 999) {
    errors.push(issue("HV-06", "ERROR", "sequence must be a number between 1 and 999"));
  }

  const source = String(frontmatter.source_persona ?? "");
  const target = String(frontmatter.target_persona ?? "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target) || source === target) {
    errors.push(issue("HV-07", "ERROR", "source/target persona format invalid or identical"));
  }

  const type = String(frontmatter.handoff_type ?? "");
  if (!isValidType(type)) {
    errors.push(issue("HV-08", "ERROR", "handoff_type must be one of dispatch/return/revision/direct"));
  }

  const status = String(frontmatter.status ?? "");
  if (!["pending", "completed", "blocked"].includes(status)) {
    errors.push(issue("HV-09", "ERROR", "status must be pending/completed/blocked"));
  }

  const createdAt = String(frontmatter.created_at ?? "");
  if (Number.isNaN(Date.parse(createdAt))) {
    errors.push(issue("HV-10", "ERROR", "created_at must be valid ISO timestamp"));
  }

  const bodyWordCount = countWords(parsed.raw.split("\n---\n").slice(1).join("\n"));
  if (typeof frontmatter.word_count !== "number" || frontmatter.word_count > 500 || frontmatter.word_count !== bodyWordCount) {
    errors.push(issue("HV-11", "ERROR", "word_count must match body and be <=500"));
  }

  const requiredSections = requiredSectionsByType[type] ?? [];
  for (const section of requiredSections) {
    if (!(section in parsed.sections)) {
      errors.push(issue("HV-12", "ERROR", `Missing section for ${type}: ${section}`));
    }
  }

  for (const [name, value] of Object.entries(parsed.sections)) {
    if (requiredSections.includes(name) && value.trim().length === 0) {
      errors.push(issue("HV-13", "ERROR", `Section is empty: ${name}`));
    }
  }

  if (requiredSections.length > 0) {
    const unexpected = Object.keys(parsed.sections).filter((section) => !requiredSections.includes(section));
    if (unexpected.length > 0) {
      warnings.push(issue("HV-14", "WARN", `Unexpected sections present: ${unexpected.join(", ")}`));
    }
  }

  return { errors, warnings };
};
