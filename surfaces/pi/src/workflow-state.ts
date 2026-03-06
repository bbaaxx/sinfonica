import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { loadPhaseToolMap, type PhaseToolMap, type PhaseToolMapSource } from "./orchestration/phase-tools.ts";

export type WorkflowState = {
  currentStep: number;
  totalSteps: number;
  status: string;
  persona?: string | null;
  stepSlugs: string[];
  phaseToolMap?: PhaseToolMap;
  phaseToolMapSource?: PhaseToolMapSource;
  phaseToolMapWarnings?: string[];
};

type ReadWorkflowStateOptions = {
  workflowId?: string;
  includePhaseToolMap?: boolean;
};

type StageEntry = {
  step: number;
  status: string;
  slug: string;
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

    const stageMatch = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (stageMatch) {
      const rawTitle = stageMatch[2].trim();
      // Extract slug from title like "1. Architect Review (Amadeus)" -> "architect-review"
      // or "1-gather-context" format from Steps table
      const slug = rawTitle
        .toLowerCase()
        .replace(/\s*\([^)]*\)\s*/g, "") // Remove parenthetical parts like "(Amadeus)"
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dashes
        .replace(/^-+|-+$/g, "") // Trim leading/trailing dashes
        .slice(0, 40); // Limit length
      current = { step: Number.parseInt(stageMatch[1], 10), status: "", slug: slug || `step-${stageMatch[1]}` };
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

export const readWorkflowState = async (
  cwd: string,
  sessionId: string,
  options?: ReadWorkflowStateOptions
): Promise<WorkflowState> => {
  const workflowPath = join(cwd, ".sinfonica", "handoffs", sessionId, "workflow.md");
  const raw = await readFile(workflowPath, "utf8");
  const frontmatter = parseFrontmatter(raw);

  // Parse stages to extract slugs
  const stages = parseStages(raw);
  const stepSlugs = stages.map((stage) => stage.slug);

  const fmStatus = frontmatter.workflow_status?.trim().toLowerCase();
  const fmCurrentStep = Number.parseInt(frontmatter.current_step_index ?? "", 10);
  const fmTotalSteps = Number.parseInt(frontmatter.total_steps ?? "", 10);
  if (fmStatus && Number.isFinite(fmCurrentStep) && Number.isFinite(fmTotalSteps) && fmCurrentStep > 0 && fmTotalSteps > 0) {
    const state: WorkflowState = {
      currentStep: Math.min(fmCurrentStep, fmTotalSteps),
      totalSteps: fmTotalSteps,
      status: fmStatus,
      persona: typeof frontmatter.persona === "string" ? frontmatter.persona.trim() : null,
      stepSlugs,
    };

    if (options?.includePhaseToolMap && options.workflowId) {
      try {
        const phaseMapResult = await loadPhaseToolMap(cwd, options.workflowId);
        state.phaseToolMap = phaseMapResult.map;
        state.phaseToolMapSource = phaseMapResult.source;
        state.phaseToolMapWarnings = phaseMapResult.warnings;
      } catch {
        // Keep workflow state reads resilient.
      }
    }

    return state;
  }

  const statusMatch = raw.match(/-\s*Overall Status:\s*(.+)$/im);
  const status = statusMatch ? statusMatch[1].trim().toLowerCase() : "unknown";

  const totalSteps = stages.length;

  const firstActive = stages.find((stage) => stage.status.length > 0 && (isActive(stage.status) || !isTerminal(stage.status)));
  const fallbackStep = stages.length > 0 ? stages[stages.length - 1].step : 0;
  const currentStepFromLine = currentStepFromCurrentStageLine(raw);
  const rawStep = firstActive?.step ?? (currentStepFromLine > 0 ? currentStepFromLine : fallbackStep);
  const currentStep = totalSteps > 0 ? Math.min(rawStep, totalSteps) : rawStep;

  const state: WorkflowState = {
    currentStep,
    totalSteps,
    status,
    stepSlugs,
  };

  if (options?.includePhaseToolMap && options.workflowId) {
    try {
      const phaseMapResult = await loadPhaseToolMap(cwd, options.workflowId);
      state.phaseToolMap = phaseMapResult.map;
      state.phaseToolMapSource = phaseMapResult.source;
      state.phaseToolMapWarnings = phaseMapResult.warnings;
    } catch {
      // Keep workflow state reads resilient.
    }
  }

  return state;
};
