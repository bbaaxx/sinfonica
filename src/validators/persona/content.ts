import type { ValidationIssue, ValidationResult } from "./types.js";

type ParsedSection = {
  title: string;
  body: string;
  subsections: Record<string, string>;
};

const sectionAlias: Record<string, string> = {
  "communication style": "Communication Style",
  "comm style": "Communication Style",
  "role definition": "Role Definition",
  "role def": "Role Definition",
  rules: "Rules"
};

const normalizeTitle = (raw: string): string => {
  const compact = raw.trim().replace(/\s+/g, " ");
  const lower = compact.toLowerCase();
  if (sectionAlias[lower]) {
    return sectionAlias[lower];
  }

  return compact;
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

const parseSections = (content: string): Record<string, ParsedSection> => {
  const lines = splitBody(content).split(/\r?\n/);
  const sections: Record<string, ParsedSection> = {};
  let currentSection: ParsedSection | null = null;
  let currentSubsection: string | null = null;

  for (const line of lines) {
    const heading2 = line.match(/^##\s+(.+)$/);
    if (heading2) {
      const title = normalizeTitle(heading2[1]);
      currentSection = {
        title,
        body: "",
        subsections: {}
      };
      sections[title] = currentSection;
      currentSubsection = null;
      continue;
    }

    const heading3 = line.match(/^###\s+(.+)$/);
    if (heading3 && currentSection) {
      const subsectionTitle = normalizeTitle(heading3[1]);
      currentSection.subsections[subsectionTitle] = "";
      currentSubsection = subsectionTitle;
      continue;
    }

    if (!currentSection) {
      continue;
    }

    if (currentSubsection) {
      const currentText = currentSection.subsections[currentSubsection];
      currentSection.subsections[currentSubsection] = currentText.length > 0 ? `${currentText}\n${line}` : line;
    } else {
      currentSection.body = currentSection.body.length > 0 ? `${currentSection.body}\n${line}` : line;
    }
  }

  return sections;
};

const numberedItems = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line));

const bulletItems = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^-\s+/.test(line));

const issue = (ruleId: string, severity: "ERROR" | "WARN", message: string): ValidationIssue => ({
  ruleId,
  severity,
  message
});

const nonCommentContent = (content: string): string => content.replace(/<!--([\s\S]*?)-->/g, "");

