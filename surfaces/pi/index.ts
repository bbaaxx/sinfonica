import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  buildAdapterErrorDetails,
  buildAdapterSuccessDetails,
  type AdapterOperation,
  type AdapterOperationPayloads,
} from "./src/adapter-contract.ts";
import { writeReturnEnvelope } from "./src/handoff-writer.ts";
import { readActiveWorkflowStatus, registerStatusWidget } from "./src/widget/status.ts";
import { createSessionId } from "../../src/handoff/writer.js";
import { processReturnEnvelope, resolvePersona } from "../../src/workflow/coordinator.js";
import { readWorkflowIndex, updateWorkflowIndex, workflowIndexPath } from "../../src/workflow/index-manager.js";
import { createWorkflowIndex } from "../../src/workflow/index-manager.js";
import { loadWorkflowDef } from "../../src/workflow/step-engine.js";
import { registerWorkflowContextInjector } from "./src/context-injector.ts";
import { registerEnforcementBridge } from "./src/enforcement/index.ts";
import { evaluateAdvanceRequest, evaluateToolCall, resolveCurrentPhase, type WorkflowStateSnapshot } from "./src/orchestration/policy.ts";
import { extractEvidenceFromToolResult, type StepEvidence } from "./src/orchestration/evidence.ts";
import { readWorkflowState } from "./src/workflow-state.ts";
import {
  StartWorkflowParams,
  AdvanceStepParams,
  ListWorkflowsParams,
  type StartWorkflowParamsType,
  type AdvanceStepParamsType,
  type ListWorkflowsParamsType,
} from "./src/schemas.ts";

// Item #2: Config loading for enforcement mode
type EnforcementMode = "warn" | "block" | "disabled";

const readEnforcementConfig = async (cwd: string): Promise<EnforcementMode> => {
  // Check environment variable first
  const envValue = process.env.SINFONICA_PI_ENFORCEMENT?.toLowerCase();
  if (envValue === "warn" || envValue === "block") {
    return envValue;
  }

  // Try to read from config file
  try {
    const configPath = join(cwd, ".sinfonica", "config.json");
    const raw = await readFile(configPath, "utf8");
    const config = JSON.parse(raw) as Record<string, unknown>;
    const configValue = config.pi_native_enforcement;
    if (configValue === "warn" || configValue === "block") {
      return configValue;
    }
  } catch {
    // Config file doesn't exist or is invalid - use disabled
  }

  return "disabled";
};

type CommandAction = "status" | "advance" | "list" | "abort" | "reload";

type WorkflowType = StartWorkflowParamsType["workflowType"];
type AdvanceDecision = AdvanceStepParamsType["decision"];

type ExecuteResult = {
  stdout: string;
  stderr: string;
  code: number | null;
};

type ToolTextContent = {
  type: "text";
  text: string;
};

type ToolResult = {
  content: ToolTextContent[];
  details: Record<string, unknown>;
  isError?: boolean;
};

type ExtensionContext = {
  cwd: string;
  ui: {
    notify: (message: string, level?: "info" | "warning" | "error") => void;
    confirm: (title: string, message: string) => Promise<boolean>;
    select: (title: string, options: string[]) => Promise<string | undefined>;
    input: (title: string, placeholder?: string) => Promise<string | undefined>;
    setStatus: (id: string, text: string | undefined) => void;
    setWidget: (id: string, lines: string[] | undefined) => void;
  };
  sessionManager?: {
    getEntries: () => unknown[];
    getBranch: () => unknown;
  };
};

type ExtensionCommandContext = ExtensionContext & {
  waitForIdle: () => Promise<void>;
  newSession: () => Promise<void>;
  fork: () => Promise<void>;
  navigateTree: () => Promise<void>;
  reload: () => Promise<void>;
};

type ToolCallEvent = {
  toolName: string;
  toolCallId: string;
  input: unknown;
};

