/**
 * Maestro Pipeline Coordinator
 *
 * Ties all completed phases (workflow engine, handoff, approval, persona delegation)
 * into a single end-to-end orchestration pipeline.
 *
 * Conventions:
 * - All state-tracking calls (WorkflowIndexManager, HandoffWriter, trackDelegation)
 *   are wrapped in try/catch with console.warn — coordinator never throws to caller
 *   on state-tracking failure.
 * - All types imported from ./types.ts — no redefinitions.
 * - All workflow.md writes go through WorkflowIndexManager (atomic).
 */

import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createWorkflowIndex,
  readWorkflowIndex,
  updateWorkflowIndex,
  workflowIndexPath,
  addDecision,
} from './index-manager.js';
import { generateCompactionInjection } from './compaction.js';
import { resumeFromCompaction } from './resume.js';
import { writeHandoffEnvelope, createSessionId } from '../handoff/writer.js';
import { validateHandoffEnvelope } from '../handoff/validator.js';
import { applyApprovalDecision } from '../handoff/approval.js';
import { formatDelegationContext, trackDelegation } from '../persona/delegation.js';
import { emitWorkflowMetric } from './metrics.js';
import type { WorkflowIndex, WorkflowStatus } from './types.js';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Ordered list of workflow names that form the pipeline. */
export type PipelineConfig = string[];

/** Result of initializing a pipeline session. */
export interface PipelineSession {
  sessionId: string;
  workflowPath: string;
  workflowIndex: WorkflowIndex;
}

/** Dispatch result for a single pipeline step. */
export interface DispatchResult {
  sessionId: string;
  stepIndex: number;
  workflowName: string;
  persona: string;
  envelopePath: string;
  delegationContext: string;
  orchestrationCue: string;
}

/** Possible outcomes after processing a return envelope. */
export type ApprovalOutcome = 'advanced' | 'held' | 'revision-sent';

/** Result of processing a return envelope through the approval gate. */
export interface ApprovalResult {
  outcome: ApprovalOutcome;
  nextStepIndex?: number;
  revisionPath?: string;
  workflowIndex: WorkflowIndex;
  orchestrationCue: string;
}

/** Failure types the coordinator can detect. */
export type FailureType = 'partial-return' | 'blocked' | 'missing-envelope';

/** Escalation options presented to developer on failure. */
export type EscalationAction = 'retry' | 'skip' | 'abort';

/** Result of handling a subagent failure. */
export interface ErrorHandlingResult {
  action: EscalationAction;
  envelopePath?: string; // set on retry
  workflowIndex: WorkflowIndex;
  orchestrationCue: string;
}

/** Resume result from a compaction injection or crash recovery. */
export interface ResumeResult {
  sessionId: string;
  currentStepIndex: number;
  workflowIndex: WorkflowIndex;
  orchestrationCue: string;
}

export interface OrchestrationCueInput {
  stageStatus: string;
  blockers?: string[];
  nextAction: string;
  approvalRequired: boolean;
}

/**
 * Presentation-only guardrail for Maestro updates.
 * Keeps required orchestration cues stable without affecting workflow decisions.
 */
export function formatOrchestrationCue(input: OrchestrationCueInput): string {
  const blockers = (input.blockers ?? []).filter((value) => value.trim().length > 0);
  const blockerText = blockers.length > 0 ? blockers.join('; ') : 'None';
  const approval = input.approvalRequired ? 'Yes' : 'No';

  return [
    `Stage Status: ${input.stageStatus}`,
    `Blockers: ${blockerText}`,
    `Next Action: ${input.nextAction}`,
    `Approval Required: ${approval}`,
  ].join('\n');
}

// ─── Routing Table ────────────────────────────────────────────────────────────

/**
 * Maps workflow names to the persona responsible for executing them.
 * Maestro delegates to these personas via dispatch envelopes.
 */
