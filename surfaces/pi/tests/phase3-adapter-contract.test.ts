import { describe, expect, it } from "vitest";

import { validateAdapterOperationDetails } from "../../../src/surfaces/adapter-contract.ts";
import registerSinfonicaExtension, { type ExtensionAPI } from "../index.ts";

type ExecResult = { stdout: string; stderr: string; code: number | null };

type TestContext = {
  cwd: string;
  ui: { notify: (message: string) => void };
};

type RegisteredTool = {
  name: string;
  execute: (toolCallId: string, params: unknown, signal?: AbortSignal, onUpdate?: unknown, ctx?: TestContext) => Promise<{
    details: unknown;
    isError?: boolean;
  }>;
};

const createHarness = (execHandler: (command: string, args: string[]) => Promise<ExecResult>) => {
  const tools: RegisteredTool[] = [];
  const api: ExtensionAPI = {
    registerTool: (tool) => {
      tools.push(tool as unknown as RegisteredTool);
    },
    registerCommand: () => {},
    exec: (command, args) => execHandler(command, args),
  };

  registerSinfonicaExtension(api);
  return { tools };
};

describe("pi extension phase 3 adapter contract", () => {
  it("emits normalized contract details for start and advance tool calls", async () => {
    const harness = createHarness(async (_command, args) => {
      if (args[0] === "start") {
        return { stdout: "started", stderr: "", code: 0 };
      }
      return { stdout: "", stderr: "blocked", code: 1 };
    });

    const startTool = harness.tools.find((tool) => tool.name === "sinfonica_start_workflow");
    const advanceTool = harness.tools.find((tool) => tool.name === "sinfonica_advance_step");
    expect(startTool).toBeDefined();
    expect(advanceTool).toBeDefined();

    const startResult = await startTool!.execute("t-1", { workflowType: "create-prd" });
    const advanceResult = await advanceTool!.execute("t-2", { decision: "approve" });

    expect(validateAdapterOperationDetails(startResult.details)).toEqual([]);
    expect(validateAdapterOperationDetails(advanceResult.details)).toEqual([]);
    expect(advanceResult.isError).toBe(true);
  });
});
