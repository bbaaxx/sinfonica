import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { initPipeline } from "../../../src/workflow/coordinator.js";
import registerSinfonicaExtension, { type ExtensionAPI } from "../index.ts";

type ExecCall = { command: string; args: string[] };

const makeTestCtx = (cwd: string, notifyFn?: (message: string, level?: string) => void) => ({
  cwd,
  ui: {
    notify: notifyFn ?? (() => {}),
    confirm: async () => false,
    select: async () => undefined as string | undefined,
    input: async () => undefined as string | undefined,
    setStatus: () => {},
    setWidget: () => {},
  },
  waitForIdle: async () => {},
  newSession: async () => {},
  fork: async () => {},
  navigateTree: async () => {},
  reload: async () => {},
});

type TestCtx = ReturnType<typeof makeTestCtx>;

type RegisteredTool = {
  name: string;
  execute: (toolCallId: string, params: unknown, signal: AbortSignal, onUpdate: unknown, ctx: TestCtx) => Promise<{
    content: Array<{ type: "text"; text: string }>;
    details: Record<string, unknown>;
  }>;
};

type RegisteredCommand = {
  name: string;
  handler: (args: string | undefined, ctx: TestCtx) => Promise<void>;
};

const tempDirs: string[] = [];
const dummySignal = new AbortController().signal;

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
    on: () => {},
    sendMessage: () => {},
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
    }, dummySignal, undefined, makeTestCtx(process.cwd()));

    expect(harness.execCalls).toEqual([
      { command: "sinfonica", args: ["start", "create-prd", "--context", "Draft checkout flow"] },
    ]);
    expect(result.details).toMatchObject({ ok: true, workflowType: "create-prd" });
  });

  it("falls back to local workflow start when CLI start is unsupported", async () => {
    const cwd = await makeTempDir();
    const harness = createApiHarness(async () => ({ stdout: "", stderr: "error: unknown command 'start'", code: 1 }));
    registerSinfonicaExtension(harness.api);

    const startTool = harness.tools.find((tool) => tool.name === "sinfonica_start_workflow");
    expect(startTool).toBeDefined();

    const result = await startTool!.execute(
      "call-1b",
      { workflowType: "create-prd", context: "Draft checkout flow" },
      dummySignal,
      undefined,
      makeTestCtx(cwd)
    );

    expect(harness.execCalls).toEqual([{ command: "sinfonica", args: ["start", "create-prd", "--context", "Draft checkout flow"] }]);
    expect(result.details).toMatchObject({ ok: true, workflowType: "create-prd", context: "Draft checkout flow" });
    expect(result.content[0].text).toContain("Started workflow create-prd in session");

    const match = result.content[0].text.match(/session\s+(s-[0-9-]+)/);
    expect(match).toBeTruthy();
    const sessionId = match![1];
    const workflow = await readFile(join(cwd, ".sinfonica", "handoffs", sessionId, "workflow.md"), "utf8");
    expect(workflow).toContain("workflow_id: create-prd");
    expect(workflow).toContain("total_steps: 4");
  });

  it("delegates advance decision to sinfonica advance", async () => {
    const harness = createApiHarness(async () => ({ stdout: "advanced", stderr: "", code: 0 }));
    registerSinfonicaExtension(harness.api);

    const advanceTool = harness.tools.find((tool) => tool.name === "sinfonica_advance_step");
    expect(advanceTool).toBeDefined();

    const result = await advanceTool!.execute("call-2", {
      decision: "request-revision",
      feedback: "Clarify section 2",
    }, dummySignal, undefined, makeTestCtx(process.cwd()));

    expect(harness.execCalls).toEqual([
      {
        command: "sinfonica",
        args: ["advance", "--decision", "request-revision", "--feedback", "Clarify section 2"],
      },
    ]);
    expect(result.details).toMatchObject({ ok: true, decision: "request-revision" });
  });

  it("falls back to local workflow advance when CLI advance is unsupported", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260305-000100";
    await initPipeline(cwd, ["create-prd"], "Draft checkout flow", sessionId);

    const harness = createApiHarness(async () => ({ stdout: "", stderr: "error: unknown command 'advance'", code: 1 }));
    registerSinfonicaExtension(harness.api);

    const advanceTool = harness.tools.find((tool) => tool.name === "sinfonica_advance_step");
    expect(advanceTool).toBeDefined();

    // request-revision bypasses evidence gate, so it should proceed
    const result = await advanceTool!.execute(
      "call-2b",
      { decision: "request-revision", feedback: "Looks good" },
      dummySignal,
      undefined,
      makeTestCtx(cwd)
    );

    expect(harness.execCalls).toEqual([
      {
        command: "sinfonica",
        args: ["advance", "--decision", "request-revision", "--feedback", "Looks good"],
      },
    ]);
    expect(result.details).toMatchObject({ ok: true, decision: "request-revision", feedback: "Looks good" });
    expect(result.content[0].text).toContain(`Recorded request-revision for session ${sessionId}`);

    const workflow = await readFile(join(cwd, ".sinfonica", "handoffs", sessionId, "workflow.md"), "utf8");
    expect(workflow).toContain("workflow_status: blocked");
  });

  it("lists workflows from .sinfonica/workflows directory", async () => {
    const cwd = await makeTempDir();
    await mkdir(join(cwd, ".sinfonica", "workflows", "beta-workflow"), { recursive: true });
    await mkdir(join(cwd, ".sinfonica", "workflows", "alpha-workflow"), { recursive: true });

    const harness = createApiHarness();
    registerSinfonicaExtension(harness.api);

    const listTool = harness.tools.find((tool) => tool.name === "sinfonica_list_workflows");
    expect(listTool).toBeDefined();

    const result = await listTool!.execute("call-3", {}, dummySignal, undefined, makeTestCtx(cwd));

    expect(result.details).toMatchObject({
      ok: true,
      workflows: ["alpha-workflow", "beta-workflow"],
      count: 2,
    });
  });

  it("returns empty list when no workflows directory exists", async () => {
    const cwd = await makeTempDir();
    const harness = createApiHarness();
    registerSinfonicaExtension(harness.api);

    const listTool = harness.tools.find((tool) => tool.name === "sinfonica_list_workflows");
    expect(listTool).toBeDefined();

    const result = await listTool!.execute("call-4", {}, dummySignal, undefined, makeTestCtx(cwd));

    expect(result.details).toMatchObject({
      ok: true,
      workflows: [],
      count: 0,
    });
  });

  it("routes /sinfonica status advance list abort", async () => {
    const cwd = await makeTempDir();
    await mkdir(join(cwd, ".sinfonica", "workflows", "create-prd"), { recursive: true });

    const notifications: string[] = [];
    const harness = createApiHarness(async () => ({ stdout: "ok", stderr: "", code: 0 }));
    registerSinfonicaExtension(harness.api);

    const command = harness.commands.find((entry) => entry.name === "sinfonica");
    expect(command).toBeDefined();

    // Use request-revision to bypass both confirm dialog and evidence gate
    const ctx = makeTestCtx(cwd, (message) => { notifications.push(message); });
    await command!.handler("status", ctx);
    await command!.handler("advance request-revision", ctx);
    await command!.handler("list", ctx);
    await command!.handler("abort", ctx);

    expect(harness.execCalls).toEqual([
      { command: "sinfonica", args: ["advance", "--decision", "request-revision"] },
      { command: "sinfonica", args: ["abort"] },
    ]);
    expect(notifications.some((item) => item.includes("Sinfonica status:"))).toBe(true);
  });

  it("defaults /sinfonica with no args to local status", async () => {
    const cwd = await makeTempDir();
    await mkdir(join(cwd, ".sinfonica", "workflows", "dev-story"), { recursive: true });

    const notifications: string[] = [];
    const harness = createApiHarness(async () => ({ stdout: "ok", stderr: "", code: 0 }));
    registerSinfonicaExtension(harness.api);

    const command = harness.commands.find((entry) => entry.name === "sinfonica");
    expect(command).toBeDefined();

    const ctx = makeTestCtx(cwd, (message) => { notifications.push(message); });
    await command!.handler(undefined, ctx);

    expect(harness.execCalls).toEqual([]);
    expect(notifications.some((item) => item.includes("Sinfonica status: ready"))).toBe(true);
    expect(notifications.some((item) => item.includes("dev-story"))).toBe(true);
  });

  it("falls back for /sinfonica advance when CLI advance is unsupported", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260305-000101";
    await initPipeline(cwd, ["create-prd"], "Draft checkout flow", sessionId);

    const notifications: string[] = [];
    const harness = createApiHarness(async (_command, args) => {
      if (args[0] === "advance") {
        return { stdout: "", stderr: "error: unknown command 'advance'", code: 1 };
      }
      return { stdout: "", stderr: "", code: 0 };
    });
    registerSinfonicaExtension(harness.api);

    const command = harness.commands.find((entry) => entry.name === "sinfonica");
    expect(command).toBeDefined();

    const ctx = makeTestCtx(cwd, (message) => { notifications.push(message); });
    await command!.handler("advance request-revision Needs more detail", ctx);

    expect(notifications.some((item) => item.includes(`Sinfonica advance recorded for session ${sessionId}`))).toBe(true);
    const workflow = await readFile(join(cwd, ".sinfonica", "handoffs", sessionId, "workflow.md"), "utf8");
    expect(workflow).toContain("workflow_status: blocked");
  });

  it("falls back for /sinfonica abort when CLI abort is unsupported", async () => {
    const cwd = await makeTempDir();
    const sessionId = "s-20260305-000102";
    await initPipeline(cwd, ["create-prd"], "Draft checkout flow", sessionId);

    const notifications: string[] = [];
    const harness = createApiHarness(async (_command, args) => {
      if (args[0] === "abort") {
        return { stdout: "", stderr: "error: unknown command 'abort'", code: 1 };
      }
      return { stdout: "", stderr: "", code: 0 };
    });
    registerSinfonicaExtension(harness.api);

    const command = harness.commands.find((entry) => entry.name === "sinfonica");
    expect(command).toBeDefined();

    const ctx = makeTestCtx(cwd, (message) => { notifications.push(message); });
    await command!.handler("abort", ctx);

    expect(notifications.some((item) => item.includes(`Sinfonica abort recorded for session ${sessionId}`))).toBe(true);
    const workflow = await readFile(join(cwd, ".sinfonica", "handoffs", sessionId, "workflow.md"), "utf8");
    expect(workflow).toContain("workflow_status: failed");
  });
});
