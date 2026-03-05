import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import registerSinfonicaExtension, { type ExtensionAPI } from "../index.ts";

type ExecCall = { command: string; args: string[] };

type TestContext = {
  cwd: string;
  ui: { notify: (message: string) => void };
};

type RegisteredTool = {
  name: string;
  execute: (toolCallId: string, params: unknown, signal?: AbortSignal, onUpdate?: unknown, ctx?: TestContext) => Promise<{
    content: Array<{ type: "text"; text: string }>;
    details: Record<string, unknown>;
  }>;
};

type RegisteredCommand = {
  name: string;
  handler: (args: string | undefined, ctx: TestContext) => Promise<void>;
};

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonica-pi-extension-test-"));
  tempDirs.push(dir);
  return dir;
};

const createApiHarness = (execHandler?: (command: string, args: string[]) => Promise<{ stdout: string; stderr: string; code: number | null }>) => {
  const tools: RegisteredTool[] = [];
  const commands: RegisteredCommand[] = [];
  const execCalls: ExecCall[] = [];

  const api: ExtensionAPI = {
    registerTool: (tool) => {
      tools.push(tool as unknown as RegisteredTool);
    },
    registerCommand: (name, command) => {
      commands.push({ name, handler: command.handler as RegisteredCommand["handler"] });
    },
    exec: async (command, args) => {
      execCalls.push({ command, args });
      if (execHandler) {
        return execHandler(command, args);
      }
      return { stdout: "", stderr: "", code: 0 };
    },
  };

  return { api, tools, commands, execCalls };
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("pi sinfonica extension phase 2", () => {
  it("registers the three core tools and /sinfonica command", () => {
    const harness = createApiHarness();
    registerSinfonicaExtension(harness.api);

    expect(harness.tools.map((tool) => tool.name)).toEqual([
      "sinfonica_start_workflow",
      "sinfonica_advance_step",
      "sinfonica_list_workflows",
    ]);
    expect(harness.commands.map((command) => command.name)).toEqual(["sinfonica"]);
  });

  it("delegates start workflow to sinfonica start", async () => {
    const harness = createApiHarness(async () => ({ stdout: "started", stderr: "", code: 0 }));
    registerSinfonicaExtension(harness.api);

    const startTool = harness.tools.find((tool) => tool.name === "sinfonica_start_workflow");
    expect(startTool).toBeDefined();

    const result = await startTool!.execute("call-1", {
      workflowType: "create-prd",
      context: "Draft checkout flow",
    });

    expect(harness.execCalls).toEqual([
      { command: "sinfonica", args: ["start", "create-prd", "--context", "Draft checkout flow"] },
    ]);
    expect(result.details).toMatchObject({ ok: true, workflowType: "create-prd" });
  });

  it("delegates advance decision to sinfonica advance", async () => {
    const harness = createApiHarness(async () => ({ stdout: "advanced", stderr: "", code: 0 }));
    registerSinfonicaExtension(harness.api);

    const advanceTool = harness.tools.find((tool) => tool.name === "sinfonica_advance_step");
    expect(advanceTool).toBeDefined();

    const result = await advanceTool!.execute("call-2", {
      decision: "request-revision",
      feedback: "Clarify section 2",
    });

    expect(harness.execCalls).toEqual([
      {
        command: "sinfonica",
        args: ["advance", "--decision", "request-revision", "--feedback", "Clarify section 2"],
      },
    ]);
    expect(result.details).toMatchObject({ ok: true, decision: "request-revision" });
  });

  it("lists workflows from workflows directory", async () => {
    const cwd = await makeTempDir();
    await mkdir(join(cwd, "workflows", "beta-workflow"), { recursive: true });
    await mkdir(join(cwd, "workflows", "alpha-workflow"), { recursive: true });

    const harness = createApiHarness();
    registerSinfonicaExtension(harness.api);

    const listTool = harness.tools.find((tool) => tool.name === "sinfonica_list_workflows");
    expect(listTool).toBeDefined();

    const result = await listTool!.execute("call-3", {}, undefined, undefined, {
      cwd,
      ui: { notify: () => {} },
    });

    expect(result.details).toMatchObject({
      ok: true,
      workflows: ["alpha-workflow", "beta-workflow"],
      count: 2,
    });
  });

  it("routes /sinfonica status advance list abort", async () => {
    const cwd = await makeTempDir();
    await mkdir(join(cwd, "workflows", "create-prd"), { recursive: true });

    const notifications: string[] = [];
    const harness = createApiHarness(async () => ({ stdout: "ok", stderr: "", code: 0 }));
    registerSinfonicaExtension(harness.api);

    const command = harness.commands.find((entry) => entry.name === "sinfonica");
    expect(command).toBeDefined();

    const ctx: TestContext = { cwd, ui: { notify: (message) => notifications.push(message) } };
    await command!.handler("status", ctx);
    await command!.handler("advance approve", ctx);
    await command!.handler("list", ctx);
    await command!.handler("abort", ctx);

    expect(harness.execCalls).toEqual([
      { command: "sinfonica", args: ["status"] },
      { command: "sinfonica", args: ["advance", "--decision", "approve"] },
      { command: "sinfonica", args: ["abort"] },
    ]);
    expect(notifications.some((item) => item.includes("create-prd"))).toBe(true);
  });
});
