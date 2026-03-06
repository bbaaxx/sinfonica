import type { ValidationIssue, ValidationResult } from "./types.js";

const REQUIRED_SECTIONS = ["Identity", "Critical Actions", "Task Protocol"];
const RECOMMENDED_SECTIONS = ["Comm Style", "Role Def", "Principles"];
const INTERACTIVE_SECTIONS = ["Activation Sequence", "Menu"];
const OPTIONAL_SECTIONS = [
  "Handoff Instructions",
  "Delegation Patterns",
  "Subagent Orchestration Protocol",
  "When Spawned by Maestro",
  "Examples",
  "Notes"
];

const KNOWN_SECTIONS = new Set([
  ...REQUIRED_SECTIONS,
  ...RECOMMENDED_SECTIONS,
  ...INTERACTIVE_SECTIONS,
  ...OPTIONAL_SECTIONS
]);

const CANONICAL_ORDER = [
  "Identity",
  "Comm Style",
  "Role Def",
  "Principles",
  "Critical Actions",
  "Task Protocol",
  "Activation Sequence",
  "Menu",
  "Rules",
  "Handoff Instructions",
  "Delegation Patterns",
  "Subagent Orchestration Protocol",
  "When Spawned by Maestro",
  "Custom Instructions",
  "Examples",
  "Notes"
];

type Section = {
  title: string;
  body: string;
};

const aliases: Record<string, string> = {
  "communication style": "Comm Style",
  "comm style": "Comm Style",
  "role definition": "Role Def",
  "role def": "Role Def"
};

const normalizeTitle = (rawTitle: string): string => {
  const compact = rawTitle.trim().replace(/\s+/g, " ");
  const lower = compact.toLowerCase();
  if (aliases[lower]) {
    return aliases[lower];
  }

  const canonical = CANONICAL_ORDER.find((item) => item.toLowerCase() === lower);
  return canonical ?? compact;
};

const splitBody = (content: string): string => {
  if (!content.startsWith("---\n")) {
    return content;
  }

  const closingIndex = content.indexOf("\n---", 4);
  if (closingIndex === -1) {
    return content;
  }

  return content.slice(closingIndex + 4).replace(/^\s+/, "");
};

const parseSections = (content: string): Section[] => {
  const body = splitBody(content);
  const lines = body.split(/\r?\n/);

  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const [, hashes, rawTitle] = heading;
      if (hashes.length !== 2) {
        continue;
      }

      if (current) {
        sections.push(current);
      }

      current = {
        title: normalizeTitle(rawTitle),
        body: ""
      };
      continue;
    }

    if (current) {
      current.body = current.body.length > 0 ? `${current.body}\n${line}` : line;
    }
  }

  if (current) {
    sections.push(current);
  }

  return sections;
};

const issue = (ruleId: string, severity: "ERROR" | "WARN", message: string): ValidationIssue => ({
  ruleId,
  severity,
  message
});

export const validatePersonaSections = (
  content: string,
  personaMode: string | undefined
): ValidationResult => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const sections = parseSections(content);

  const sectionNames = sections.map((section) => section.title);

  for (const section of REQUIRED_SECTIONS) {
    if (!sectionNames.includes(section)) {
      errors.push(issue("SS-01", "ERROR", `Missing required section: ${section}`));
    }
  }

  for (const section of RECOMMENDED_SECTIONS) {
    if (!sectionNames.includes(section)) {
      warnings.push(issue("SS-02", "WARN", `Missing recommended section: ${section}`));
    }
  }

  const interactiveMode = personaMode === "interactive" || personaMode === "both";
  if (interactiveMode) {
    for (const section of INTERACTIVE_SECTIONS) {
      if (!sectionNames.includes(section)) {
        errors.push(issue("SS-03", "ERROR", `Missing interactive section: ${section}`));
      }
    }
  } else if (personaMode === "subagent") {
    for (const section of INTERACTIVE_SECTIONS) {
      if (sectionNames.includes(section)) {
        warnings.push(issue("SS-04", "WARN", `Interactive section should not appear in subagent persona: ${section}`));
      }
    }
  }

  const knownOrderIndexes = sectionNames
    .filter((name) => KNOWN_SECTIONS.has(name))
    .map((name) => CANONICAL_ORDER.indexOf(name));

  for (let i = 1; i < knownOrderIndexes.length; i += 1) {
    if (knownOrderIndexes[i] < knownOrderIndexes[i - 1]) {
      errors.push(issue("SS-05", "ERROR", "Sections must follow canonical order"));
      break;
    }
  }

  const body = splitBody(content);
  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (!heading) {
      continue;
    }

    const [, hashes, rawTitle] = heading;
    const title = normalizeTitle(rawTitle);
    if (KNOWN_SECTIONS.has(title) && hashes.length !== 2) {
      errors.push(issue("SS-06", "ERROR", `Section headings must use H2 (##): ${title}`));
    }
  }

  const seen = new Set<string>();
  for (const section of sections) {
    if (seen.has(section.title)) {
      errors.push(issue("SS-07", "ERROR", `Duplicate section: ${section.title}`));
    }
    seen.add(section.title);
  }

  for (const section of sections) {
    if (section.body.trim().length === 0) {
      errors.push(issue("SS-08", "ERROR", `Section is empty: ${section.title}`));
    }
  }

  for (const section of sections) {
    if (!KNOWN_SECTIONS.has(section.title)) {
      warnings.push(issue("SS-09", "WARN", `Unknown section: ${section.title}`));
    }
  }

  return { errors, warnings };
};
