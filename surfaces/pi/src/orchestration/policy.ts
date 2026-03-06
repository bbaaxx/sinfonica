import { type WorkflowPhase, resolvePhaseFromStep, isToolAllowedInPhase } from "./phase-tools.ts";
import { validateStepEvidence, type StepEvidence } from "./evidence.ts";

export type WorkflowStateSnapshot = {
  sessionId: string;
  workflowId: string;
  currentStep: number;
  totalSteps: number;
  currentStepSlug: string;
  status: string;
};

export type PolicyDecision = {
  allowed: boolean;
  reason?: string;
  requiredEvidence?: string[];
};

export const resolveCurrentPhase = (state: WorkflowStateSnapshot): WorkflowPhase => {
  return resolvePhaseFromStep(
    state.currentStepSlug,
    state.currentStep,
    state.totalSteps
  );
};

export const evaluateToolCall = (
  toolName: string,
  input: unknown,
  currentPhase: WorkflowPhase,
  workflowState: WorkflowStateSnapshot
): PolicyDecision => {
  // sinfonica tools are always allowed (they have their own gating)
  if (toolName.startsWith("sinfonica_")) {
    return { allowed: true };
  }

  if (!isToolAllowedInPhase(toolName, currentPhase)) {
    return {
      allowed: false,
      reason: `Tool "${toolName}" is not allowed during ${currentPhase} phase (step ${workflowState.currentStep}/${workflowState.totalSteps}: ${workflowState.currentStepSlug}). Complete the current step before using this tool.`,
    };
  }

  return { allowed: true };
};

export const evaluateAdvanceRequest = (
  evidence: Partial<StepEvidence> | null | undefined,
  workflowState: WorkflowStateSnapshot
): PolicyDecision => {
  if (!evidence) {
    return {
      allowed: false,
      reason: `Cannot advance: no execution evidence for step ${workflowState.currentStep} (${workflowState.currentStepSlug}). Complete the step first.`,
      requiredEvidence: ["executed", "stepId"],
    };
  }

  const validation = validateStepEvidence(evidence);
  if (!validation.valid) {
    return {
      allowed: false,
      reason: `Cannot advance: missing evidence fields [${validation.missing.join(", ")}] for step ${workflowState.currentStep} (${workflowState.currentStepSlug}).`,
      requiredEvidence: validation.missing,
    };
  }

  return { allowed: true };
};

export { type WorkflowPhase } from "./phase-tools.ts";
