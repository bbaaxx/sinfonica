import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { validatePersonaPaths } from "../../src/validators/persona/validator.js";

describe("Story 2.1.1 maestro persona", () => {
  it("validates maestro persona with zero errors and limited warnings", async () => {
    const personaPath = join(process.cwd(), "agents/maestro.md");
    const result = await validatePersonaPaths(personaPath, false);

    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBeLessThanOrEqual(5);
  });

  it("includes interactive orchestrator menu content", async () => {
    const content = await readFile(join(process.cwd(), "agents/maestro.md"), "utf8");

    expect(content).toContain("persona_mode: interactive");
    expect(content).toContain("## Activation Sequence");
    expect(content).toContain("## Menu");
    expect(content).toContain("approve");
    expect(content).toMatch(/resume/i);
  });

  it("uses warmer conversational guidance without dropping orchestration cues", async () => {
    const content = await readFile(join(process.cwd(), "agents/maestro.md"), "utf8");

    expect(content).toContain("warm");
    expect(content).toContain("conversational");
    expect(content).toContain("stage status");
    expect(content).toContain("blockers");
    expect(content).toContain("next action");
    expect(content).toContain("approval");
  });

  it("keeps generated maestro stub aligned with canonical persona guidance", async () => {
    const personaContent = await readFile(join(process.cwd(), "agents/maestro.md"), "utf8");
    const stubContent = await readFile(join(process.cwd(), ".opencode/agent/sinfonia-maestro.md"), "utf8");

    expect(personaContent).toContain("Use a warm, conversational tone while staying action-first.");
    expect(stubContent).toContain("Use a warm, conversational tone while staying action-first.");
    expect(personaContent).toContain("Every stage update must include stage status, blockers (or explicit None), next action, and approval requirement when applicable.");
    expect(stubContent).toContain("Every stage update must include stage status, blockers (or explicit None), next action, and approval requirement when applicable.");
  });

  it("has a generated opencode maestro stub", async () => {
    const stubPath = join(process.cwd(), ".opencode/agent/sinfonia-maestro.md");
    await expect(access(stubPath)).resolves.toBeUndefined();
  });
});
