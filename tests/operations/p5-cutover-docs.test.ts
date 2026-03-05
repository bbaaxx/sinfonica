import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const readUtf8 = async (relativePath: string): Promise<string> =>
  readFile(join(repoRoot, relativePath), "utf8");

describe("p5 cutover documentation", () => {
  it("publishes support matrix and onboarding guide artifacts", async () => {
    const supportMatrix = await readUtf8("docs/operations/p5-support-matrix.md");
    const onboardingGuide = await readUtf8("docs/operations/p5-new-adapter-onboarding.md");

    expect(supportMatrix).toContain("# P5 Support Matrix");
    expect(supportMatrix).toContain("surfaces/pi");
    expect(supportMatrix).toContain("surfaces/opencode");
    expect(supportMatrix).toContain("Maintainer");
    expect(supportMatrix).toContain("Support Status");

    expect(onboardingGuide).toContain("# P5 New Adapter Onboarding Guide");
    expect(onboardingGuide).toContain("contract");
    expect(onboardingGuide).toContain("tests");
    expect(onboardingGuide).toContain("release");
    expect(onboardingGuide).toContain("Dry-run checklist");
  });

  it("records legacy audit and cutover checklist closure for C14..C16", async () => {
    const legacyAudit = await readUtf8("docs/operations/p5-legacy-reference-audit.md");
    const cutoverChecklist = await readUtf8("docs/operations/p5-cutover-checklist.md");
    const docsIndex = await readUtf8("docs/index.md");

    expect(legacyAudit).toContain("# P5 Legacy Reference Audit and Deprecation Notes");
    expect(legacyAudit).toContain("C14");
    expect(legacyAudit).toContain("pi-sinfonica-extension/");
    expect(legacyAudit).toContain("approved deprecation references");

    expect(cutoverChecklist).toContain("# P5 Cutover Checklist");
    expect(cutoverChecklist).toContain("C15");
    expect(cutoverChecklist).toContain("C16");
    expect(cutoverChecklist).toContain("Critical blockers");
    expect(cutoverChecklist).toContain("0");

    expect(docsIndex).toContain("operations/p5-support-matrix.md");
    expect(docsIndex).toContain("operations/p5-new-adapter-onboarding.md");
    expect(docsIndex).toContain("operations/p5-legacy-reference-audit.md");
    expect(docsIndex).toContain("operations/p5-cutover-checklist.md");
  });
});
