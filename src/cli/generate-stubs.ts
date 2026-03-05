import { constants } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  WORKFLOW_STUBS,
  toCommandStub,
  toSkill,
  type WorkflowStub
} from "../../surfaces/opencode/src/workflow-stubs.js";

export { WORKFLOW_STUBS, type WorkflowStub };

const ensureParentDirectory = async (path: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
};

const writeIfMissing = async (path: string, content: string): Promise<void> => {
  try {
    await access(path, constants.F_OK);
  } catch {
    await ensureParentDirectory(path);
    await writeFile(path, content, "utf8");
  }
};

export const generateWorkflowStubs = async (cwd: string, force = false): Promise<void> => {
  for (const workflow of WORKFLOW_STUBS) {
    // Commands are always regenerated (no user customization expected)
    const commandPath = join(cwd, ".opencode/command", `${workflow.commandName}.md`);
    await ensureParentDirectory(commandPath);
    await writeFile(commandPath, toCommandStub(workflow), "utf8");

    const skillPath = join(cwd, ".opencode/skills", workflow.skillName, "SKILL.md");
    if (force) {
      // Force: overwrite skills even if they exist
      await ensureParentDirectory(skillPath);
      await writeFile(skillPath, toSkill(workflow), "utf8");
    } else {
      // Normal: skip skills that already exist (preserve user customizations)
      await writeIfMissing(skillPath, toSkill(workflow));
    }
  }
};
