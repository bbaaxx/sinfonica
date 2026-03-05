import { describe, expect, it } from "vitest";

import { WORKFLOW_STUBS, toCommandStub, toSkill } from "../src/workflow-stubs.ts";

describe("opencode workflow stubs", () => {
  it("contains expected default workflow stubs", () => {
    expect(WORKFLOW_STUBS.map((entry) => entry.workflowId)).toEqual([
      "create-prd",
      "create-spec",
      "dev-story",
      "code-review"
    ]);
  });

  it("renders command and skill content for a workflow", () => {
    const workflow = WORKFLOW_STUBS[0];
    const command = toCommandStub(workflow);
    const skill = toSkill(workflow);

    expect(command).toContain(`name: ${workflow.commandName}`);
    expect(command).toContain(`workflow \`${workflow.workflowId}\``);
    expect(command).toContain(`.opencode/skills/${workflow.skillName}/SKILL.md`);
    expect(skill).toContain(`# ${workflow.skillName}`);
    expect(skill).toContain("## Steps");
  });
});
