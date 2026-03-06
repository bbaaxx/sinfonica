import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readLatestHandoffEnvelope } from "../src/handoff-reader.ts";
import { writeReturnEnvelope } from "../src/handoff-writer.ts";
import { readWorkflowState } from "../src/workflow-state.ts";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonica-phase3-test-"));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("pi extension handoff reader", () => {
  it("parses existing dispatch envelope format from handoff session", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260302-006";
    const sessionDir = join(cwd, ".sinfonica", "handoffs", sessionId);
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      join(sessionDir, "dispatch-03-coda.md"),
      [
        "# Dispatch Envelope",
        "",
        "- Session: `s-20260302-006`",
        "- Workflow: `pi-surface-addition`",
        "- Delegate: `@sinfonica-coda`",
        "",
        "## Objective",
        "",
        "Implement phase 3 modules.",
        "",
        "## Constraints",
        "",
        "- Scope limited to phase 3.",
      ].join("\n"),
      "utf8"
    );

    const parsed = await readLatestHandoffEnvelope(cwd, sessionId, "dispatch");

    expect(parsed.fileName).toBe("dispatch-03-coda.md");
    expect(parsed.frontmatter.session).toBe("s-20260302-006");
    expect(parsed.frontmatter.workflow).toBe("pi-surface-addition");
    expect(parsed.sections.Objective).toContain("phase 3");
    expect(parsed.sections.Constraints).toContain("Scope limited");
  });

  it("parses return envelope frontmatter and body sections", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260302-006";
    const sessionDir = join(cwd, ".sinfonica", "handoffs", sessionId);
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      join(sessionDir, "return-01-coda.md"),
      [
        "---",
        "handoff_id: s-20260302-000001-001",
        "session_id: s-20260302-000001",
        "sequence: 1",
        "source_persona: coda",
        "target_persona: maestro",
        "handoff_type: return",
        "status: completed",
        "created_at: 2026-03-02T00:00:00.000Z",
        "word_count: 7",
        "---",
        "",
        "## Summary",
        "",
        "Phase complete.",
      ].join("\n"),
      "utf8"
    );

    const parsed = await readLatestHandoffEnvelope(cwd, sessionId, "return");

    expect(parsed.frontmatter.handoff_type).toBe("return");
    expect(parsed.frontmatter.sequence).toBe(1);
    expect(parsed.sections.Summary).toContain("Phase complete");
  });
});

describe("pi extension handoff writer", () => {
  it("writes a return envelope and validates against Sinfonica contract", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260302-123456";

    const outcome = await writeReturnEnvelope({
      cwd,
      sessionId,
      decision: "approve",
      feedback: "Looks good",
      sourcePersona: "coda",
      targetPersona: "maestro",
      createdAt: new Date("2026-03-02T12:34:56.000Z"),
    });

    const written = await readFile(outcome.filePath, "utf8");

    expect(outcome.validation.errors).toHaveLength(0);
    expect(outcome.validation.warnings).toHaveLength(0);
    expect(written).toContain("handoff_type: return");
    expect(written).toContain("status: completed");
    expect(written).toContain("Decision: approve");
    expect(written).toContain("Looks good");
  });
});

describe("pi extension workflow state reader", () => {
  it("extracts current step total steps and status from workflow markdown", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260302-006";
    const sessionDir = join(cwd, ".sinfonica", "handoffs", sessionId);
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      join(sessionDir, "workflow.md"),
      [
        "# Workflow Session: s-20260302-006",
        "",
        "- Current Stage: Phase 2 approved; Phase 3 dispatch prepared and awaiting approval",
        "- Overall Status: in-progress",
        "",
        "## Stages",
        "",
        "1. Phase 1 - Pi package structure generation",
        "   - Status: approved",
        "2. Phase 2 - Extension entry point and core tools",
        "   - Status: approved",
        "3. Phase 3 - Handoff envelope reader/writer utilities",
        "   - Status: pending approval to dispatch",
        "4. Phase 4 - Enforcement bridge",
        "   - Status: queued",
      ].join("\n"),
      "utf8"
    );

    const state = await readWorkflowState(cwd, sessionId);

    expect(state.currentStep).toBe(3);
    expect(state.totalSteps).toBe(4);
    expect(state.status).toBe("in-progress");
  });

  it("extracts state from workflow frontmatter format", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260305-777777";
    const sessionDir = join(cwd, ".sinfonica", "handoffs", sessionId);
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      join(sessionDir, "workflow.md"),
      [
        "---",
        "workflow_id: create-spec",
        "workflow_status: created",
        "current_step: 1-analyze-prd",
        "current_step_index: 1",
        "total_steps: 4",
        `session_id: ${sessionId}`,
        "created_at: 2026-03-05T00:00:00.000Z",
        "updated_at: 2026-03-05T00:00:00.000Z",
        "---",
        "",
        "## Goal",
        "Draft technical specification.",
      ].join("\n"),
      "utf8"
    );

    const state = await readWorkflowState(cwd, sessionId);
    expect(state.currentStep).toBe(1);
    expect(state.totalSteps).toBe(4);
    expect(state.status).toBe("created");
  });
});
