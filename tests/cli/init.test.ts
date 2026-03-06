import { access, chmod, mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

import { afterEach, describe, expect, it } from "vitest";

import { FRAMEWORK_PERSONAS, initProject, runInitCommand } from "../../src/cli/init.js";
import { WORKFLOW_STUBS } from "../../src/cli/generate-stubs.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version?: string };
const FRAMEWORK_VERSION = pkg.version ?? "0.0.0";

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const tempDirs: string[] = [];

const makeTempDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "sinfonica-init-test-"));
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

describe("initProject", () => {
  it("creates directory structure, personas, stubs, plugin, and config", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd);

    await expect(stat(join(cwd, ".sinfonica/agents"))).resolves.toBeDefined();
    await expect(stat(join(cwd, ".sinfonica/handoffs"))).resolves.toBeDefined();
    await expect(stat(join(cwd, ".sinfonica/memory"))).resolves.toBeDefined();
    await expect(stat(join(cwd, ".sinfonica/workflows"))).resolves.toBeDefined();

    await expect(readFile(join(cwd, ".sinfonica/config.yaml"), "utf8")).resolves.toContain("version:");
    await expect(readFile(join(cwd, ".sinfonica/workflows/create-prd/workflow.md"), "utf8")).resolves.toContain("create-prd");

    for (const persona of FRAMEWORK_PERSONAS) {
      await expect(readFile(join(cwd, ".sinfonica/agents", `${persona.id}.md`), "utf8")).resolves.toContain(
        `persona_id: ${persona.id}`
      );
      await expect(readFile(join(cwd, ".opencode/agent", `sinfonica-${persona.id}.md`), "utf8")).resolves.toContain(
        `name: sinfonica-${persona.id}`
      );
    }

    const pluginContent = await readFile(join(cwd, ".opencode/plugins/sinfonica-enforcement.ts"), "utf8");
    expect(pluginContent).toContain("import type { Plugin }");
    expect(pluginContent).toContain("SinfonicaEnforcement");
    expect(pluginContent).toContain("tool.execute.before");
    expect(pluginContent).toContain("createTddEnforcerHandler");
    await expect(readFile(join(cwd, ".opencode/opencode.json"), "utf8")).resolves.toContain("sinfonica");
  });

  it("is idempotent and preserves customized files", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd);
    await writeFile(join(cwd, ".sinfonica/config.yaml"), "custom: true\n", "utf8");
    await writeFile(join(cwd, ".opencode/agent/sinfonica-maestro.md"), "custom-stub\n", "utf8");

    await initProject(cwd);

    await expect(readFile(join(cwd, ".sinfonica/config.yaml"), "utf8")).resolves.toBe("custom: true\n");
    await expect(readFile(join(cwd, ".opencode/agent/sinfonica-maestro.md"), "utf8")).resolves.not.toBe(
      "custom-stub\n"
    );
  });

  it("fails when .sinfonica exists as a file", async () => {
    const cwd = await makeTempDir();
    await writeFile(join(cwd, ".sinfonica"), "not-a-directory", "utf8");

    await expect(initProject(cwd)).rejects.toThrow(".sinfonica exists as a file");
  });

  it("fails with permission error when project root is not writable", async () => {
    if (process.platform === "win32") {
      return;
    }

    const cwd = await makeTempDir();
    const locked = join(cwd, "locked");
    await mkdir(locked);
    await chmod(locked, 0o500);

    try {
      await expect(initProject(locked)).rejects.toThrow(/permission|EACCES|EPERM/i);
    } finally {
      await chmod(locked, 0o700);
    }
  });

  it("resumes existing init in --yes mode without overwriting config", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd);
    await writeFile(join(cwd, ".sinfonica/config.yaml"), "custom: true\n", "utf8");

    await runInitCommand({ cwd, yes: true });

    await expect(readFile(join(cwd, ".sinfonica/config.yaml"), "utf8")).resolves.toBe("custom: true\n");
  });

  it("supports re-init flow and overwrites config when selected", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd);

    const answers = ["re-init", "My App", "Dana", "expert"];
    await runInitCommand({
      cwd,
      prompt: async () => answers.shift() ?? ""
    });

    const config = await readFile(join(cwd, ".sinfonica/config.yaml"), "utf8");
    expect(config).toContain('project_name: "My App"');
    expect(config).toContain('user_name: "Dana"');
    expect(config).toContain("skill_level: expert");
    expect(config).toContain("enforcement_strictness: low");
  });

  it("stamps sinfonica_version in config on init", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd);

    const config = await readFile(join(cwd, ".sinfonica/config.yaml"), "utf8");
    expect(config).toContain(`sinfonica_version: "${FRAMEWORK_VERSION}"`);
  });

  it("updates sinfonica_version on re-init without overwriting other config values", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd, {
      config: { projectName: "My App", userName: "Dana", skillLevel: "expert", enforcementStrictness: "low" }
    });

    // Simulate a previous install by replacing the version stamp
    const configPath = join(cwd, ".sinfonica/config.yaml");
    let content = await readFile(configPath, "utf8");
    content = content.replace(/^sinfonica_version:.*$/m, 'sinfonica_version: "old"');
    await writeFile(configPath, content, "utf8");

    // Re-init without overwriting config
    await initProject(cwd);

    const updated = await readFile(configPath, "utf8");
    expect(updated).toContain(`sinfonica_version: "${FRAMEWORK_VERSION}"`);
    expect(updated).toContain('project_name: "My App"');
    expect(updated).toContain('user_name: "Dana"');
    expect(updated).toContain("skill_level: expert");
  });
});

