import { describe, expect, it } from "vitest";

import {
  validateAdapterOperationDetails,
  type AdapterOperation,
  type AdapterOperationDetails,
} from "../../src/surfaces/adapter-contract.ts";
import {
  normalizeOpenCodeOperationError,
  normalizeOpenCodeOperationSuccess,
} from "../../surfaces/opencode/src/adapter-contract.ts";
import registerSinfonicaExtension, { type ExtensionAPI } from "../../surfaces/pi/index.ts";

type ExecResult = { stdout: string; stderr: string; code: number | null };

type TestContext = {
  cwd: string;
  ui: {
    notify: (message: string) => void;
    confirm: (title: string, message: string) => Promise<boolean>;
    select: (title: string, options: string[]) => Promise<string | undefined>;
    input: (title: string, placeholder?: string) => Promise<string | undefined>;
    setStatus: (id: string, text: string | undefined) => void;
    setWidget: (id: string, lines: string[] | undefined) => void;
  };
  waitForIdle: () => Promise<void>;
  newSession: () => Promise<void>;
  fork: () => Promise<void>;
  navigateTree: () => Promise<void>;
  reload: () => Promise<void>;
};

type RegisteredTool = {
  name: string;
  execute: (toolCallId: string, params: unknown, signal: AbortSignal, onUpdate: unknown, ctx: TestContext) => Promise<{
    details: AdapterOperationDetails;
    isError?: boolean;
  }>;
};

const dummySignal = new AbortController().signal;

const makeTestCtx = (): TestContext => ({
  cwd: process.cwd(),
  ui: {
    notify: () => {},
    confirm: async () => false,
    select: async () => undefined,
    input: async () => undefined,
    setStatus: () => {},
    setWidget: () => {},
  },
  waitForIdle: async () => {},
  newSession: async () => {},
  fork: async () => {},
  navigateTree: async () => {},
  reload: async () => {},
});

const createPiHarness = (execHandler: (command: string, args: string[]) => Promise<ExecResult>) => {
  const tools: RegisteredTool[] = [];

  const api: ExtensionAPI = {
    registerTool: (tool) => {
      tools.push(tool as unknown as RegisteredTool);
    },
    registerCommand: () => {},
    exec: (command, args) => execHandler(command, args),
    on: () => {},
    sendMessage: () => {},
  };

  registerSinfonicaExtension(api);
  return { tools };
};

const assertValid = (details: AdapterOperationDetails): void => {
  const issues = validateAdapterOperationDetails(details);
  expect(issues).toEqual([]);
};

describe("adapter contract compatibility", () => {
  it("C8: pi adapter emits contract-valid details for workflow start", async () => {
    const harness = createPiHarness(async () => ({ stdout: "started", stderr: "", code: 0 }));
    const tool = harness.tools.find((entry) => entry.name === "sinfonica_start_workflow");
    expect(tool).toBeDefined();

    const result = await tool!.execute("tc-1", { workflowType: "create-spec", context: "Draft stage flow" }, dummySignal, undefined, makeTestCtx());
    assertValid(result.details);
    expect(result.details.operation).toBe("workflow.start");
  });

  it("C8: opencode adapter emits contract-valid details for required operations", () => {
    const operations: AdapterOperation[] = ["workflow.start", "step.advance", "status.reporting"];

    for (const operation of operations) {
      const details = normalizeOpenCodeOperationSuccess({
        operation,
        command: "sinfonica",
        code: 0,
        stdout: "ok",
        payload:
          operation === "workflow.start"
            ? { workflowType: "create-prd", context: null }
            : operation === "step.advance"
              ? { decision: "approve", feedback: null }
              : { workflows: ["create-prd"], count: 1 },
      });

      assertValid(details);
    }
  });

  it("C9: required payload and error shapes are asserted across operation classes", async () => {
    const piHarness = createPiHarness(async (_command, args) => {
      if (args[0] === "start") {
        return { stdout: "started", stderr: "", code: 0 };
      }
      if (args[0] === "advance") {
        return { stdout: "", stderr: "cannot advance", code: 1 };
      }
      return { stdout: "", stderr: "", code: 0 };
    });

    const startTool = piHarness.tools.find((entry) => entry.name === "sinfonica_start_workflow");
    const advanceTool = piHarness.tools.find((entry) => entry.name === "sinfonica_advance_step");
    const listTool = piHarness.tools.find((entry) => entry.name === "sinfonica_list_workflows");
    expect(startTool).toBeDefined();
    expect(advanceTool).toBeDefined();
    expect(listTool).toBeDefined();

    const start = await startTool!.execute("tc-2", { workflowType: "dev-story" }, dummySignal, undefined, makeTestCtx());
    const advance = await advanceTool!.execute("tc-3", { decision: "request-revision" }, dummySignal, undefined, makeTestCtx());
    const list = normalizeOpenCodeOperationError({
      operation: "status.reporting",
      command: "sinfonica list",
      error: "workflow scan failed",
      payload: { workflows: [], count: 0 },
    });

    expect(start.details.payload).toMatchObject({ workflowType: "dev-story", context: null });
    expect(advance.details.payload).toMatchObject({ decision: "request-revision", feedback: null });
    expect(advance.details.error).toMatchObject({ message: "cannot advance" });
    expect(list.payload).toMatchObject({ workflows: [], count: 0 });
    expect(list.error).toMatchObject({ message: "workflow scan failed" });
  });

  it("C10: drift detection catches fixture schema mismatch", () => {
    const driftedFixture = {
      ok: true,
      adapter: "pi",
      operation: "workflow.start",
      command: "sinfonica start create-prd",
      code: 0,
      stdout: "started",
      stderr: "",
      payload: {
        workflow: "create-prd",
        context: null,
      },
      error: null,
    } satisfies Omit<AdapterOperationDetails, "payload"> & { payload: Record<string, unknown> };

    const issues = validateAdapterOperationDetails(driftedFixture);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((issue) => issue.path === "payload.workflowType")).toBe(true);
  });
});
