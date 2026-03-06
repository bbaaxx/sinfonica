export type WorkflowPhase = "planning" | "implementation" | "review" | "approval";

export type PhaseToolMap = Record<WorkflowPhase, {
  allowed: string[];
  blocked: string[];
}>;

export const DEFAULT_PHASE_TOOL_MAP: PhaseToolMap = {
  planning: {
    allowed: ["Read", "Glob", "Grep", "WebFetch", "sinfonica_*"],
    blocked: ["Write", "Edit", "Bash"],
  },
  implementation: {
    allowed: ["*"],
    blocked: [],
  },
  review: {
    allowed: ["Read", "Glob", "Grep", "Bash", "sinfonica_*"],
    blocked: ["Write", "Edit"],
  },
  approval: {
    allowed: ["Read", "Glob", "sinfonica_advance_step", "sinfonica_list_workflows"],
    blocked: ["Write", "Edit", "Bash"],
  },
};

const PLANNING_SLUGS = ["gather-context", "analyze-prd", "analyze-story", "analyze"];
const REVIEW_SLUGS = ["validate-prd", "validate-spec", "review-code", "review-tests", "assess", "verify"];
const APPROVAL_SLUGS = ["approval", "approve"];
const IMPLEMENTATION_SLUGS = ["draft-prd", "draft-spec", "write-tests", "implement"];

export const resolvePhaseFromStep = (
  stepSlug: string,
  stepIndex: number,
  totalSteps: number
): WorkflowPhase => {
  const normalized = stepSlug.toLowerCase().replace(/^\d+-/, "");

  if (APPROVAL_SLUGS.some((slug) => normalized.includes(slug))) {
    return "approval";
  }
  if (REVIEW_SLUGS.some((slug) => normalized.includes(slug))) {
    return "review";
  }
  if (IMPLEMENTATION_SLUGS.some((slug) => normalized.includes(slug))) {
    return "implementation";
  }
  if (PLANNING_SLUGS.some((slug) => normalized.includes(slug))) {
    return "planning";
  }

  // Heuristic: early steps are planning, last step is approval, middle is implementation
  if (stepIndex <= 1) {
    return "planning";
  }
  if (stepIndex >= totalSteps) {
    return "approval";
  }
  return "implementation";
};

const matchesToolPattern = (toolName: string, pattern: string): boolean => {
  if (pattern === "*") {
    return true;
  }
  if (pattern.endsWith("*")) {
    return toolName.startsWith(pattern.slice(0, -1));
  }
  return toolName.toLowerCase() === pattern.toLowerCase();
};

export const isToolAllowedInPhase = (
  toolName: string,
  phase: WorkflowPhase,
  phaseToolMap: PhaseToolMap = DEFAULT_PHASE_TOOL_MAP
): boolean => {
  const config = phaseToolMap[phase];

  // Explicitly blocked takes priority
  if (config.blocked.some((pattern) => matchesToolPattern(toolName, pattern))) {
    return false;
  }

  // Check if explicitly allowed
  return config.allowed.some((pattern) => matchesToolPattern(toolName, pattern));
};

export const computeAllowedTools = (
  currentPhase: WorkflowPhase,
  allTools: Array<{ name: string }>,
  phaseToolMap: PhaseToolMap = DEFAULT_PHASE_TOOL_MAP
): string[] => {
  return allTools
    .map((tool) => tool.name)
    .filter((name) => isToolAllowedInPhase(name, currentPhase, phaseToolMap));
};