describe("initProject --force", () => {
  it("overwrites skills that normally skip", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd);

    const workflow = WORKFLOW_STUBS[0];
    const skillPath = join(cwd, ".opencode/skills", workflow.skillName, "SKILL.md");
    await writeFile(skillPath, "custom-skill\n", "utf8");

    // Normal re-init: should NOT overwrite
    await initProject(cwd);
    await expect(readFile(skillPath, "utf8")).resolves.toBe("custom-skill\n");

    // Force re-init: should overwrite
    await initProject(cwd, { force: true });
    const refreshed = await readFile(skillPath, "utf8");
    expect(refreshed).not.toBe("custom-skill\n");
    expect(refreshed).toContain(`# ${workflow.skillName}`);
  });

  it("overwrites enforcement plugin with --force", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd);

    const pluginPath = join(cwd, ".opencode/plugins/sinfonica-enforcement.ts");
    await writeFile(pluginPath, "custom-plugin\n", "utf8");

    await initProject(cwd, { force: true });

    const content = await readFile(pluginPath, "utf8");
    expect(content).not.toBe("custom-plugin\n");
    expect(content).toContain("import type { Plugin }");
    expect(content).toContain("SinfonicaEnforcement");
    expect(content).toContain("tool.execute.before");
    expect(content).toContain("createTddEnforcerHandler");
  });

  it("overwrites .sinfonica/agents/ personas with --force", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd);

    const personaPath = join(cwd, ".sinfonica/agents/maestro.md");
    await writeFile(personaPath, "custom-persona\n", "utf8");

    await initProject(cwd, { force: true });

    const content = await readFile(personaPath, "utf8");
    expect(content).not.toBe("custom-persona\n");
    expect(content).toContain("persona_id: maestro");
  });

  it("ignores customized: true on agent files with --force", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd);

    const agentPath = join(cwd, ".opencode/agent/sinfonica-maestro.md");
    const customContent = `---\nname: sinfonica-maestro\ncustomized: true\n---\n\ncustom-body\n`;
    await writeFile(agentPath, customContent, "utf8");

    await initProject(cwd, { force: true });

    const content = await readFile(agentPath, "utf8");
    expect(content).not.toContain("custom-body");
    expect(content).toContain("customized: false");
  });

  it("does NOT overwrite config.yaml user preferences with --force", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd, {
      config: { projectName: "My App", userName: "Alex", skillLevel: "expert", enforcementStrictness: "high" }
    });

    await initProject(cwd, { force: true });

    const config = await readFile(join(cwd, ".sinfonica/config.yaml"), "utf8");
    expect(config).toContain('project_name: "My App"');
    expect(config).toContain('user_name: "Alex"');
    expect(config).toContain("skill_level: expert");
    expect(config).toContain("enforcement_strictness: high");
  });

  it("works non-interactively with -y --force", async () => {
    const cwd = await makeTempDir();

    await initProject(cwd);

    const workflow = WORKFLOW_STUBS[0];
    const skillPath = join(cwd, ".opencode/skills", workflow.skillName, "SKILL.md");
    await writeFile(skillPath, "custom-skill\n", "utf8");

    await runInitCommand({ cwd, yes: true, force: true });

    const refreshed = await readFile(skillPath, "utf8");
    expect(refreshed).not.toBe("custom-skill\n");
    expect(refreshed).toContain(`# ${workflow.skillName}`);
  });
});