type ToolResultEvent = {
  toolName: string;
  toolCallId: string;
  content: unknown;
  details?: Record<string, unknown>;
  isError?: boolean;
};

type BeforeAgentStartReturn = {
  message?: {
    customType: string;
    content: string;
    display: boolean;
    details?: unknown;
  };
  systemPrompt?: string;
};

type ToolCallReturn =
  | { block: true; reason: string }
  | void;

type ToolResultReturn = {
  content?: unknown;
  details?: Record<string, unknown>;
  isError?: boolean;
} | void;

type SendMessageOptions = {
  deliverAs?: "steer" | "followUp" | "nextTurn";
  triggerTurn?: boolean;
};

// Tool parameters use TypeBox schemas from ./src/schemas.ts for type safety and runtime validation.
type RegisteredTool<TParams> = {
  name: string;
  label: string;
  description: string;
  promptSnippet?: string;
  promptGuidelines?: string[];
  parameters: Record<string, unknown>;
  execute: (
    toolCallId: string,
    params: TParams,
    signal: AbortSignal,
    onUpdate: unknown,
    ctx: ExtensionContext
  ) => Promise<ToolResult>;
  renderCall?: (args: unknown, theme: unknown) => unknown;
  renderResult?: (result: unknown, options: unknown, theme: unknown) => unknown;
};

type RegisteredCommand = {
  description: string;
  handler: (args: string | undefined, ctx: ExtensionCommandContext) => Promise<void>;
};

export type ExtensionAPI = {
  registerTool: <TParams>(tool: RegisteredTool<TParams>) => void;
  registerCommand: (name: string, command: RegisteredCommand) => void;
  on: (
    event: string,
    handler: (event: Record<string, unknown>, ctx?: ExtensionContext) => unknown | Promise<unknown>
  ) => void;
  sendMessage: (
    message: {
      customType: string;
      content: string;
      display: boolean;
      details?: unknown;
    },
    options?: SendMessageOptions
  ) => void;
  sendUserMessage?: (content: string, options?: { deliverAs?: "steer" | "followUp" }) => void;
  exec: (
    command: string,
    args: string[],
    options?: {
      signal?: AbortSignal;
      timeout?: number;
      cwd?: string;
    }
  ) => Promise<ExecuteResult>;
  getActiveTools?: () => string[];
  getAllTools?: () => Array<{ name: string; description: string }>;
  setActiveTools?: (names: string[]) => void;
  appendEntry?: (customType: string, data?: unknown) => void;
};

const COMMAND_ACTIONS: CommandAction[] = ["status", "advance", "list", "abort", "reload"];

const DEFAULT_WORKFLOW_STEP_SLUGS: Record<WorkflowType, string[]> = {
  "create-prd": ["gather-context", "draft-prd", "validate-prd", "approval"],
  "create-spec": ["analyze-prd", "draft-spec", "validate-spec", "approval"],
  "dev-story": ["analyze-story", "write-tests", "implement", "verify", "approval"],
  "code-review": ["review-code", "review-tests", "assess", "approval"],
};

const ADAPTER_ID = "pi";

const toCommandString = (command: string, args: string[]): string => `${command} ${args.join(" ")}`.trim();

const asErrorResult = <TOperation extends AdapterOperation>(
  operation: TOperation,
  name: string,
  error: unknown,
  payload: AdapterOperationPayloads[TOperation],
  command: string
): ToolResult => {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: `${name} failed: ${message}` }],
    details: buildAdapterErrorDetails({
      adapter: ADAPTER_ID,
      operation,
      command,
      code: null,
      stdout: "",
      stderr: message,
      payload,
      message,
    }),
    isError: true,
  };
};

const runSinfonica = async (
  pi: ExtensionAPI,
  args: string[],
  signal?: AbortSignal,
  cwd?: string
): Promise<ExecuteResult> => pi.exec("sinfonica", args, { signal, cwd });