export const WORKFLOW_PERSONA_MAP: Record<string, string> = {
  'create-prd': 'libretto',
  'create-spec': 'amadeus',
  'dev-story': 'coda',
  'code-review': 'rondo',
};

/**
 * Resolve the persona for a given workflow name.
 * Returns null if the workflow is not in the routing table.
 */
export function resolvePersona(workflowName: string): string | null {
  return WORKFLOW_PERSONA_MAP[workflowName] ?? null;
}

// ─── CP1: Pipeline Definition & Initiation ───────────────────────────────────

/**
 * Parse and validate a pipeline config.
 * Returns the list of workflow names, or throws if the config is invalid.
 */
export function parsePipelineConfig(config: PipelineConfig): string[] {
  if (!Array.isArray(config) || config.length === 0) {
    throw new Error('Pipeline config must be a non-empty array of workflow names.');
  }
  for (const name of config) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error(`Invalid workflow name in pipeline config: ${JSON.stringify(name)}`);
    }
  }
  return config.map((n) => n.trim());
}

/**
 * Initialize a new pipeline session.
 *
 * Creates:
 *   <cwd>/.sinfonia/handoffs/<sessionId>/   (session directory)
 *   <cwd>/.sinfonia/handoffs/<sessionId>/workflow.md  (via WorkflowIndexManager)
 *
 * The workflow.md is initialized with all pipeline steps, each mapped to its
 * target persona via the routing table.
 */
export async function initPipeline(
  cwd: string,
  config: PipelineConfig,
  goal: string,
  sessionId?: string,
): Promise<PipelineSession> {
  const workflows = parsePipelineConfig(config);
  const sid = sessionId ?? createSessionId();

  // Create session directory
  const sessionDir = join(cwd, '.sinfonia', 'handoffs', sid);
  await mkdir(sessionDir, { recursive: true });

  // Build step list for workflow index
  const steps = workflows.map((name, i) => {
    const persona = resolvePersona(name) ?? 'maestro';
    return { step: `${i + 1}-${name}`, persona };
  });

  // Initialize workflow.md via WorkflowIndexManager (atomic)
  const workflowPath = workflowIndexPath(cwd, sid);
  let workflowIndex: WorkflowIndex;
  try {
    workflowIndex = await createWorkflowIndex({
      cwd,
      sessionId: sid,
      workflowId: `pipeline-${workflows.join('-')}`,
      goal,
      steps,
    });
  } catch (err) {
    console.warn('[coordinator] Failed to create workflow index:', err);
    throw err; // initPipeline failure is fatal — re-throw
  }

  return { sessionId: sid, workflowPath, workflowIndex };
}

// ─── CP2: Sequential Dispatch Routing ────────────────────────────────────────

/**
 * Dispatch the current pipeline step to the appropriate persona.
 *
 * Creates a dispatch envelope via HandoffWriter, formats delegation context,
 * and calls trackDelegation() to update workflow.md.
 */
export async function dispatchStep(
  cwd: string,
  sessionId: string,
  stepIndex: number,
  workflowName: string,
  task: string,
  context: string,
  constraints: string[] = [],
): Promise<DispatchResult> {
  const persona = resolvePersona(workflowName);
  if (!persona) {
    throw new Error(`No persona mapping found for workflow: ${workflowName}`);
  }

  // Create dispatch envelope via HandoffWriter (non-blocking on failure)
  let envelopePath = '';
  try {
    const written = await writeHandoffEnvelope(cwd, {
      sourcePersona: 'maestro',
      targetPersona: persona,
      type: 'dispatch',
      status: 'pending',
      task,
      context,
      constraints,
      summary: `Dispatch step ${stepIndex + 1}: ${workflowName}`,
    }, sessionId);
    envelopePath = written.filePath;
  } catch (err) {
    console.warn('[coordinator] Failed to write dispatch envelope:', err);
  }

  // Format delegation context
  const dispatchEnvelope = {
    sessionId,
    sequence: stepIndex + 1,
    sourcePersona: 'maestro',
    targetPersona: persona,
    task,
    context,
    constraints,
  };
  const delegationContext = formatDelegationContext(dispatchEnvelope);

  // Track delegation in workflow.md (non-blocking)
  try {
    await trackDelegation(sessionId, persona, envelopePath, cwd);
  } catch (err) {
    console.warn('[coordinator] Failed to track delegation:', err);
  }

  return {
    sessionId,
    stepIndex,
    workflowName,
    persona,
    envelopePath,
    delegationContext,
    orchestrationCue: formatOrchestrationCue({
      stageStatus: `Stage ${stepIndex + 1} dispatched to ${persona} for ${workflowName}.`,
      blockers: [],
      nextAction: `Wait for ${persona} return envelope and run approval gate.`,
      approvalRequired: false,
    }),
  };
}