export const validatePersonaContent = (content: string): ValidationResult => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const sections = parseSections(content);

  const identity = sections["Identity"];
  if (!identity || identity.body.split(/\r?\n/).every((line) => line.trim().length === 0)) {
    errors.push(issue("SC-01", "ERROR", "Identity must contain at least one non-empty paragraph"));
  }

  const communication = sections["Communication Style"];
  if (communication) {
    const paragraph = communication.body
      .split(/\r?\n/)
      .some((line) => line.trim().length > 0 && !line.trim().startsWith("- "));
    if (!paragraph && bulletItems(communication.body).length === 0) {
      warnings.push(
        issue("SC-02", "WARN", "Communication Style should contain at least one paragraph or bullet list")
      );
    }
  }

  const roleDefinition = sections["Role Definition"];
  if (roleDefinition) {
    const responsibilities = roleDefinition.subsections.Responsibilities;
    const boundaries = roleDefinition.subsections.Boundaries;
    if (!responsibilities || !boundaries) {
      warnings.push(
        issue("SC-03", "WARN", "Role Definition should include Responsibilities and Boundaries subsections")
      );
    }

    if (responsibilities) {
      const count = bulletItems(responsibilities).length;
      if (count < 3 || count > 10) {
        warnings.push(issue("SC-04", "WARN", "Responsibilities should contain 3-10 bullet points"));
      }
    }

    if (boundaries) {
      const count = bulletItems(boundaries).length;
      if (count < 2 || count > 8) {
        warnings.push(issue("SC-05", "WARN", "Boundaries should contain 2-8 bullet points"));
      }
    }
  }

  const principles = sections.Principles;
  if (principles) {
    const count = numberedItems(principles.body).length;
    if (count < 3 || count > 7) {
      warnings.push(issue("SC-06", "WARN", "Principles should contain a numbered list with 3-7 items"));
    }
  }

  const critical = sections["Critical Actions"];
  const criticalItems = critical ? numberedItems(critical.body) : [];
  if (criticalItems.length < 1 || criticalItems.length > 8) {
    errors.push(issue("SC-07", "ERROR", "Critical Actions must contain a numbered list with 1-8 items"));
  }
  if (
    criticalItems.some((item) => {
      const normalized = item.replace(/^\d+\.\s+/, "").trim();
      return !normalized.startsWith("**ALWAYS**") && !normalized.startsWith("**NEVER**");
    })
  ) {
    errors.push(issue("SC-08", "ERROR", "Critical Actions items must begin with **ALWAYS** or **NEVER**"));
  }

  const taskProtocol = sections["Task Protocol"];
  if (!taskProtocol) {
    errors.push(
      issue("SC-09", "ERROR", "Task Protocol must include Accepts, Produces, and Completion Criteria subsections")
    );
  } else {
    const accepts = taskProtocol.subsections.Accepts;
    const produces = taskProtocol.subsections.Produces;
    const completion = taskProtocol.subsections["Completion Criteria"];
    if (!accepts || !produces || !completion) {
      errors.push(
        issue("SC-09", "ERROR", "Task Protocol must include Accepts, Produces, and Completion Criteria subsections")
      );
    }

    const acceptsCount = accepts ? bulletItems(accepts).length : 0;
    if (acceptsCount < 1 || acceptsCount > 8) {
      errors.push(issue("SC-10", "ERROR", "Accepts must contain 1-8 bullet items"));
    }

    const producesCount = produces ? bulletItems(produces).length : 0;
    if (producesCount < 1 || producesCount > 8) {
      errors.push(issue("SC-11", "ERROR", "Produces must contain 1-8 bullet items"));
    }

    const completionCount = completion ? bulletItems(completion).length : 0;
    if (completionCount < 2 || completionCount > 8) {
      errors.push(issue("SC-12", "ERROR", "Completion Criteria must contain 2-8 bullet items"));
    }
  }

  const menu = sections.Menu;
  if (menu) {
    const items = numberedItems(menu.body);
    if (items.length === 0) {
      errors.push(issue("SC-13", "ERROR", "Menu must contain a numbered list"));
    }

    const hasMh = items.some((item) => item.includes("[MH]"));
    const hasCh = items.some((item) => item.includes("[CH]"));
    const hasDa = items.some((item) => item.includes("[DA]"));
    if (!hasMh || !hasCh || !hasDa) {
      errors.push(issue("SC-14", "ERROR", "Menu must include [MH], [CH], and [DA]"));
    }

    const mhIndex = items.findIndex((item) => item.includes("[MH]"));
    const daIndex = items.findIndex((item) => item.includes("[DA]"));
    if ((mhIndex !== -1 && mhIndex !== 0) || (daIndex !== -1 && daIndex !== items.length - 1)) {
      errors.push(issue("SC-15", "ERROR", "[MH] must be first and [DA] must be last"));
    }

    const shortCodes = items
      .map((item) => {
        const match = item.match(/\[([A-Z]{2,4})\]/);
        return match ? match[1] : null;
      })
      .filter((value): value is string => value !== null);
    const duplicateCode = new Set(shortCodes).size !== shortCodes.length;
    if (items.length > 12 || duplicateCode) {
      warnings.push(issue("SC-16", "WARN", "Menu should have <=12 items with unique short codes"));
    }
  }

  const activation = sections["Activation Sequence"];
  if (activation) {
    const count = numberedItems(activation.body).length;
    if (count < 7 || count > 10) {
      warnings.push(issue("SC-17", "WARN", "Activation Sequence should contain 7-10 numbered steps"));
    }
  }

  const rules = sections.Rules;
  if (rules && bulletItems(rules.body).length > 10) {
    warnings.push(issue("SC-18", "WARN", "Rules should contain at most 10 bullet items"));
  }

  const scanned = nonCommentContent(content);
  if (/<\/?\s*(agent|activation|workflow|task|instruction)\b/i.test(scanned)) {
    errors.push(issue("PP-01", "ERROR", "XML tags are not allowed"));
  }

  if (/\b(TODO|FIXME|PLACEHOLDER)\b/.test(scanned)) {
    warnings.push(issue("PP-02", "WARN", "TODO/FIXME/PLACEHOLDER markers should not appear in persona content"));
  }

  if (/\/Users\/|\/home\/|[A-Za-z]:\\/.test(scanned)) {
    errors.push(issue("PP-03", "ERROR", "Hardcoded system paths are not allowed"));
  }

  const inlineCodeMatches = [...scanned.matchAll(/`([^`]+)`/g)];
  if (inlineCodeMatches.some((match) => /^\s*[>$#]\s+/.test(match[1]))) {
    warnings.push(issue("PP-04", "WARN", "Inline code blocks should not include prompt characters"));
  }

  return { errors, warnings };
};
