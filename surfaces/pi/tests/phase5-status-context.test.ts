import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import registerSinfonicaExtension, { type ExtensionAPI } from "../index.ts";

type RegisteredEventHandler = (event: Record<string, unknown>, ctx?: { cwd?: string }) => Promise<unknown> | unknown;

type SentMessage = {
  customType: string;
  content: unknown;
  details?: unknown;
  display?: unknown;
};

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonica-phase5-test-"));
  tempDirs.push(dir);
  return dir;
};

const writeWorkflowSession = async (
  cwd: string,
  sessionId: string,
  options: {
    currentStage: string;
    overallStatus: string;
    stageStatuses: string[];
    sourcePlan?: string;
  }
): Promise<void> => {
  const sessionDir = join(cwd, ".sinfonica", "handoffs", sessionId);
  await mkdir(sessionDir, { recursive: true });

  const stageLines = options.stageStatuses
    .map((status, index) => `${index + 1}. Phase ${index + 1}\n   - Status: ${status}`)
    .join("\n");

  await writeFile(
    join(sessionDir, "workflow.md"),
    [
      `# Workflow Session: ${sessionId}`,
      "",
      `- Source Plan: \`${options.sourcePlan ?? "Pi_Surface_Addition.md"}\``,
      `- Current Stage: ${options.currentStage}`,
      `- Overall Status: ${options.overallStatus}`,
      "",
      "## Stages",
      "",
      stageLines,
    ].join("\n"),
    "utf8"
  );
};

const writeDispatch = async (cwd: string, sessionId: string, delegate: string): Promise<void> => {
  const sessionDir = join(cwd, ".sinfonica", "handoffs", sessionId);
  await mkdir(sessionDir, { recursive: true });
  await writeFile(
    join(sessionDir, "dispatch-05-coda.md"),
    [
      "# Dispatch Envelope",
      "",
      `- Session: \`${sessionId}\``,
      "- Workflow: `pi-surface-addition`",
      `- Delegate: \`${delegate}\``,
      "",
      "## Objective",
      "",
      "Implement phase 5 modules.",
    ].join("\n"),
    "utf8"
  );
};

const writeReturnWithArtifacts = async (cwd: string, sessionId: string, artifacts: string[]): Promise<void> => {
  const sessionDir = join(cwd, ".sinfonica", "handoffs", sessionId);
  await mkdir(sessionDir, { recursive: true });
  await writeFile(
    join(sessionDir, "return-04-coda.md"),
    [
      "---",
      `session_id: ${sessionId}`,
      "handoff_type: return",
      "status: complete",
      "---",
      "",
      "## Artifacts",
      "",
      ...artifacts.map((artifact) => `- ${artifact}`),
    ].join("\n"),
    "utf8"
  );
};

const createApiHarness = () => {
  const handlers = new Map<string, RegisteredEventHandler[]>();
  const messageRenderers = new Map<string, unknown>();
  const sentMessages: SentMessage[] = [];

  const api: ExtensionAPI = {
    registerTool: () => {},
    registerCommand: () => {},
    exec: async () => ({ stdout: "", stderr: "", code: 0 }),
    on: (event, handler) => {
      const current = handlers.get(event) ?? [];
      current.push(handler as RegisteredEventHandler);
      handlers.set(event, current);
    },
    registerMessageRenderer: (customType, renderer) => {
      messageRenderers.set(customType, renderer);
    },
    sendMessage: (message) => {
      sentMessages.push({
        customType: message.customType,
        content: message.content,
        details: message.details,
        display: message.display,
      });
    },
  };

  return { api, handlers, sentMessages, messageRenderers };
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("pi extension phase 5 status and context injection", () => {
  it("registers sinfonica:status renderer and emits status payload on workflow lifecycle events", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260302-006";

    await writeWorkflowSession(cwd, sessionId, {
      currentStage: "Phase 5 active",
      overallStatus: "in-progress",
      stageStatuses: ["approved", "approved", "approved", "approved", "pending"],
    });

    const harness = createApiHarness();
    registerSinfonicaExtension(harness.api);

    const sessionStartHandler = harness.handlers.get("session_start")?.[0];
    const toolResultHandler = harness.handlers.get("tool_result")?.[0];
    const agentEndHandler = harness.handlers.get("agent_end")?.[0];

    expect(harness.messageRenderers.has("sinfonica:status")).toBe(true);
    expect(sessionStartHandler).toBeDefined();
    expect(toolResultHandler).toBeDefined();
    expect(agentEndHandler).toBeDefined();

    await sessionStartHandler?.({ type: "session_start", cwd });
    await toolResultHandler?.({ type: "tool_result", cwd });
    await agentEndHandler?.({ type: "agent_end", cwd });

    expect(harness.sentMessages.length).toBe(1);
    expect(harness.sentMessages[0]).toMatchObject({
      customType: "sinfonica:status",
      details: {
        workflowId: "pi-surface-addition",
        currentStep: 5,
        totalSteps: 5,
        status: "in-progress",
      },
    });
  });

  it("injects active workflow context before agent start", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260302-006";

    await writeWorkflowSession(cwd, sessionId, {
      currentStage: "Phase 5 active",
      overallStatus: "in-progress",
      stageStatuses: ["approved", "approved", "approved", "approved", "pending"],
    });
    await writeDispatch(cwd, sessionId, "@sinfonica-coda");
    await writeReturnWithArtifacts(cwd, sessionId, [
      "surfaces/pi/src/enforcement/index.ts",
      "surfaces/pi/tests/phase4-enforcement.test.ts",
    ]);

    const harness = createApiHarness();
    registerSinfonicaExtension(harness.api);

    const beforeAgentStartHandler = harness.handlers.get("before_agent_start")?.[0];
    expect(beforeAgentStartHandler).toBeDefined();

    const result = await beforeAgentStartHandler?.({ type: "before_agent_start", prompt: "continue", cwd });
    expect(result).toMatchObject({
      message: {
        customType: "sinfonica:context",
      },
    });

    const content = ((result as { message?: { content?: string } }).message?.content ?? "") as string;
    expect(content).toContain("Workflow: pi-surface-addition");
    expect(content).toContain("Step: 5/5");
    expect(content).toContain("Persona: sinfonica-coda");
    expect(content).toContain("phase4-enforcement.test.ts");
  });

  it("skips context injection when there is no active workflow", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260302-010";

    await writeWorkflowSession(cwd, sessionId, {
      currentStage: "All done",
      overallStatus: "completed",
      stageStatuses: ["approved", "approved", "completed"],
    });

    const harness = createApiHarness();
    registerSinfonicaExtension(harness.api);

    const beforeAgentStartHandler = harness.handlers.get("before_agent_start")?.[0];
    const result = await beforeAgentStartHandler?.({ type: "before_agent_start", prompt: "hello", cwd });

    expect(result).toBeUndefined();
  });
});
