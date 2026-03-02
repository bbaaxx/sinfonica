import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the registry so we control what rules are returned
vi.mock("../../src/enforcement/registry.js", () => ({
  listRules: vi.fn(),
  registerRule: vi.fn(),
  getRuleById: vi.fn(),
  clearRegistry: vi.fn(),
}));

import { listRules } from "../../src/enforcement/registry.js";
import type { EnforcementRule } from "../../src/enforcement/registry.js";
import { runRulesCommand } from "../../src/cli/rules.js";

const mockListRules = vi.mocked(listRules);

const sampleRules: EnforcementRule[] = [
  {
    id: "ENF-001",
    name: "TDD Enforcer",
    description: "Blocks writes without a corresponding test change",
    severity: "blocking",
    hook: "tool.execute.before",
    layer: "dual",
    enabled: true,
  },
  {
    id: "ENF-002",
    name: "Secret Protection",
    description: "Blocks access to credential files",
    severity: "blocking",
    hook: "tool.execute.before",
    layer: "plugin",
    enabled: true,
  },
];

describe("runRulesCommand", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Default (table) output ────────────────────────────────────────────────

  it("returns 0 when rules are listed successfully", async () => {
    mockListRules.mockReturnValue(sampleRules);
    const exitCode = await runRulesCommand({ json: false });
    expect(exitCode).toBe(0);
  });

  it("outputs rule IDs in table format", async () => {
    mockListRules.mockReturnValue(sampleRules);
    await runRulesCommand({ json: false });
    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("ENF-001");
    expect(output).toContain("ENF-002");
  });

  it("outputs rule names in table format", async () => {
    mockListRules.mockReturnValue(sampleRules);
    await runRulesCommand({ json: false });
    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("TDD Enforcer");
    expect(output).toContain("Secret Protection");
  });

  it("outputs severity in table format", async () => {
    mockListRules.mockReturnValue(sampleRules);
    await runRulesCommand({ json: false });
    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("blocking");
  });

  it("outputs hook in table format", async () => {
    mockListRules.mockReturnValue(sampleRules);
    await runRulesCommand({ json: false });
    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("tool.execute.before");
  });

  it("shows message when no rules are registered", async () => {
    mockListRules.mockReturnValue([]);
    const exitCode = await runRulesCommand({ json: false });
    expect(exitCode).toBe(0);
    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("No enforcement rules");
  });

  // ─── JSON output ───────────────────────────────────────────────────────────

  it("outputs valid JSON when --json flag is set", async () => {
    mockListRules.mockReturnValue(sampleRules);
    await runRulesCommand({ json: true });
    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("");
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("JSON output contains all rules", async () => {
    mockListRules.mockReturnValue(sampleRules);
    await runRulesCommand({ json: true });
    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("");
    const parsed = JSON.parse(output) as unknown[];
    expect(parsed).toHaveLength(2);
  });

  it("JSON output includes rule ID and name", async () => {
    mockListRules.mockReturnValue(sampleRules);
    await runRulesCommand({ json: true });
    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("");
    const parsed = JSON.parse(output) as Array<{ id: string; name: string }>;
    expect(parsed[0]?.id).toBe("ENF-001");
    expect(parsed[0]?.name).toBe("TDD Enforcer");
  });

  it("JSON output preserves machine-readable rule fields", async () => {
    mockListRules.mockReturnValue(sampleRules);
    await runRulesCommand({ json: true });
    const output = consoleLogSpy.mock.calls.map((c) => c[0]).join("");
    const parsed = JSON.parse(output) as Array<Record<string, unknown>>;

    expect(Object.keys(parsed[0] ?? {}).sort()).toEqual([
      "description",
      "enabled",
      "hook",
      "id",
      "layer",
      "name",
      "severity",
    ]);
  });

  it("returns 0 for JSON output", async () => {
    mockListRules.mockReturnValue(sampleRules);
    const exitCode = await runRulesCommand({ json: true });
    expect(exitCode).toBe(0);
  });
});
