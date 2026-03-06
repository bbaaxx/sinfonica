import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { initProject } from "../../src/cli/init.js";

const PI_SKILLS = ["create-prd", "create-spec", "dev-story", "code-review"] as const;

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonica-init-pi-test-"));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0, tempDirs.length).map(async (dir) => {
      await rm(dir, { recursive: true, force: true });
    })
  );
});

describe("initProject Pi surface generation", () => {
  it("generates .pi package and workflow skill stubs on first run", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd);

    const packagePath = join(cwd, ".pi/package.json");
    const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as {
      name?: string;
      pi?: { skills?: string[] };
    };
    expect(packageJson.name).toBe("sinfonica-pi-workflows");
    expect(packageJson.pi?.skills).toEqual(["./skills"]);

    for (const workflow of PI_SKILLS) {
      const skillPath = join(cwd, ".pi/skills", workflow, "SKILL.md");
      const skill = await readFile(skillPath, "utf8");
      expect(skill).toContain(`name: ${workflow}`);
      expect(skill).toContain("sinfonica_start_workflow");
      expect(skill).toContain(`workflowType: ${workflow}`);
    }
  });

  it("preserves existing Pi package and skills without --force", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd);

    const packagePath = join(cwd, ".pi/package.json");
    const skillPath = join(cwd, ".pi/skills/create-prd/SKILL.md");

    await writeFile(packagePath, "{\n  \"custom\": true\n}\n", "utf8");
    await writeFile(skillPath, "custom-pi-skill\n", "utf8");

    await initProject(cwd);

    await expect(readFile(packagePath, "utf8")).resolves.toBe("{\n  \"custom\": true\n}\n");
    await expect(readFile(skillPath, "utf8")).resolves.toBe("custom-pi-skill\n");
  });

  it("overwrites existing Pi package and skills with --force", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd);

    const packagePath = join(cwd, ".pi/package.json");
    const skillPath = join(cwd, ".pi/skills/create-prd/SKILL.md");

    await writeFile(packagePath, "{\n  \"custom\": true\n}\n", "utf8");
    await writeFile(skillPath, "custom-pi-skill\n", "utf8");

    await initProject(cwd, { force: true });

    const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as {
      name?: string;
      pi?: { skills?: string[] };
    };
    expect(packageJson.name).toBe("sinfonica-pi-workflows");
    expect(packageJson.pi?.skills).toEqual(["./skills"]);

    const skill = await readFile(skillPath, "utf8");
    expect(skill).not.toBe("custom-pi-skill\n");
    expect(skill).toContain("name: create-prd");
    expect(skill).toContain("sinfonica_start_workflow");
    expect(skill).toContain("workflowType: create-prd");
  });
});
