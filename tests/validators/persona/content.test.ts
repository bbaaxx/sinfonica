import { describe, expect, it } from "vitest";

import { validatePersonaContent } from "../../../src/validators/persona/content.js";

const validContent = `---
persona_id: maestro
name: Maestro
role: Orchestrator
description: Coordinates work.
persona_mode: interactive
---

## Identity
A coordinator persona focused on orchestration outcomes.

## Communication Style
- Clear and concise.

## Role Definition
### Responsibilities
- Route work
- Validate outputs
- Coordinate handoffs

### Boundaries
- No direct implementation -> Dev
- No product scope decisions -> PM

## Principles
1. **Clarity first.** Keep instructions concrete.
2. **Safety over speed.** Validate before merge.
3. **Incrementalism wins.** Ship small slices.

## Critical Actions
1. **ALWAYS** read requirements before acting.
2. **NEVER** skip validation checks.

## Task Protocol
### Accepts
- Story request

### Produces
- Validation report

### Completion Criteria
- Output is complete.
- Output is actionable.

## Activation Sequence
1. Start
2. Inspect
3. Plan
4. Execute
5. Validate
6. Summarize
7. Finish

## Menu
1. [MH] Main help
2. [CH] Continue handoff
3. [DA] Done and archive

## Rules
- Keep updates concise.
`;

describe("validatePersonaContent", () => {
  it("passes valid content", () => {
    const result = validatePersonaContent(validContent);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("enforces identity and critical action rules", () => {
    const missingIdentity = validContent.replace(
      "## Identity\nA coordinator persona focused on orchestration outcomes.\n\n",
      "## Identity\n\n"
    );
    const badActions = validContent.replace("1. **ALWAYS** read requirements before acting.", "1. Read requirements");

    expect(validatePersonaContent(missingIdentity).errors.some((x) => x.ruleId === "SC-01")).toBe(true);
    expect(validatePersonaContent(badActions).errors.some((x) => x.ruleId === "SC-08")).toBe(true);
  });

  it("warns on communication style and role definition quality issues", () => {
    const comm = validContent.replace("## Communication Style\n- Clear and concise.\n\n", "## Communication Style\n\n");
    const role = validContent
      .replace("### Responsibilities\n- Route work\n- Validate outputs\n- Coordinate handoffs\n\n", "")
      .replace("### Boundaries\n- No direct implementation -> Dev\n- No product scope decisions -> PM\n\n", "");

    expect(validatePersonaContent(comm).warnings.some((x) => x.ruleId === "SC-02")).toBe(true);
    expect(validatePersonaContent(role).warnings.some((x) => x.ruleId === "SC-03")).toBe(true);
  });

  it("enforces task protocol subsection and bullet constraints", () => {
    const missingSubsections = validContent.replace("### Produces\n- Validation report\n\n", "");
    const badCompletion = validContent.replace(
      "### Completion Criteria\n- Output is complete.\n- Output is actionable.\n\n",
      "### Completion Criteria\n- Output is complete.\n\n"
    );

    expect(validatePersonaContent(missingSubsections).errors.some((x) => x.ruleId === "SC-09")).toBe(true);
    expect(validatePersonaContent(badCompletion).errors.some((x) => x.ruleId === "SC-12")).toBe(true);
  });

  it("enforces menu structural rules", () => {
    const noCodes = validContent.replace(
      "1. [MH] Main help\n2. [CH] Continue handoff\n3. [DA] Done and archive\n",
      "1. Main help\n2. Continue handoff\n3. Done and archive\n"
    );
    const wrongOrder = validContent.replace(
      "1. [MH] Main help\n2. [CH] Continue handoff\n3. [DA] Done and archive\n",
      "1. [CH] Continue handoff\n2. [MH] Main help\n3. [DA] Done and archive\n"
    );

    expect(validatePersonaContent(noCodes).errors.some((x) => x.ruleId === "SC-14")).toBe(true);
    expect(validatePersonaContent(wrongOrder).errors.some((x) => x.ruleId === "SC-15")).toBe(true);
  });

  it("warns on activation sequence and rules soft limits", () => {
    const shortActivation = validContent.replace(
      "## Activation Sequence\n1. Start\n2. Inspect\n3. Plan\n4. Execute\n5. Validate\n6. Summarize\n7. Finish\n\n",
      "## Activation Sequence\n1. Start\n2. Finish\n\n"
    );
    const longRules = validContent.replace(
      "## Rules\n- Keep updates concise.\n",
      `## Rules\n${Array.from({ length: 11 })
        .map((_, index) => `- Rule ${index + 1}`)
        .join("\n")}\n`
    );

    expect(validatePersonaContent(shortActivation).warnings.some((x) => x.ruleId === "SC-17")).toBe(true);
    expect(validatePersonaContent(longRules).warnings.some((x) => x.ruleId === "SC-18")).toBe(true);
  });

  it("detects prohibited patterns", () => {
    const xml = `${validContent}\n<agent>bad</agent>\n`;
    const todo = `${validContent}\nTODO: remove\n`;
    const path = `${validContent}\nPath: /Users/example/repo\n`;
    const prompt = `${validContent}\nUse \`> run\`\n`;
    const angleBrackets = `${validContent}\nUse file \`return-<NN>-coda.md\`\n`;

    expect(validatePersonaContent(xml).errors.some((x) => x.ruleId === "PP-01")).toBe(true);
    expect(validatePersonaContent(todo).warnings.some((x) => x.ruleId === "PP-02")).toBe(true);
    expect(validatePersonaContent(path).errors.some((x) => x.ruleId === "PP-03")).toBe(true);
    expect(validatePersonaContent(prompt).warnings.some((x) => x.ruleId === "PP-04")).toBe(true);
    expect(validatePersonaContent(angleBrackets).warnings.some((x) => x.ruleId === "PP-04")).toBe(false);
  });
});