// ─── CP3: Approval Gate Integration ──────────────────────────────────────────

/**
 * Process a return envelope through the approval gate.
 *
 * - Validates the return envelope via HandoffValidator
 * - On approval: advances pipeline to next step, updates workflow.md
 * - On rejection: creates revision handoff back to same persona, holds pipeline
 */
export async function processReturnEnvelope(
  cwd: string,
  sessionId: string,
  envelopePath: string,
  decision: 'approve' | 'reject',
  reviewer: string,
  note?: string,
): Promise<ApprovalResult> {
  const workflowPath = workflowIndexPath(cwd, sessionId);

  // Validate the return envelope (non-blocking on validation warnings)
  try {
    const validation = await validateHandoffEnvelope(envelopePath);
    if (validation.errors.length > 0) {
      console.warn('[coordinator] Return envelope validation errors:', validation.errors.map((e) => e.message));
    }
  } catch (err) {
    console.warn('[coordinator] Failed to validate return envelope:', err);
  }

  // Apply approval decision
  let revisionPath: string | undefined;
  try {
    const result = await applyApprovalDecision({
      cwd,
      envelopePath,
      workflowPath,
      decision,
      reviewer,
      note,
    });
    revisionPath = result.status === "ok" ? result.revisionPath : undefined;
  } catch (err) {
    console.warn('[coordinator] Failed to apply approval decision:', err);
  }

  if (decision === 'approve') {
    emitWorkflowMetric({
      name: 'approval_outcome',
      sessionId,
      outcome: 'approved',
    });

    // Advance pipeline: read current index, increment step
    try {
      const current = await readWorkflowIndex(workflowPath);
      const nextStepIndex = (current.frontmatter.currentStepIndex ?? 1) + 1;
      const totalSteps = current.frontmatter.totalSteps ?? 0;
      const isComplete = nextStepIndex > totalSteps;

      // Ensure we're in-progress before transitioning (created → in-progress → complete)
      let intermediate = current;
      if (current.frontmatter.workflowStatus === 'created') {
        intermediate = await updateWorkflowIndex(workflowPath, {
          workflowStatus: 'in-progress',
        });
      }

      const nextStatus: WorkflowStatus = isComplete ? 'complete' : 'in-progress';
      const workflowIndex = await updateWorkflowIndex(workflowPath, {
        workflowStatus: nextStatus,
        currentStepIndex: nextStepIndex,
      });

      if (isComplete) {
        emitWorkflowMetric({
          name: 'run_outcome',
          sessionId,
          outcome: 'complete',
        });
      }

      void intermediate; // used for side-effect only

      return {
        outcome: 'advanced',
        nextStepIndex,
        workflowIndex,
        orchestrationCue: formatOrchestrationCue({
          stageStatus: isComplete
            ? 'Pipeline complete after approval.'
            : `Pipeline advanced to step ${nextStepIndex}.`,
          blockers: [],
          nextAction: isComplete
            ? 'Publish final summary and confirm follow-up needs.'
            : `Dispatch next step at index ${nextStepIndex}.`,
          approvalRequired: false,
        }),
      };
    } catch (err) {
      console.warn('[coordinator] Failed to advance workflow index:', err);
      const fallback = await readWorkflowIndex(workflowPath);
      return {
        outcome: 'advanced',
        workflowIndex: fallback,
        orchestrationCue: formatOrchestrationCue({
          stageStatus: 'Approval accepted, but pipeline status refresh encountered a warning.',
          blockers: ['Workflow index refresh failed during post-approval update.'],
          nextAction: 'Re-check stage status and continue with the next valid step.',
          approvalRequired: false,
        }),
      };
    }
  } else {
    emitWorkflowMetric({
      name: 'approval_outcome',
      sessionId,
      outcome: 'rejected',
    });

    // Rejection: hold pipeline, record decision
    try {
      const workflowIndex = await updateWorkflowIndex(workflowPath, {
        workflowStatus: 'blocked',
      });
      emitWorkflowMetric({
        name: 'run_outcome',
        sessionId,
        outcome: 'blocked',
      });

      try {
        await addDecision(cwd, sessionId, {
          timestamp: new Date().toISOString(),
          handoffId: envelopePath,
          decision: 'rejected',
          reviewer,
          note: note ?? 'Rejected by reviewer',
        });
      } catch (err) {
        console.warn('[coordinator] Failed to add rejection decision:', err);
      }

      return {
        outcome: revisionPath ? 'revision-sent' : 'held',
        revisionPath,
        workflowIndex,
        orchestrationCue: formatOrchestrationCue({
          stageStatus: revisionPath
            ? 'Stage blocked with revision request sent to subagent.'
            : 'Stage blocked after rejection; revision request was not created.',
          blockers: [note ?? 'Rejected by reviewer'],
          nextAction: revisionPath
            ? 'Wait for revised return envelope, then request approval decision.'
            : 'Create or re-send revision request before continuing.',
          approvalRequired: true,
        }),
      };
    } catch (err) {
      console.warn('[coordinator] Failed to update workflow index on rejection:', err);
      const fallback = await readWorkflowIndex(workflowPath);
      return {
        outcome: 'held',
        workflowIndex: fallback,
        orchestrationCue: formatOrchestrationCue({
          stageStatus: 'Stage held after rejection with workflow index warning.',
          blockers: [note ?? 'Rejected by reviewer'],
          nextAction: 'Confirm blocked state, then send revision or retry guidance.',
          approvalRequired: true,
        }),
      };
    }
  }
}

