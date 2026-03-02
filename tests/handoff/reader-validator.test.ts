import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readHandoffEnvelope } from "../../src/handoff/reader.js";
import { validateHandoffEnvelope } from "../../src/handoff/validator.js";
import { writeHandoffEnvelope } from "../../src/handoff/writer.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonia-handoff-rv-test-"));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((path) => rm(path, { recursive: true, force: true })));
});

describe("handoff reader and validator", () => {
  it("writes stable frontmatter keys for handoff envelopes", async () => {
    const cwd = await makeTempDir();
    const written = await writeHandoffEnvelope(
      cwd,
      {
        sourcePersona: "maestro",
        targetPersona: "coda",
        type: "dispatch",
        status: "pending",
        task: "Implement feature",
        context: "Feature scope context",
        constraints: ["Follow TDD"]
      },
      "s-20260223-231530",
      new Date("2026-02-23T23:15:35Z")
    );

    const parsed = await readHandoffEnvelope(written.filePath);
    expect(Object.keys(parsed.frontmatter)).toEqual([
      "handoff_id",
      "session_id",
      "sequence",
      "source_persona",
      "target_persona",
      "handoff_type",
      "status",
      "created_at",
      "word_count"
    ]);
  });

  it("parses and validates a valid dispatch envelope", async () => {
    const cwd = await makeTempDir();
    const written = await writeHandoffEnvelope(
      cwd,
      {
        sourcePersona: "maestro",
        targetPersona: "coda",
        type: "dispatch",
        status: "pending",
        artifacts: ["spec.md"],
        task: "Implement feature",
        context: "Feature scope context",
        constraints: ["Follow TDD", "No unrelated changes"]
      },
      "s-20260223-231530",
      new Date("2026-02-23T23:15:35Z")
    );

    const parsed = await readHandoffEnvelope(written.filePath);
    expect(parsed.frontmatter.handoff_type).toBe("dispatch");
    expect(parsed.sections.Task).toContain("Implement feature");

    const validation = await validateHandoffEnvelope(written.filePath);
    expect(validation.errors).toHaveLength(0);
  });

  it("flags missing file and malformed frontmatter", async () => {
    const cwd = await makeTempDir();
    const missing = await validateHandoffEnvelope(join(cwd, "does-not-exist.md"));
    expect(missing.errors.some((x) => x.ruleId === "HV-01")).toBe(true);

    const malformedPath = join(cwd, "bad.md");
    await writeFile(malformedPath, "no-frontmatter", "utf8");
    const malformed = await validateHandoffEnvelope(malformedPath);
    expect(malformed.errors.some((x) => x.ruleId === "HV-02")).toBe(true);
  });

  it("flags required field and section violations", async () => {
    const cwd = await makeTempDir();
    const filePath = join(cwd, "bad-envelope.md");
    await writeFile(
      filePath,
      [
        "---",
        "handoff_id: s-20260223-231530-001",
        "session_id: s-20260223-231530",
        "sequence: 1",
        "source_persona: maestro",
        "target_persona: ghost",
        "handoff_type: dispatch",
        "status: pending",
        "created_at: invalid-date",
        "word_count: 1",
        "---",
        "",
        "## Task",
        "",
        "## Constraints",
        "constraint text"
      ].join("\n"),
      "utf8"
    );

    const validation = await validateHandoffEnvelope(filePath);
    expect(validation.errors.some((x) => x.ruleId === "HV-10")).toBe(true);
    expect(validation.errors.some((x) => x.ruleId === "HV-12")).toBe(true);
    expect(validation.errors.some((x) => x.ruleId === "HV-20")).toBe(true);
    expect(validation.errors.some((x) => x.ruleId === "HV-21")).toBe(true);
    expect(validation.errors.some((x) => x.ruleId === "HV-22")).toBe(true);
    expect(validation.errors.some((x) => x.ruleId === "HV-23")).toBe(true);
  });

  it("supports round-trip write -> read -> validate", async () => {
    const cwd = await makeTempDir();
    const envelope = await writeHandoffEnvelope(
      cwd,
      {
        sourcePersona: "coda",
        targetPersona: "maestro",
        type: "return",
        status: "completed",
        artifacts: ["src/a.ts"],
        summary: "Implemented and tested",
        completionAssessment: "ready",
        blockers: ["none"],
        recommendations: ["review"]
      },
      "s-20260223-231530",
      new Date("2026-02-23T23:15:36Z")
    );

    const parsed = await readHandoffEnvelope(envelope.filePath);
    const reloaded = await readFile(envelope.filePath, "utf8");
    expect(parsed.raw).toBe(reloaded);

    const validation = await validateHandoffEnvelope(envelope.filePath);
    expect(validation.errors).toHaveLength(0);
  });

  it("enforces required section sets for each handoff type", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260223-231530";

    const dispatch = await writeHandoffEnvelope(
      cwd,
      {
        sourcePersona: "maestro",
        targetPersona: "coda",
        type: "dispatch",
        status: "pending",
        task: "Implement feature",
        context: "Feature scope context",
        constraints: ["Follow TDD"]
      },
      sessionId,
      new Date("2026-02-23T23:15:35Z")
    );
    const dispatchParsed = await readHandoffEnvelope(dispatch.filePath);
    expect(Object.keys(dispatchParsed.sections)).toEqual(["Artifacts", "Task", "Context", "Constraints"]);

    const returned = await writeHandoffEnvelope(
      cwd,
      {
        sourcePersona: "coda",
        targetPersona: "maestro",
        type: "return",
        status: "completed",
        summary: "Done",
        completionAssessment: "ready",
        blockers: ["none"],
        recommendations: ["review"]
      },
      sessionId,
      new Date("2026-02-23T23:15:36Z")
    );
    const returnParsed = await readHandoffEnvelope(returned.filePath);
    expect(Object.keys(returnParsed.sections)).toEqual([
      "Artifacts",
      "Summary",
      "Completion Assessment",
      "Blockers",
      "Recommendations"
    ]);

    const revision = await writeHandoffEnvelope(
      cwd,
      {
        sourcePersona: "maestro",
        targetPersona: "coda",
        type: "revision",
        status: "pending",
        revisionRequired: "Please revise",
        feedback: "Missing test evidence",
        nextSteps: ["Update tests"]
      },
      sessionId,
      new Date("2026-02-23T23:15:37Z")
    );
    const revisionParsed = await readHandoffEnvelope(revision.filePath);
    expect(Object.keys(revisionParsed.sections)).toEqual([
      "Artifacts",
      "Revision Required",
      "Feedback",
      "Next Steps"
    ]);

    const direct = await writeHandoffEnvelope(
      cwd,
      {
        sourcePersona: "maestro",
        targetPersona: "coda",
        type: "direct",
        status: "pending",
        message: "Heads up"
      },
      sessionId,
      new Date("2026-02-23T23:15:38Z")
    );
    const directParsed = await readHandoffEnvelope(direct.filePath);
    expect(Object.keys(directParsed.sections)).toEqual(["Artifacts", "Message"]);
  });
});
