import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type WorkflowState = {
  currentStep: number;
  totalSteps: number;
  status: string;
  persona?: string | null;
};

type StageEntry = {
  step: number;
  status: string;
};

const ACTIVE_STATUS_TOKENS = ["in-progress", "pending", "blocked", "active"];
const TERMINAL_STATUS_TOKENS = ["approved", "completed", "done", "queued", "skipped"];

const parseFrontmatter = (raw: string): Record<string, string> => {
  if (!raw.startsWith("---\n")) {
    return {};
  }
  const closing = raw.indexOf("\n---", 4);
  if (closing === -1) {
    return {};
  }

  const result: Record<string, string> = {};
  const lines = raw.slice(4, closing).split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([a-z_][a-z0-9_\-]*):\s*(.*)$/i);
    if (!match) continue;
    result[match[1].trim()] = match[2].trim();
  }
  return result;
};

const parseStages = (raw: string): StageEntry[] => {
  const lines = raw.split(/\r?\n/);
  const stages: StageEntry[] = [];
  let current: StageEntry | null = null;
  let inStagesSection = false;

  for (const line of lines) {
    if (/^##\s+Stages\s*$/i.test(line.trim())) {
      inStagesSection = true;
      continue;
    }

    if (inStagesSection && /^##\s+/.test(line.trim())) {
      break;
    }

    if (!inStagesSection) {
      continue;
    }

    const stageMatch = line.match(/^\s*(\d+)\.\s+/);
    if (stageMatch) {
      current = { step: Number.parseInt(stageMatch[1], 10), status: "" };
      stages.push(current);
      continue;
    }

    const statusMatch = line.match(/^\s*-\s*Status:\s*(.+)$/i);
    if (statusMatch && current) {
      current.status = statusMatch[1].trim().toLowerCase();
    }
  }

  return stages;
};

const isTerminal = (status: string): boolean => TERMINAL_STATUS_TOKENS.some((token) => status.includes(token));

const isActive = (status: string): boolean => ACTIVE_STATUS_TOKENS.some((token) => status.includes(token));

const currentStepFromCurrentStageLine = (raw: string): number => {
  const match = raw.match(/-\s*Current Stage:\s*(.+)$/im);
  if (!match) {
    return 0;
  }

  const phaseMatches = [...match[1].matchAll(/Phase\s+(\d+)/gi)].map((item) => Number.parseInt(item[1], 10));
  if (phaseMatches.length === 0) {
    return 0;
  }
  return phaseMatches[phaseMatches.length - 1];
};

export const readWorkflowState = async (cwd: string, sessionId: string): Promise<WorkflowState> => {
  const workflowPath = join(cwd, ".sinfonica", "handoffs", sessionId, "workflow.md");
  const raw = await readFile(workflowPath, "utf8");
  const frontmatter = parseFrontmatter(raw);

  const fmStatus = frontmatter.workflow_status?.trim().toLowerCase();
  const fmCurrentStep = Number.parseInt(frontmatter.current_step_index ?? "", 10);
  const fmTotalSteps = Number.parseInt(frontmatter.total_steps ?? "", 10);
  if (fmStatus && Number.isFinite(fmCurrentStep) && Number.isFinite(fmTotalSteps) && fmCurrentStep > 0 && fmTotalSteps > 0) {
    return {
      currentStep: Math.min(fmCurrentStep, fmTotalSteps),
      totalSteps: fmTotalSteps,
      status: fmStatus,
      persona: typeof frontmatter.persona === "string" ? frontmatter.persona.trim() : null,
    };
  }

  const statusMatch = raw.match(/-\s*Overall Status:\s*(.+)$/im);
  const status = statusMatch ? statusMatch[1].trim().toLowerCase() : "unknown";

  const stages = parseStages(raw);
  const totalSteps = stages.length;

  const firstActive = stages.find((stage) => stage.status.length > 0 && (isActive(stage.status) || !isTerminal(stage.status)));
  const fallbackStep = stages.length > 0 ? stages[stages.length - 1].step : 0;
  const currentStepFromLine = currentStepFromCurrentStageLine(raw);
  const rawStep = firstActive?.step ?? (currentStepFromLine > 0 ? currentStepFromLine : fallbackStep);
  const currentStep = totalSteps > 0 ? Math.min(rawStep, totalSteps) : rawStep;

  return {
    currentStep,
    totalSteps,
    status,
  };
};