// ─── CP4: Error Handling & Retry ─────────────────────────────────────────────

/**
 * Detect the type of subagent failure from available evidence.
 *
 * - 'missing-envelope': no return envelope file path provided
 * - 'blocked': return envelope exists but status is 'blocked'
 * - 'partial-return': return envelope exists but is incomplete/invalid
 */
export async function detectFailureType(
  envelopePath: string | null,
): Promise<FailureType> {
  if (!envelopePath) {
    return 'missing-envelope';
  }

  // Check file existence first
  try {
    const { access } = await import('node:fs/promises');
    await access(envelopePath);
  } catch {
    return 'missing-envelope';
  }

  // Try to read the envelope to check status field directly
  try {
    const { readHandoffEnvelope } = await import('../handoff/reader.js');
    const parsed = await readHandoffEnvelope(envelopePath);
    const status = parsed.frontmatter['status'];
    if (status === 'blocked') return 'blocked';
  } catch {
    // If we can't read it, it's a partial return
    return 'partial-return';
  }

  // Validate for structural completeness
  try {
    const validation = await validateHandoffEnvelope(envelopePath);
    if (validation.errors.length > 0) return 'partial-return';
  } catch {
    return 'partial-return';
  }

  return 'partial-return';
}

/**
 * Handle a subagent failure with escalation options.
 *
 * - retry: re-dispatch same step with original context + failure notes appended
 * - skip: mark step as skipped in workflow.md, advance pipeline
 * - abort: mark workflow as failed, preserve full state
 */
