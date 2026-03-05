import { readdir } from "node:fs/promises";
import { join } from "node:path";

import {
  buildAdapterErrorDetails,
  buildAdapterSuccessDetails,
  type AdapterOperation,
  type AdapterOperationPayloads,
} from "./src/adapter-contract.ts";
import { registerWorkflowContextInjector } from "./src/context-injector.ts";
import { registerEnforcementBridge } from "./src/enforcement/index.ts";
import { registerStatusWidget } from "./src/widget/status.ts";

type WorkflowType = "create-prd" | "create-spec" | "dev-story" | "code-review";
type AdvanceDecision = "approve" | "request-revision";
type CommandAction = "status" | "advance" | "list" | "abort" | "reload";

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
  };
};

type StartWorkflowParams = {
  workflowType: WorkflowType;
  context?: string;
};

type AdvanceStepParams = {
  decision: AdvanceDecision;
  feedback?: string;
};

type ListWorkflowsParams = Record<string, never>;

type RegisteredTool<TParams> = {
  name: string;
  label: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (
    toolCallId: string,
    params: TParams,
    signal?: AbortSignal,
    onUpdate?: unknown,
    ctx?: ExtensionContext
  ) => Promise<ToolResult>;
};

type RegisteredCommand = {
  description: string;
  handler: (args: string | undefined, ctx: ExtensionContext) => Promise<void>;
};

export type ExtensionAPI = {
  registerTool: <TParams>(tool: RegisteredTool<TParams>) => void;
  registerCommand: (name: string, command: RegisteredCommand) => void;
  on?: (
    event: "tool_call" | "session_start" | "before_agent_start" | "agent_end" | "tool_result" | "session_compact" | "session_switch",
    handler: (event: Record<string, unknown>, ctx?: { cwd?: string }) => unknown | Promise<unknown> | void
  ) => void;
  registerMessageRenderer?: (customType: string, renderer: (message: { details?: unknown; content?: unknown }) => unknown) => void;
  sendMessage?: (message: {
    customType: string;
    content: string;
    display?: "hidden" | "inline" | "bubble";
    details?: unknown;
  }) => void;
  exec: (
    command: string,
    args: string[],
    options?: {
      signal?: AbortSignal;
      cwd?: string;
    }
  ) => Promise<ExecuteResult>;
};

const WORKFLOW_TYPES: WorkflowType[] = ["create-prd", "create-spec", "dev-story", "code-review"];
const ADVANCE_DECISIONS: AdvanceDecision[] = ["approve", "request-revision"];
const COMMAND_ACTIONS: CommandAction[] = ["status", "advance", "list", "abort", "reload"];

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
  const workflowsDir = join(cwd, "workflows");
  const entries = await readdir(workflowsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
};

const parseCommandArgs = (args: string | undefined): { action: string; rest: string[] } => {
  const parts = (args ?? "")
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  const [action = "status", ...rest] = parts;
  return { action, rest };
};

export default function registerSinfonicaExtension(pi: ExtensionAPI): void {
  const enforcementBridge = registerEnforcementBridge(pi, {
    cwd: process.cwd(),
  });

  registerStatusWidget(pi, { cwd: process.cwd() });
  registerWorkflowContextInjector(pi, { cwd: process.cwd() });

  pi.registerTool<StartWorkflowParams>({
    name: "sinfonica_start_workflow",
    label: "Start Sinfonica Workflow",
    description: "Start a Sinfonica workflow by delegating to the Sinfonica CLI.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        workflowType: {
          type: "string",
          enum: WORKFLOW_TYPES,
          description: "Workflow ID to start.",
        },
        context: {
          type: "string",
          description: "Optional context to include when starting the workflow.",
        },
      },
      required: ["workflowType"],
    },
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      try {
        const args = ["start", params.workflowType];
        if (params.context && params.context.trim().length > 0) {
          args.push("--context", params.context.trim());
        }
        const result = await runSinfonica(pi, args, signal, ctx?.cwd);
        const payload = {
          workflowType: params.workflowType,
          context: params.context ?? null,
        };
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

  pi.registerTool<AdvanceStepParams>({
    name: "sinfonica_advance_step",
    label: "Advance Sinfonica Step",
    description: "Advance the active Sinfonica workflow by recording a decision via CLI.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        decision: {
          type: "string",
          enum: ADVANCE_DECISIONS,
          description: "Decision for the active step.",
        },
        feedback: {
          type: "string",
          description: "Optional reviewer feedback.",
        },
      },
      required: ["decision"],
    },
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      try {
        const args = ["advance", "--decision", params.decision];
        if (params.feedback && params.feedback.trim().length > 0) {
          args.push("--feedback", params.feedback.trim());
        }
        const result = await runSinfonica(pi, args, signal, ctx?.cwd);
        const payload = {
          decision: params.decision,
          feedback: params.feedback ?? null,
        };
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

  pi.registerTool<ListWorkflowsParams>({
    name: "sinfonica_list_workflows",
    label: "List Sinfonica Workflows",
    description: "List available workflow IDs from the repository workflows directory.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {},
      required: [],
    },
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      try {
        const cwd = ctx?.cwd ?? process.cwd();
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

        if (action === "advance") {
          const decision = rest[0] === "request-revision" ? "request-revision" : "approve";
          const args = ["advance", "--decision", decision];
          const result = await runSinfonica(pi, args, undefined, ctx.cwd);
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
