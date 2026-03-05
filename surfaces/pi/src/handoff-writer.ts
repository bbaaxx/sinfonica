import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { validateHandoffEnvelope, type HandoffValidationResult } from "../../../src/handoff/validator.js";

export type ReturnDecision = "approve" | "request-revision";

export type WriteReturnEnvelopeOptions = {
  cwd: string;
  sessionId: string;
  decision: ReturnDecision;
  feedback?: string;
  sourcePersona?: string;
  targetPersona?: string;
  createdAt?: Date;
};

export type WrittenReturnEnvelope = {
  filePath: string;
  sequence: number;
  handoffId: string;
  validation: HandoffValidationResult;
};

const countWords = (text: string): number => text.trim().split(/\s+/).filter((token) => token.length > 0).length;

const toThreeDigit = (value: number): string => String(value).padStart(3, "0");

const nextReturnSequence = async (sessionDir: string): Promise<number> => {
  await mkdir(sessionDir, { recursive: true });
  const entries = await readdir(sessionDir);
  const numbers = entries
    .map((entry) => {
      const match = entry.match(/^return-(\d+)-/i);
      return match ? Number.parseInt(match[1], 10) : 0;
    })
    .filter((value) => value > 0);

  if (numbers.length === 0) {
    return 1;
  }

  return Math.max(...numbers) + 1;
};

const buildBody = (decision: ReturnDecision, feedback: string | undefined): string => {
  const cleanFeedback = feedback?.trim();
  const blocked = decision === "request-revision";
  const summary = blocked
    ? `Decision: request-revision${cleanFeedback ? `. Feedback: ${cleanFeedback}` : "."}`
    : `Decision: approve${cleanFeedback ? `. Notes: ${cleanFeedback}` : "."}`;

  const assessment = blocked
    ? "Step is blocked pending requested revisions."
    : "Step is approved and ready to advance.";

  const blockers = blocked
    ? `- ${cleanFeedback && cleanFeedback.length > 0 ? cleanFeedback : "Revision requested before approval."}`
    : "- none";

  const recommendations = blocked
    ? "- Apply feedback and submit an updated handoff"
    : "- Continue to the next workflow stage";

  return [
    "## Artifacts",
    "- none",
    "",
    "## Summary",
    summary,
    "",
    "## Completion Assessment",
    assessment,
    "",
    "## Blockers",
    blockers,
    "",
    "## Recommendations",
    recommendations,
  ].join("\n");
};

export const writeReturnEnvelope = async (options: WriteReturnEnvelopeOptions): Promise<WrittenReturnEnvelope> => {
  const sourcePersona = options.sourcePersona ?? "pi";
  const targetPersona = options.targetPersona ?? "maestro";
  const createdAt = options.createdAt ?? new Date();
  const status = options.decision === "approve" ? "completed" : "blocked";
  const sessionDir = join(options.cwd, ".sinfonica", "handoffs", options.sessionId);
  const sequence = await nextReturnSequence(sessionDir);
  const handoffId = `${options.sessionId}-${toThreeDigit(sequence)}`;
  const fileName = `return-${String(sequence).padStart(2, "0")}-pi.md`;
  const filePath = join(sessionDir, fileName);
  const body = buildBody(options.decision, options.feedback);
  const wordCount = countWords(body);

  const frontmatter = [
    "---",
    `handoff_id: ${handoffId}`,
    `session_id: ${options.sessionId}`,
    `sequence: ${sequence}`,
    `source_persona: ${sourcePersona}`,
    `target_persona: ${targetPersona}`,
    "handoff_type: return",
    `status: ${status}`,
    `created_at: ${createdAt.toISOString()}`,
    `word_count: ${wordCount}`,
    "---",
    "",
  ].join("\n");

  await writeFile(filePath, `${frontmatter}${body}\n`, "utf8");

  const validation = await validateHandoffEnvelope(filePath);
  if (validation.errors.length > 0) {
    const messages = validation.errors.map((error) => `${error.ruleId}: ${error.message}`).join("; ");
    throw new Error(`Generated return envelope failed validation: ${messages}`);
  }

  return {
    filePath,
    sequence,
    handoffId,
    validation,
  };
};
