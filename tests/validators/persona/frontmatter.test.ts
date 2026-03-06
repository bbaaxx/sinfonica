import { describe, expect, it } from "vitest";

import { validatePersonaFrontmatter } from "../../../src/validators/persona/frontmatter.js";

const validPersona = `---
persona_id: maestro
name: Maestro
role: Orchestrator
description: Coordinates the SDLC workflow.
persona_mode: interactive
version: 1.2.3
icon: 🎯
capabilities:
  - routing
  - orchestration
author: Sinfonica Team
license: MIT
---

## Identity

Persona body.
`;

describe("validatePersonaFrontmatter", () => {
  it("passes with valid frontmatter", () => {
    const result = validatePersonaFrontmatter("agents/maestro.md", validPersona);

    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.frontmatter?.persona_id).toBe("maestro");
  });

  it("errors when frontmatter is missing", () => {
    const result = validatePersonaFrontmatter("agents/maestro.md", "## Identity\n");
    expect(result.errors.some((item) => item.ruleId === "FM-01")).toBe(true);
  });

  it("errors when frontmatter is malformed", () => {
    const malformed = "---\npersona_id maestro\n---\n";
    const result = validatePersonaFrontmatter("agents/maestro.md", malformed);
    expect(result.errors.some((item) => item.ruleId === "FM-11")).toBe(true);
  });

  it("errors when persona_id is missing or invalid", () => {
    const missing = validPersona.replace("persona_id: maestro\n", "");
    const invalid = validPersona.replace("persona_id: maestro", "persona_id: Maestro");
    const mismatch = validPersona.replace("persona_id: maestro", "persona_id: libretto");

    expect(validatePersonaFrontmatter("agents/maestro.md", missing).errors.some((x) => x.ruleId === "FM-02")).toBe(true);
    expect(validatePersonaFrontmatter("agents/maestro.md", invalid).errors.some((x) => x.ruleId === "FM-02")).toBe(true);
    expect(validatePersonaFrontmatter("agents/maestro.md", mismatch).errors.some((x) => x.ruleId === "FM-02")).toBe(true);
  });

  it("errors when required text fields are empty", () => {
    const emptyName = validPersona.replace("name: Maestro", "name: ");
    const emptyRole = validPersona.replace("role: Orchestrator", "role: ");
    const emptyDescription = validPersona.replace("description: Coordinates the SDLC workflow.", "description: ");

    expect(validatePersonaFrontmatter("agents/maestro.md", emptyName).errors.some((x) => x.ruleId === "FM-03")).toBe(true);
    expect(validatePersonaFrontmatter("agents/maestro.md", emptyRole).errors.some((x) => x.ruleId === "FM-04")).toBe(true);
    expect(validatePersonaFrontmatter("agents/maestro.md", emptyDescription).errors.some((x) => x.ruleId === "FM-05")).toBe(true);
  });

  it("warns on invalid persona_mode", () => {
    const invalid = validPersona.replace("persona_mode: interactive", "persona_mode: primary");
    const result = validatePersonaFrontmatter("agents/maestro.md", invalid);
    expect(result.warnings.some((item) => item.ruleId === "FM-06")).toBe(true);
  });

  it("warns on invalid semver", () => {
    const invalid = validPersona.replace("version: 1.2.3", "version: v1");
    const result = validatePersonaFrontmatter("agents/maestro.md", invalid);
    expect(result.warnings.some((item) => item.ruleId === "FM-07")).toBe(true);
  });

  it("warns on non-emoji icon", () => {
    const invalid = validPersona.replace("icon: 🎯", "icon: target");
    const result = validatePersonaFrontmatter("agents/maestro.md", invalid);
    expect(result.warnings.some((item) => item.ruleId === "FM-08")).toBe(true);
  });

  it("accepts single emoji grapheme icons with variation selector", () => {
    const withVariationSelector = validPersona.replace("icon: 🎯", "icon: 🛠️");
    const result = validatePersonaFrontmatter("agents/maestro.md", withVariationSelector);
    expect(result.warnings.some((item) => item.ruleId === "FM-08")).toBe(false);
  });

  it("warns on capabilities shape violations", () => {
    const tooMany = `---\npersona_id: maestro\nname: Maestro\nrole: Orchestrator\ndescription: d\ncapabilities:\n${Array.from({ length: 11 })
      .map((_, i) => `  - c${i}`)
      .join("\n")}\n---\n`;
    const badItem = validPersona.replace("  - routing", `  - ${"a".repeat(51)}`);

    expect(validatePersonaFrontmatter("agents/maestro.md", tooMany).warnings.some((x) => x.ruleId === "FM-09")).toBe(true);
    expect(validatePersonaFrontmatter("agents/maestro.md", badItem).warnings.some((x) => x.ruleId === "FM-09")).toBe(true);
  });

  it("warns on invalid author or license", () => {
    const badAuthor = validPersona.replace("author: Sinfonica Team", `author: ${"a".repeat(101)}`);
    const badLicense = validPersona.replace("license: MIT", "license: !!!");

    expect(validatePersonaFrontmatter("agents/maestro.md", badAuthor).warnings.some((x) => x.ruleId === "FM-10")).toBe(true);
    expect(validatePersonaFrontmatter("agents/maestro.md", badLicense).warnings.some((x) => x.ruleId === "FM-11")).toBe(true);
  });
});
