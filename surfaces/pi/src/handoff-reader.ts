import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export type HandoffEnvelopeType = "dispatch" | "return";

export type ParsedHandoffEnvelope = {
  filePath: string;
  fileName: string;
  frontmatter: Record<string, unknown>;
  body: string;
  sections: Record<string, string>;
};

const parseScalar = (value: string): unknown => {
  const trimmed = value.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
    return trimmed.slice(1, -1);
  }
  if (/^-?\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  return trimmed;
};

const normalizeLegacyKey = (rawKey: string): string => rawKey.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const parseFrontmatterBody = (raw: string): { frontmatter: Record<string, unknown>; body: string; hasFrontmatter: boolean } => {
  if (!raw.startsWith("---\n")) {
    return { frontmatter: {}, body: raw, hasFrontmatter: false };
  }

  const closingIndex = raw.indexOf("\n---", 4);
  if (closingIndex === -1) {
    return { frontmatter: {}, body: raw, hasFrontmatter: false };
  }

  const frontmatterText = raw.slice(4, closingIndex).trimEnd();
  const body = raw.slice(closingIndex + 4).replace(/^\s+/, "");
  const frontmatter: Record<string, unknown> = {};

  for (const line of frontmatterText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    const match = line.match(/^([a-z_][a-z0-9_\-]*):\s*(.*)$/i);
    if (!match) {
      continue;
    }
    frontmatter[match[1]] = parseScalar(match[2]);
  }

  return { frontmatter, body, hasFrontmatter: true };
};

const parseLegacyMetadata = (rawBody: string): Record<string, unknown> => {
  const lines = rawBody.split(/\r?\n/);
  const metadata: Record<string, unknown> = {};

  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      break;
    }
    const match = line.match(/^\s*-\s*([^:]+):\s*(.+)\s*$/);
    if (!match) {
      continue;
    }
    metadata[normalizeLegacyKey(match[1])] = parseScalar(match[2]);
  }

  return metadata;
};

const parseSections = (body: string): Record<string, string> => {
  const sections: Record<string, string> = {};
  let current: string | null = null;

  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      current = heading[1].trim();
      sections[current] = "";
      continue;
    }
    if (current) {
      sections[current] = sections[current].length > 0 ? `${sections[current]}\n${line}` : line;
    }
  }

  return sections;
};

const rankFile = (fileName: string, type: HandoffEnvelopeType): [number, string] => {
  if (fileName === `${type}.md`) {
    return [0, fileName];
  }
  const match = fileName.match(new RegExp(`^${type}-(\\d+)`, "i"));
  if (match) {
    return [Number.parseInt(match[1], 10), fileName];
  }
  return [0, fileName];
};

const latestHandoffFile = async (sessionDir: string, type: HandoffEnvelopeType): Promise<string> => {
  const entries = await readdir(sessionDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name === `${type}.md` || new RegExp(`^${type}-.*\\.md$`, "i").test(name));

  if (files.length === 0) {
    throw new Error(`No ${type} envelope found in session directory`);
  }

  files.sort((left, right) => {
    const [leftRank, leftName] = rankFile(left, type);
    const [rightRank, rightName] = rankFile(right, type);
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return leftName.localeCompare(rightName);
  });

  return files[files.length - 1];
};

export const readLatestHandoffEnvelope = async (
  cwd: string,
  sessionId: string,
  type: HandoffEnvelopeType
): Promise<ParsedHandoffEnvelope> => {
  const sessionDir = join(cwd, ".sinfonica", "handoffs", sessionId);
  const fileName = await latestHandoffFile(sessionDir, type);
  const filePath = join(sessionDir, fileName);
  const raw = await readFile(filePath, "utf8");

  const parsed = parseFrontmatterBody(raw);
  const frontmatter = Object.keys(parsed.frontmatter).length > 0 ? parsed.frontmatter : parseLegacyMetadata(parsed.body);

  return {
    filePath,
    fileName,
    frontmatter,
    body: parsed.body,
    sections: parseSections(parsed.body),
  };
};