export async function handleFailure(
  cwd: string,
  sessionId: string,
  stepIndex: number,
  workflowName: string,
  action: EscalationAction,
  originalTask: string,
  originalContext: string,
  failureNotes: string,
  constraints: string[] = [],
): Promise<ErrorHandlingResult> {
  const workflowPath = workflowIndexPath(cwd, sessionId);

  if (action === 'retry') {
    emitWorkflowMetric({
      name: 'failure_action',
      sessionId,
      outcome: 'retry',
      workflowName,
    });

    // Re-dispatch with failure notes appended to context
    const augmentedContext = `${originalContext}\n\n## Previous Attempt Failure Notes\n${failureNotes}`;
    let envelopePath = '';
    try {
      const result = await dispatchStep(
        cwd,
        sessionId,
        stepIndex,
        workflowName,
        originalTask,
        augmentedContext,
        constraints,
      );
      envelopePath = result.envelopePath;
    } catch (err) {
      console.warn('[coordinator] Failed to re-dispatch on retry:', err);
    }

    let workflowIndex: WorkflowIndex;
    try {
      workflowIndex = await updateWorkflowIndex(workflowPath, {
        workflowStatus: 'in-progress',
      });
    } catch (err) {
      console.warn('[coordinator] Failed to update workflow index on retry:', err);
      workflowIndex = await readWorkflowIndex(workflowPath);
    }

    return {
      action: 'retry',
      envelopePath,
      workflowIndex,
      orchestrationCue: formatOrchestrationCue({
        stageStatus: `Retry dispatched for step ${stepIndex + 1} (${workflowName}).`,
        blockers: [failureNotes],
        nextAction: 'Wait for retry return envelope and reassess.',
        approvalRequired: false,
      }),
    };
  }

  if (action === 'skip') {
    emitWorkflowMetric({
      name: 'failure_action',
      sessionId,
      outcome: 'skip',
      workflowName,
    });

    // Mark step as skipped, advance pipeline
    let workflowIndex: WorkflowIndex;
    try {
      const current = await readWorkflowIndex(workflowPath);
      const nextStepIndex = (current.frontmatter.currentStepIndex ?? 1) + 1;
      const totalSteps = current.frontmatter.totalSteps ?? 0;
      const isComplete = nextStepIndex > totalSteps;

      // Ensure in-progress before transitioning (created → in-progress → complete)
      if (current.frontmatter.workflowStatus === 'created') {
        await updateWorkflowIndex(workflowPath, { workflowStatus: 'in-progress' });
      }

      const nextStatus: WorkflowStatus = isComplete ? 'complete' : 'in-progress';
      workflowIndex = await updateWorkflowIndex(workflowPath, {
        workflowStatus: nextStatus,
        currentStepIndex: nextStepIndex,
      });

      if (isComplete) {
        emitWorkflowMetric({
          name: 'run_outcome',
          sessionId,
          outcome: 'complete',
        });
      }

      try {
        await addDecision(cwd, sessionId, {
          timestamp: new Date().toISOString(),
          handoffId: `step-${stepIndex + 1}-${workflowName}`,
          decision: 'skipped',
          reviewer: 'coordinator',
          note: `Step skipped due to failure: ${failureNotes}`,
        });
      } catch (err) {
        console.warn('[coordinator] Failed to add skip decision:', err);
      }
    } catch (err) {
      console.warn('[coordinator] Failed to update workflow index on skip:', err);
      workflowIndex = await readWorkflowIndex(workflowPath);
    }

    return {
      action: 'skip',
      workflowIndex: workflowIndex!,
      orchestrationCue: formatOrchestrationCue({
        stageStatus: `Step ${stepIndex + 1} (${workflowName}) skipped after failure handling.`,
        blockers: [failureNotes],
        nextAction: 'Proceed to the next pipeline step.',
        approvalRequired: false,
      }),
    };
  }

  // abort: mark workflow as failed, preserve full state
  emitWorkflowMetric({
    name: 'failure_action',
    sessionId,
    outcome: 'abort',
    workflowName,
  });

  let workflowIndex: WorkflowIndex;
  try {
    workflowIndex = await updateWorkflowIndex(workflowPath, {
      workflowStatus: 'failed',
    });
    emitWorkflowMetric({
      name: 'run_outcome',
      sessionId,
      outcome: 'failed',
    });

    try {
      await addDecision(cwd, sessionId, {
        timestamp: new Date().toISOString(),
        handoffId: `step-${stepIndex + 1}-${workflowName}`,
        decision: 'aborted',
        reviewer: 'coordinator',
        note: `Pipeline aborted due to failure: ${failureNotes}`,
      });
    } catch (err) {
      console.warn('[coordinator] Failed to add abort decision:', err);
    }
  } catch (err) {
    console.warn('[coordinator] Failed to update workflow index on abort:', err);
    workflowIndex = await readWorkflowIndex(workflowPath);
  }

  return {
    action: 'abort',
    workflowIndex: workflowIndex!,
    orchestrationCue: formatOrchestrationCue({
      stageStatus: `Pipeline aborted at step ${stepIndex + 1} (${workflowName}).`,
      blockers: [failureNotes],
      nextAction: 'Escalate to developer and hold pipeline until new direction.',
      approvalRequired: true,
    }),
  };
}

