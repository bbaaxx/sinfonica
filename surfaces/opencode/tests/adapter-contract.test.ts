import { describe, expect, it } from "vitest";

import { validateAdapterOperationDetails } from "../../../src/surfaces/adapter-contract.ts";
import { normalizeOpenCodeOperationError, normalizeOpenCodeOperationSuccess } from "../src/adapter-contract.ts";

describe("opencode adapter contract", () => {
  it("normalizes workflow start and step advance details", () => {
    const start = normalizeOpenCodeOperationSuccess({
      operation: "workflow.start",
      command: "sinfonica start create-prd",
      code: 0,
      stdout: "started",
      payload: {
        workflowType: "create-prd",
        context: null,
      },
    });

    const advanceError = normalizeOpenCodeOperationError({
      operation: "step.advance",
      command: "sinfonica advance --decision approve",
      error: "advance failed",
      code: 1,
      payload: {
        decision: "approve",
        feedback: null,
      },
    });

    expect(validateAdapterOperationDetails(start)).toEqual([]);
    expect(validateAdapterOperationDetails(advanceError)).toEqual([]);
  });

  it("normalizes status reporting payload", () => {
    const status = normalizeOpenCodeOperationSuccess({
      operation: "status.reporting",
      command: "sinfonica list",
      code: 0,
      stdout: "- create-prd",
      payload: {
        workflows: ["create-prd"],
        count: 1,
      },
    });

    expect(status.payload).toEqual({ workflows: ["create-prd"], count: 1 });
    expect(validateAdapterOperationDetails(status)).toEqual([]);
  });
});
