import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { writeHandoffEnvelope } from "../../src/handoff/writer.js";
import {
  clearWorkflowMetricsEvents,
  getWorkflowMetricsEvents,
} from "../../src/workflow/metrics.js";
import {
  handleFailure,
  initPipeline,
  processReturnEnvelope,
  resumeFromInjection,
  resumePipeline,
  getCompactionInjection,
} from "../../src/workflow/coordinator.js";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonia-metrics-test-"));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  clearWorkflowMetricsEvents();
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("workflow metrics instrumentation", () => {
  it("emits approval metrics for approve and reject outcomes", async () => {
    const cwd = await makeTempDir();
    const session = await initPipeline(cwd, ["create-prd"], "Test goal");

    const approved = await writeHandoffEnvelope(
      cwd,
      {
        sourcePersona: "libretto",
        targetPersona: "maestro",
        type: "return",
        status: "completed",
        summary: "Done",
        completionAssessment: "ready",
        blockers: ["none"],
        recommendations: ["ship"]
      },
      session.sessionId
    );

    await processReturnEnvelope(cwd, session.sessionId, approved.filePath, "approve", "reviewer");

    const rejected = await writeHandoffEnvelope(
      cwd,
      {
        sourcePersona: "libretto",
        targetPersona: "maestro",
        type: "return",
        status: "completed",
        summary: "Done",
        completionAssessment: "ready",
        blockers: ["none"],
        recommendations: ["ship"]
      },
      session.sessionId
    );

    await processReturnEnvelope(cwd, session.sessionId, rejected.filePath, "reject", "reviewer", "needs work");

    const approvalEvents = getWorkflowMetricsEvents().filter((event) => event.name === "approval_outcome");
    expect(approvalEvents.map((event) => event.outcome)).toEqual(["approved", "rejected"]);
  });

  it("emits failure action metrics for retry and abort", async () => {
    const cwd = await makeTempDir();
    const session = await initPipeline(cwd, ["create-prd", "create-spec"], "Test goal");

    await handleFailure(
      cwd,
      session.sessionId,
      0,
      "create-prd",
      "retry",
      "Write PRD",
      "Context",
      "Timed out"
    );

    await handleFailure(
      cwd,
      session.sessionId,
      1,
      "create-spec",
      "abort",
      "Write spec",
      "Context",
      "Blocked"
    );

    const actionEvents = getWorkflowMetricsEvents().filter((event) => event.name === "failure_action");
    expect(actionEvents.map((event) => event.outcome)).toEqual(["retry", "abort"]);
  });

  it("emits resume success metrics from index and compaction injection", async () => {
    const cwd = await makeTempDir();
    const session = await initPipeline(cwd, ["create-prd"], "Test goal");

    await resumePipeline(cwd, session.sessionId);
    const injection = await getCompactionInjection(cwd, session.sessionId);
    await resumeFromInjection(cwd, injection);

    const resumeEvents = getWorkflowMetricsEvents().filter((event) => event.name === "resume_result");
    expect(resumeEvents).toHaveLength(2);
    expect(resumeEvents.every((event) => event.outcome === "success")).toBe(true);
  });
});
