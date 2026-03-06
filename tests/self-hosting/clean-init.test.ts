/**
 * Clean Init Test — P1-EXIT-8
 *
 * Verifies that `sinfonica init --yes` on a clean directory produces all
 * expected files and that the generated personas validate with 0 errors.
 */

import { join } from "node:path";
import { mkdtemp, rm, access, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { validatePersonaPaths } from "../../src/validators/persona/validator.js";

const execFileAsync = promisify(execFile);

// Path to the built sinfonica CLI binary
const SINFONICA_BIN = join(import.meta.dirname, "../../dist/cli/index.js");

describe("Clean Init (P1-EXIT-8): sinfonica init --yes on a clean directory", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "sinfonica-clean-init-"));
    // Run sinfonica init --yes in the temp directory
    await execFileAsync("node", [SINFONICA_BIN, "init", "--yes"], {
      cwd: tmpDir,
    });
  });

  afterAll(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  // ── Generated file presence ──────────────────────────────────────────────

  it("generates .sinfonica/agents/ directory", async () => {
    await expect(access(join(tmpDir, ".sinfonica/agents"))).resolves.toBeUndefined();
  });

  it("generates .sinfonica/handoffs/ directory", async () => {
    await expect(access(join(tmpDir, ".sinfonica/handoffs"))).resolves.toBeUndefined();
  });

  it("generates .sinfonica/memory/ directory", async () => {
    await expect(access(join(tmpDir, ".sinfonica/memory"))).resolves.toBeUndefined();
  });

  it("generates .sinfonica/workflows/ directory", async () => {
    await expect(access(join(tmpDir, ".sinfonica/workflows"))).resolves.toBeUndefined();
  });

  it("generates .sinfonica/config.yaml", async () => {
    await expect(access(join(tmpDir, ".sinfonica/config.yaml"))).resolves.toBeUndefined();
  });

  it("generates all 6 persona files in .sinfonica/agents/", async () => {
    const personas = ["maestro", "libretto", "amadeus", "coda", "rondo", "metronome"];
    for (const persona of personas) {
      await expect(
        access(join(tmpDir, `.sinfonica/agents/${persona}.md`))
      ).resolves.toBeUndefined();
    }
  });

  it("generates built-in workflow definitions in .sinfonica/workflows/", async () => {
    const workflows = ["create-prd", "create-spec", "dev-story", "code-review"];
    for (const workflow of workflows) {
      await expect(access(join(tmpDir, `.sinfonica/workflows/${workflow}/workflow.md`))).resolves.toBeUndefined();
    }
  });

  it("generates .opencode/agent/ directory with 6 agent stubs", async () => {
    await expect(access(join(tmpDir, ".opencode/agent"))).resolves.toBeUndefined();
    const personas = ["maestro", "libretto", "amadeus", "coda", "rondo", "metronome"];
    for (const persona of personas) {
      await expect(
        access(join(tmpDir, `.opencode/agent/sinfonica-${persona}.md`))
      ).resolves.toBeUndefined();
    }
  });

  it("generates .opencode/command/ directory with 4 workflow commands", async () => {
    await expect(access(join(tmpDir, ".opencode/command"))).resolves.toBeUndefined();
    const commands = ["dev-story", "code-review", "create-prd", "create-spec"];
    for (const cmd of commands) {
      await expect(
        access(join(tmpDir, `.opencode/command/sinfonica-${cmd}.md`))
      ).resolves.toBeUndefined();
    }
  });

  it("generates .opencode/skills/ directory with 4 skill packages", async () => {
    await expect(access(join(tmpDir, ".opencode/skills"))).resolves.toBeUndefined();
    const skills = ["dev-story", "code-review", "create-prd", "create-spec"];
    for (const skill of skills) {
      await expect(
        access(join(tmpDir, `.opencode/skills/sinfonica-${skill}`))
      ).resolves.toBeUndefined();
    }
  });

  it("generates .opencode/plugins/sinfonica-enforcement.ts", async () => {
    await expect(
      access(join(tmpDir, ".opencode/plugins/sinfonica-enforcement.ts"))
    ).resolves.toBeUndefined();
  });

  it("generates .opencode/opencode.json", async () => {
    await expect(access(join(tmpDir, ".opencode/opencode.json"))).resolves.toBeUndefined();
  });

  it("writes .opencode/opencode.json with correct opencode schema ($schema, agent singular, mode/tools/description)", async () => {
    const config = JSON.parse(await readFile(join(tmpDir, ".opencode/opencode.json"), "utf8")) as Record<string, unknown>;

    // Must have $schema
    expect(config.$schema).toBe("https://opencode.ai/config.json");

    // Must have `agent` (singular) — not `agents` (plural)
    expect(config.agent).toBeDefined();
    expect(config.agents).toBeUndefined();

    // Must NOT have `plugins` or `sinfonica` keys (not part of opencode schema)
    expect(config.plugins).toBeUndefined();
    expect(config.sinfonica).toBeUndefined();

    const agent = config.agent as Record<string, unknown>;
    const expectedPersonas = ["maestro", "libretto", "amadeus", "coda", "rondo", "metronome"];

    for (const persona of expectedPersonas) {
      const key = `sinfonica-${persona}`;
      const entry = agent[key] as Record<string, unknown>;
      expect(entry).toBeDefined();
      // Each entry must have mode, tools, description — not a path string
      expect(typeof entry.mode).toBe("string");
      expect(entry.tools).toBeDefined();
      expect(typeof entry.description).toBe("string");
      expect((entry.description as string).length).toBeGreaterThan(0);
      // tools must be an object of booleans
      const tools = entry.tools as Record<string, unknown>;
      for (const [, val] of Object.entries(tools)) {
        expect(typeof val).toBe("boolean");
      }
    }

    // Maestro must be primary mode with full tool access
    const maestro = agent["sinfonica-maestro"] as Record<string, unknown>;
    expect(maestro.mode).toBe("primary");
    const maestroTools = maestro.tools as Record<string, boolean>;
    expect(maestroTools.read).toBe(true);
    expect(maestroTools.write).toBe(true);
    expect(maestroTools.edit).toBe(true);
    expect(maestroTools.bash).toBe(true);

    // Metronome must be subagent with read-only tools
    const metronome = agent["sinfonica-metronome"] as Record<string, unknown>;
    expect(metronome.mode).toBe("subagent");
    const metronomeTools = metronome.tools as Record<string, boolean>;
    expect(metronomeTools.read).toBe(true);
    expect(metronomeTools.write).toBeUndefined();
    expect(metronomeTools.edit).toBeUndefined();
    expect(metronomeTools.bash).toBeUndefined();
  });

  // ── Persona validation ───────────────────────────────────────────────────

  it("all 6 generated personas validate with 0 errors (validate agents dir)", async () => {
    const result = await validatePersonaPaths(
      join(tmpDir, ".sinfonica/agents"),
      true
    );
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });

  for (const persona of ["maestro", "libretto", "amadeus", "coda", "rondo", "metronome"]) {
    it(`generated ${persona}.md has 0 validation errors`, async () => {
      const result = await validatePersonaPaths(
        join(tmpDir, `.sinfonica/agents/${persona}.md`),
        false
      );
      const fileResult = result.files[0];
      expect(fileResult).toBeDefined();
      expect(fileResult!.errors).toHaveLength(0);
      expect(fileResult!.warnings).toHaveLength(0);
    });
  }
});
