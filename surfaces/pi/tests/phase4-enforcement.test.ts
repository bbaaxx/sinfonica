import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import registerSinfonicaExtension, { type ExtensionAPI } from "../index.ts";
import { checkToolCallAgainstRules } from "../src/enforcement/checker.ts";
import { registerEnforcementBridge } from "../src/enforcement/index.ts";
import { loadEnforcementRules } from "../src/enforcement/loader.ts";

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonica-phase4-test-"));
  tempDirs.push(dir);
  return dir;
};

const writeRule = async (cwd: string, fileName: string, content: string): Promise<void> => {
  const rulesDir = join(cwd, ".sinfonica", "enforcement", "rules");
  await mkdir(rulesDir, { recursive: true });
  await writeFile(join(rulesDir, fileName), content, "utf8");
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("phase 4 enforcement loader", () => {
  it("loads and parses rule definitions from .sinfonica/enforcement/rules", async () => {
    const cwd = await makeTempDir();
    await writeRule(
      cwd,
      "enf-901.md",
      [
        "---",
        "id: ENF-901",
        "severity: blocking",
        "patterns:",
        "  - ^bash$",
        "message: bash is blocked",
        "---",
      ].join("\n")
    );

    const rules = await loadEnforcementRules(cwd);

    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      id: "ENF-901",
      severity: "blocking",
      patterns: ["^bash$"],
      message: "bash is blocked",
    });
  });
});

describe("phase 4 enforcement checker", () => {
  it("classifies blocking, advisory, and injection violations", () => {
    const result = checkToolCallAgainstRules(
      { toolName: "bash", arguments: { command: "rm -rf" } },
      [
        { id: "ENF-901", severity: "blocking", patterns: ["^bash\\b"], message: "block bash" },
        { id: "ENF-902", severity: "advisory", patterns: ["rm -rf"], message: "dangerous rm" },
        { id: "ENF-903", severity: "injection", patterns: ["^bash\\b"], inject: "Use dry-run first" },
      ]
    );

    expect(result.blocking).toHaveLength(1);
    expect(result.advisory).toHaveLength(1);
    expect(result.injection).toHaveLength(1);
    expect(result.injectedContext).toEqual(["Use dry-run first"]);
  });
});

describe("phase 4 enforcement interceptor", () => {
  it("blocks execution for blocking violations", async () => {
    const cwd = await makeTempDir();
    await writeRule(
      cwd,
      "enf-901.md",
      [
        "---",
        "id: ENF-901",
        "severity: blocking",
        "patterns:",
        "  - ^bash$",
        "message: Tool blocked",
        "---",
      ].join("\n")
    );

    let toolCallHandler: ((event: Record<string, unknown>) => Promise<unknown>) | undefined;
    const api = {
      on: (event: string, handler: (payload: Record<string, unknown>) => Promise<unknown>) => {
        if (event === "tool_call") {
          toolCallHandler = handler;
        }
      },
    };

    const notify = vi.fn();
    const bridge = registerEnforcementBridge(api, { cwd, notify });
    await bridge.reload(cwd);

    const block = vi.fn();
    const injectContext = vi.fn();
    await toolCallHandler?.({ toolName: "bash", arguments: { command: "ls" }, block, injectContext });

    expect(block).toHaveBeenCalledTimes(1);
    expect(injectContext).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("injects context and notifies for non-blocking violations", async () => {
    const cwd = await makeTempDir();
    await writeRule(
      cwd,
      "enf-902.md",
      [
        "---",
        "id: ENF-902",
        "severity: advisory",
        "patterns:",
        "  - ^bash$",
        "message: check command safety",
        "---",
      ].join("\n")
    );
    await writeRule(
      cwd,
      "enf-903.md",
      [
        "---",
        "id: ENF-903",
        "severity: injection",
        "patterns:",
        "  - ^bash$",
        "inject: include current workflow state",
        "---",
      ].join("\n")
    );

    let toolCallHandler: ((event: Record<string, unknown>) => Promise<unknown>) | undefined;
    const api = {
      on: (event: string, handler: (payload: Record<string, unknown>) => Promise<unknown>) => {
        if (event === "tool_call") {
          toolCallHandler = handler;
        }
      },
    };

    const notify = vi.fn();
    const bridge = registerEnforcementBridge(api, { cwd, notify });
    await bridge.reload(cwd);

    const block = vi.fn();
    const injectContext = vi.fn();
    await toolCallHandler?.({ toolName: "bash", arguments: { command: "ls" }, block, injectContext });

    expect(block).not.toHaveBeenCalled();
    expect(injectContext).toHaveBeenCalledWith("include current workflow state");
    expect(notify).toHaveBeenCalledWith(expect.stringContaining("ENF-902"), "warning");
  });

  it("reload command refreshes rules for /sinfonica reload", async () => {
    const cwd = await makeTempDir();
    const tools: Array<{ name: string }> = [];
    const commands: Array<{ name: string; handler: (args: string | undefined, ctx: { cwd: string; ui: { notify: (message: string, level?: "info" | "warning" | "error") => void } }) => Promise<void> }> = [];
    const notifications: string[] = [];

    const api: ExtensionAPI = {
      registerTool: (tool) => {
        tools.push({ name: tool.name });
      },
      registerCommand: (name, command) => {
        commands.push({ name, handler: command.handler });
      },
      exec: async () => ({ stdout: "", stderr: "", code: 0 }),
      on: () => {},
    };

    registerSinfonicaExtension(api);
    expect(tools.length).toBe(3);

    const command = commands.find((entry) => entry.name === "sinfonica");
    expect(command).toBeDefined();

    await command?.handler("reload", {
      cwd,
      ui: {
        notify: (message) => notifications.push(message),
      },
    });

    expect(notifications.some((item) => item.includes("reloaded"))).toBe(true);
  });
});