// ─── CP5: Partial Execution & Resume ─────────────────────────────────────────

/**
 * Resume a pipeline from a specific step index.
 * Reads workflow.md to identify current state and returns resume context.
 */
export async function resumePipeline(
  cwd: string,
  sessionId: string,
): Promise<ResumeResult> {
  const workflowPath = workflowIndexPath(cwd, sessionId);
  const workflowIndex = await readWorkflowIndex(workflowPath);
  const currentStepIndex = workflowIndex.frontmatter.currentStepIndex ?? 1;

  emitWorkflowMetric({
    name: 'resume_result',
    sessionId,
    outcome: 'success',
  });

  return {
    sessionId,
    currentStepIndex,
    workflowIndex,
    orchestrationCue: formatOrchestrationCue({
      stageStatus: `Pipeline resumed at step index ${currentStepIndex}.`,
      blockers: [],
      nextAction: 'Continue from the current step according to workflow status.',
      approvalRequired: false,
    }),
  };
}

/**
 * Resume a pipeline from a compaction injection string.
 * Parses the injection to reconstruct coordinator position.
 */
export async function resumeFromInjection(
  cwd: string,
  injection: string,
): Promise<ResumeResult> {
  const report = await resumeFromCompaction(cwd, injection);

  if (report.status === 'missing') {
    throw new Error(`Cannot resume: workflow not found. ${report.message}`);
  }

  const workflowPath = report.workflowPath;
  const workflowIndex = await readWorkflowIndex(workflowPath);
  const currentStepIndex = workflowIndex.frontmatter.currentStepIndex ?? 1;

  emitWorkflowMetric({
    name: 'resume_result',
    sessionId: report.sessionId,
    outcome: 'success',
  });

  return {
    sessionId: report.sessionId,
    currentStepIndex,
    workflowIndex,
    orchestrationCue: formatOrchestrationCue({
      stageStatus: `Pipeline resumed from compaction at step index ${currentStepIndex}.`,
      blockers: [],
      nextAction: 'Continue orchestration from restored state.',
      approvalRequired: false,
    }),
  };
}

/**
 * Generate a compaction injection for the current pipeline state.
 * This injection contains enough state to reconstruct coordinator position
 * after a context compaction event.
 */
export async function getCompactionInjection(
  cwd: string,
  sessionId: string,
): Promise<string> {
  const workflowPath = workflowIndexPath(cwd, sessionId);
  try {
    return await generateCompactionInjection(workflowPath);
  } catch (err) {
    console.warn('[coordinator] Failed to generate compaction injection:', err);
    return '';
  }
}