const isUnknownSubcommand = (result: ExecuteResult, command: string): boolean => {
  const combined = `${result.stdout}\n${result.stderr}`.toLowerCase();
  return combined.includes(`unknown command '${command.toLowerCase()}'`);
};

const normalizeResult = <TOperation extends AdapterOperation>(
  operation: TOperation,
  command: string,
  args: string[],
  payload: AdapterOperationPayloads[TOperation],
  result: ExecuteResult
): ToolResult => {
  const ok = result.code === 0;
  const output = [result.stdout, result.stderr].filter((value) => value.trim().length > 0).join("\n").trim();
  const commandLine = toCommandString(command, args);
  const details = ok
    ? buildAdapterSuccessDetails({
        adapter: ADAPTER_ID,
        operation,
        command: commandLine,
        code: result.code,
        stdout: result.stdout,
        stderr: result.stderr,
        payload,
      })
    : buildAdapterErrorDetails({
        adapter: ADAPTER_ID,
        operation,
        command: commandLine,
        code: result.code,
        stdout: result.stdout,
        stderr: result.stderr,
        payload,
        message: output || `Command failed: ${commandLine}`,
      });

  return {
    content: [{ type: "text", text: output || `${ok ? "Completed" : "Failed"}: ${command} ${args.join(" ")}` }],
    details,
    isError: !ok,
  };
};

const listWorkflows = async (cwd: string): Promise<string[]> => {
  const candidateDirs = [join(cwd, ".sinfonica", "workflows"), join(cwd, "workflows")];

  for (const workflowsDir of candidateDirs) {
    try {
      const entries = await readdir(workflowsDir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }

  return [];
};

const parseCommandArgs = (args: string | undefined): { action: string; rest: string[] } => {
  const parts = (args ?? "")
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  const [action = "status", ...rest] = parts;
  return { action, rest };
};

const startWorkflowLocally = async (cwd: string, workflowType: WorkflowType, context?: string): Promise<string> => {
  const workflowDef = await loadWorkflowDef(cwd, workflowType);
  const sessionId = createSessionId();
  const persona = resolvePersona(workflowType) ?? workflowType;
  const fallbackSteps = DEFAULT_WORKFLOW_STEP_SLUGS[workflowType].map((slug, index) => ({
    index: index + 1,
    slug,
  }));
  const discoveredSteps = workflowDef && workflowDef.steps.length > 0 ? workflowDef.steps : fallbackSteps;
  const goal = context && context.trim().length > 0 ? context.trim() : workflowDef?.description ?? `Run ${workflowType} workflow`;

  await createWorkflowIndex({
    cwd,
    sessionId,
    workflowId: workflowType,
    goal,
    context: context?.trim() ?? "",
    steps: discoveredSteps.map((step) => ({
      step: `${step.index}-${step.slug}`,
      persona,
    })),
  });

  return sessionId;
};

const resolveSessionIdForAdvance = async (cwd: string): Promise<string | null> => {
  const active = await readActiveWorkflowStatus(cwd);
  if (active) {
    return active.sessionId;
  }

  try {
    const handoffsDir = join(cwd, ".sinfonica", "handoffs");
    const entries = await readdir(handoffsDir, { withFileTypes: true });
    const sessions = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("s-"))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left));
    return sessions[0] ?? null;
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

const advanceWorkflowLocally = async (
  cwd: string,
  decision: AdvanceDecision,
  feedback?: string
): Promise<string> => {
  const sessionId = await resolveSessionIdForAdvance(cwd);
  if (!sessionId) {
    throw new Error("No workflow session found. Start a workflow before advancing.");
  }

  const written = await writeReturnEnvelope({
    cwd,
    sessionId,
    decision,
    feedback,
    sourcePersona: "pi",
    targetPersona: "maestro",
  });

  await processReturnEnvelope(cwd, sessionId, written.filePath, decision === "approve" ? "approve" : "reject", "pi", feedback);
  return sessionId;
};

const abortWorkflowLocally = async (cwd: string): Promise<{ sessionId: string; changed: boolean } | null> => {
  const sessionId = await resolveSessionIdForAdvance(cwd);
  if (!sessionId) {
    return null;
  }

  const indexPath = workflowIndexPath(cwd, sessionId);
  const current = await readWorkflowIndex(indexPath);
  const status = current.frontmatter.workflowStatus;
  if (status === "failed") {
    return { sessionId, changed: false };
  }

  if (status === "complete") {
    return { sessionId, changed: false };
  }

  await updateWorkflowIndex(indexPath, { workflowStatus: "failed" });
  return { sessionId, changed: true };
};

export default function registerSinfonicaExtension(pi: ExtensionAPI): void {
  const enforcementBridge = registerEnforcementBridge(pi, {
    cwd: process.cwd(),
  });

  registerStatusWidget(pi, { cwd: process.cwd() });
  registerWorkflowContextInjector(pi, { cwd: process.cwd() });

  // Evidence accumulator for advance gating (WS3)
  let currentStepEvidence: Partial<StepEvidence> | null = null;

  const readActiveState = async (cwd: string): Promise<WorkflowStateSnapshot | null> => {
    const active = await readActiveWorkflowStatus(cwd);
    if (!active) {
      return null;
    }

    let currentStepSlug = `${active.currentStep}-unknown`;
    try {
      const state = await readWorkflowState(cwd, active.sessionId);
      // Item #5: Use real slug from workflow state stepSlugs array
      const slugIndex = active.currentStep - 1;
      if (state.stepSlugs && state.stepSlugs[slugIndex]) {
        currentStepSlug = state.stepSlugs[slugIndex];
      } else {
        // Fallback to step index format
        currentStepSlug = `${active.currentStep}-step`;
      }
    } catch {
      // Use fallback slug
    }

    return {
      sessionId: active.sessionId,
      workflowId: active.workflowId,
      currentStep: active.currentStep,
      totalSteps: active.totalSteps,
      currentStepSlug,
      status: active.status,
    };
  };

  // Accumulate evidence from tool results (Item #3: also persist)
  pi.on("tool_result", (event) => {
    const details = event.details as Record<string, unknown> | undefined;
    if (details && typeof event.toolName === "string" && !event.toolName.startsWith("sinfonica_")) {
      const extracted = extractEvidenceFromToolResult(details);
      if (extracted.executed) {
        currentStepEvidence = {
          ...currentStepEvidence,
          ...extracted,
        };
        // Item #3: Persist evidence for session recovery
        pi.appendEntry?.("sinfonica:step-evidence", currentStepEvidence);
      }
    }
  });

  // Item #3: Reset/reconstruct evidence on session start
  pi.on("session_start", async (_event, ctx) => {
    // First, try to reconstruct from persisted entries
    if (ctx?.sessionManager?.getEntries) {
      try {
        const entries = ctx.sessionManager.getEntries();
        const evidenceEntries = entries.filter(
          (entry) => (entry as { customType?: string }).customType === "sinfonica:step-evidence"
        );
        if (evidenceEntries.length > 0) {
          const latest = evidenceEntries[evidenceEntries.length - 1] as Record<string, unknown>;
          currentStepEvidence = latest.data as Partial<StepEvidence>;
          return;
        }
      } catch {
        // Ignore reconstruction errors, fall through to reset
      }
    }
    // No persisted evidence or reconstruction failed - start fresh
    currentStepEvidence = null;
  });

  // Item #3: Reset evidence on session compact/switch
  pi.on("session_compact", () => {
    currentStepEvidence = null;
  });

  pi.on("session_switch", () => {
    currentStepEvidence = null;
  });

  // Item #2: tool_call policy enforcement
  pi.on("tool_call", async (event, ctx) => {
    const toolName = event.toolName as string;
    
    // sinfonica tools bypass policy checks
    if (toolName.startsWith("sinfonica_")) {
      return;
    }

    const cwd = ctx?.cwd ?? process.cwd();
    const activeState = await readActiveState(cwd);
    if (!activeState) {
      return; // No active workflow, allow all tools
    }

    const enforcementMode = await readEnforcementConfig(cwd);
    if (enforcementMode === "disabled") {
      return; // Enforcement disabled, allow all tools
    }

    const currentPhase = resolveCurrentPhase(activeState);
    const policy = evaluateToolCall(toolName, event.input, currentPhase, activeState);

    if (!policy.allowed) {
      if (enforcementMode === "block") {
        return { block: true, reason: policy.reason };
      }
      // warn mode: notify but allow
      ctx?.ui?.notify?.(policy.reason ?? "Tool blocked by policy", "warning");
    }
  });

  pi.registerTool<StartWorkflowParamsType>({
    name: "sinfonica_start_workflow",
    label: "Start Sinfonica Workflow",
    description: "Start a Sinfonica workflow by delegating to the Sinfonica CLI.",
    parameters: StartWorkflowParams,
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      try {
        const args = ["start", params.workflowType];
        if (params.context && params.context.trim().length > 0) {
          args.push("--context", params.context.trim());
        }
        const commandLine = toCommandString("sinfonica", args);
        const result = await runSinfonica(pi, args, signal, ctx.cwd);
        const payload = {
          workflowType: params.workflowType,
          context: params.context ?? null,
        };

        if (result.code !== 0 && isUnknownSubcommand(result, "start")) {
          const cwd = ctx.cwd;
          const sessionId = await startWorkflowLocally(cwd, params.workflowType, params.context);
          pi.appendEntry?.("sinfonica:state-change", {
            sessionId,
            workflowType: params.workflowType,
            event: "workflow-started",
            timestamp: new Date().toISOString(),
          });
          const stdout = `Started workflow ${params.workflowType} in session ${sessionId}.`;
          return {
            content: [{ type: "text", text: stdout }],
            details: {
              ...buildAdapterSuccessDetails({
                adapter: ADAPTER_ID,
                operation: "workflow.start",
                command: `${commandLine} (local-fallback)`,
                code: 0,
                stdout,
                stderr: result.stderr,
                payload,
              }),
              ...payload,
            },
          };
        }

        const normalized = normalizeResult("workflow.start", "sinfonica", args, payload, result);
        return {
          ...normalized,
          details: {
            ...normalized.details,
            ...payload,
          },
        };
      } catch (error) {
        return asErrorResult(
          "workflow.start",
          "sinfonica_start_workflow",
          error,
          {
            workflowType: params.workflowType,
            context: params.context ?? null,
          },
          toCommandString("sinfonica", ["start", params.workflowType])
        );
      }
    },
  });

  pi.registerTool<AdvanceStepParamsType>({
    name: "sinfonica_advance_step",
    label: "Advance Sinfonica Step",
    description: "Advance the active Sinfonica workflow by recording a decision via CLI.",
    parameters: AdvanceStepParams,
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      try {
        // Evidence-gated advance (WS3): check accumulated evidence before allowing
        const activeState = await readActiveState(ctx.cwd);
        if (activeState && params.decision === "approve") {
          const advancePolicy = evaluateAdvanceRequest(currentStepEvidence, activeState);
          if (!advancePolicy.allowed) {
            return {
              content: [{ type: "text", text: advancePolicy.reason ?? "Advance blocked: insufficient evidence." }],
              details: {
                ok: false,
                adapter: ADAPTER_ID,
                operation: "step.advance" as const,
                blocked: true,
                reason: advancePolicy.reason,
                requiredEvidence: advancePolicy.requiredEvidence,
                decision: params.decision,
                feedback: params.feedback ?? null,
              },
              isError: true,
            };
          }
        }

        const args = ["advance", "--decision", params.decision];
        if (params.feedback && params.feedback.trim().length > 0) {
          args.push("--feedback", params.feedback.trim());
        }
        const commandLine = toCommandString("sinfonica", args);
        const result = await runSinfonica(pi, args, signal, ctx.cwd);
        const payload = {
          decision: params.decision,
          feedback: params.feedback ?? null,
        };

        if (result.code !== 0 && isUnknownSubcommand(result, "advance")) {
          const cwd = ctx.cwd;
          let sessionId: string;
          try {
            sessionId = await advanceWorkflowLocally(cwd, params.decision, params.feedback);
          } catch (error) {
            return asErrorResult(
              "step.advance",
              "sinfonica_advance_step",
              error,
              payload,
              `${commandLine} (local-fallback)`
            );
          }

          pi.appendEntry?.("sinfonica:state-change", {
            sessionId,
            decision: params.decision,
            event: "step-advanced",
            timestamp: new Date().toISOString(),
          });
          // Reset evidence for next step after successful advance
          currentStepEvidence = null;
          const stdout = `Recorded ${params.decision} for session ${sessionId}.`;
          return {
            content: [{ type: "text", text: stdout }],
            details: {
              ...buildAdapterSuccessDetails({
                adapter: ADAPTER_ID,
                operation: "step.advance",
                command: `${commandLine} (local-fallback)`,
                code: 0,
                stdout,
                stderr: result.stderr,
                payload,
              }),
              ...payload,
            },
          };
        }

        // Reset evidence for next step after successful CLI advance
        currentStepEvidence = null;
        const normalized = normalizeResult("step.advance", "sinfonica", args, payload, result);
        return {
          ...normalized,
          details: {
            ...normalized.details,
            ...payload,
          },
        };
      } catch (error) {
        return asErrorResult(
          "step.advance",
          "sinfonica_advance_step",
          error,
          {
            decision: params.decision,
            feedback: params.feedback ?? null,
          },
          toCommandString("sinfonica", ["advance", "--decision", params.decision])
        );
      }
    },
  });

  pi.registerTool<ListWorkflowsParamsType>({
    name: "sinfonica_list_workflows",
    label: "List Sinfonica Workflows",
    description: "List available workflow IDs from the repository workflows directory.",
    parameters: ListWorkflowsParams,
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      try {
        const cwd = ctx.cwd;
        const workflows = await listWorkflows(cwd);
        const lines = workflows.length > 0 ? workflows.map((name) => `- ${name}`).join("\n") : "(none found)";
        const payload = {
          workflows,
          count: workflows.length,
        };
        return {
          content: [{ type: "text", text: `Available workflows:\n${lines}` }],
          details: {
            ...buildAdapterSuccessDetails({
              adapter: ADAPTER_ID,
              operation: "status.reporting",
              command: "sinfonica list",
              code: 0,
              stdout: lines,
              stderr: "",
              payload,
            }),
            ...payload,
          },
        };
      } catch (error) {
        return asErrorResult(
          "status.reporting",
          "sinfonica_list_workflows",
          error,
          {
            workflows: [],
            count: 0,
          },
          "sinfonica list"
        );
      }
    },
  });

  pi.registerCommand("sinfonica", {
    description: "Sinfonica workflow control: status | advance | list | abort | reload",
    handler: async (rawArgs, ctx) => {
      const { action, rest } = parseCommandArgs(rawArgs);

      if (!COMMAND_ACTIONS.includes(action as CommandAction)) {
        ctx.ui.notify("Usage: /sinfonica <status|advance|list|abort|reload>", "warning");
        return;
      }

      try {
        if (action === "list") {
          const workflows = await listWorkflows(ctx.cwd);
          const summary = workflows.length > 0 ? workflows.join(", ") : "no workflows found";
          ctx.ui.notify(`Sinfonica workflows: ${summary}`, "info");
          return;
        }

        if (action === "status") {
          const active = await readActiveWorkflowStatus(ctx.cwd);
          if (active) {
            const statusLine = `${active.workflowId} | Step ${active.currentStep}/${active.totalSteps} | ${active.status}`;
            ctx.ui.setStatus("sinfonica", statusLine);
            ctx.ui.setWidget("sinfonica-workflow", [
              `Workflow: ${active.workflowId}`,
              `Session: ${active.sessionId}`,
              `Step: ${active.currentStep}/${active.totalSteps}`,
              `Status: ${active.status}`,
            ]);
            ctx.ui.notify(`Sinfonica status: ${statusLine}`, "info");
          } else {
            const workflows = await listWorkflows(ctx.cwd);
            const summary = workflows.length > 0 ? workflows.join(", ") : "no workflows found";
            ctx.ui.setStatus("sinfonica", undefined);
            ctx.ui.setWidget("sinfonica-workflow", undefined);
            ctx.ui.notify(`Sinfonica status: ready (${summary})`, "info");
          }
          return;
        }

        if (action === "advance") {
          const decision = rest[0] === "request-revision" ? "request-revision" : "approve";
          const feedback = rest.slice(1).join(" ").trim();

          // Interactive confirmation for command-based advance
          if (decision === "approve") {
            const confirmed = await ctx.ui.confirm("Advance Step", `Approve the current workflow step?`);
            if (!confirmed) {
              ctx.ui.notify("Advance cancelled.", "info");
              return;
            }

            // Policy gate: check evidence before allowing approve
            const activeState = await readActiveState(ctx.cwd);
            if (activeState) {
              const advancePolicy = evaluateAdvanceRequest(currentStepEvidence, activeState);
              if (!advancePolicy.allowed) {
                ctx.ui.notify(advancePolicy.reason ?? "Cannot advance: insufficient evidence.", "warning");
                return;
              }
            }
          }

          const args = ["advance", "--decision", decision];
          if (feedback.length > 0) {
            args.push("--feedback", feedback);
          }
          const result = await runSinfonica(pi, args, undefined, ctx.cwd);

          if (result.code !== 0 && isUnknownSubcommand(result, "advance")) {
            const sessionId = await advanceWorkflowLocally(ctx.cwd, decision, feedback.length > 0 ? feedback : undefined);
            ctx.ui.notify(`Sinfonica advance recorded for session ${sessionId}.`, "info");
            return;
          }

          const message = result.code === 0 ? "Sinfonica advance succeeded." : "Sinfonica advance failed.";
          ctx.ui.notify(message, result.code === 0 ? "info" : "error");
          return;
        }

        if (action === "reload") {
          const count = await enforcementBridge.reload(ctx.cwd);
          const label = count === 1 ? "rule" : "rules";
          ctx.ui.notify(`Sinfonica enforcement reloaded (${count} ${label}).`, "info");
          return;
        }

        if (action === "abort") {
          const result = await runSinfonica(pi, ["abort"], undefined, ctx.cwd);

          if (result.code !== 0 && isUnknownSubcommand(result, "abort")) {
            const localAbort = await abortWorkflowLocally(ctx.cwd);
            if (!localAbort) {
              ctx.ui.notify("No workflow session found to abort.", "warning");
              return;
            }

            if (localAbort.changed) {
              ctx.ui.notify(`Sinfonica abort recorded for session ${localAbort.sessionId}.`, "info");
              return;
            }

            ctx.ui.notify(`Sinfonica session ${localAbort.sessionId} was already terminal.`, "info");
            return;
          }

          const message = result.code === 0 ? "/sinfonica abort succeeded." : "/sinfonica abort failed.";
          ctx.ui.notify(message, result.code === 0 ? "info" : "error");
          return;
        }

        const args = [action];
        const result = await runSinfonica(pi, args, undefined, ctx.cwd);
        const message = result.code === 0 ? `/sinfonica ${action} succeeded.` : `/sinfonica ${action} failed.`;
        ctx.ui.notify(message, result.code === 0 ? "info" : "error");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(`Sinfonica command failed: ${message}`, "error");
      }
    },
  });
}
