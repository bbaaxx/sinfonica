import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { readWorkflowState } from "../workflow-state.ts";

const ACTIVE_STATUSES = ["created", "in-progress", "pending", "blocked", "active"];

export type WorkflowStatusPayload = {
  sessionId: string;
  workflowId: string;
  currentStep: number;
  totalSteps: number;
  status: string;
};

type WidgetMessage = {
  customType: string;
  content: string;
  details?: unknown;
  display: boolean;
};

type StatusEvent = Record<string, unknown> & { cwd?: string };

type StatusEventName = "session_start" | "agent_end" | "tool_result" | "session_compact" | "session_switch";

type StatusWidgetApi = {
  on: (event: StatusEventName, handler: (event: StatusEvent, ctx?: { cwd?: string }) => void | Promise<void>) => void;
  sendMessage: (message: WidgetMessage) => void;
};

const deriveWorkflowIdFromSourcePlan = (sourcePlanRaw: string): string => {
  const withoutTicks = sourcePlanRaw.replace(/`/g, "").trim();
  const withoutExtension = withoutTicks.replace(/\.[a-z0-9]+$/i, "");
  return withoutExtension
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
};

const extractWorkflowId = (rawWorkflow: string, sessionId: string): string => {
  const frontmatterWorkflowMatch = rawWorkflow.match(/^workflow_id:\s*(.+)$/im);
  if (frontmatterWorkflowMatch && frontmatterWorkflowMatch[1].trim().length > 0) {
    return frontmatterWorkflowMatch[1].trim();
  }

  const workflowMatch = rawWorkflow.match(/-\s*Workflow:\s*`?([^`\n]+)`?\s*$/im);
  if (workflowMatch && workflowMatch[1].trim().length > 0) {
    return workflowMatch[1].trim();
  }

  const sourcePlanMatch = rawWorkflow.match(/-\s*Source Plan:\s*`?([^`\n]+)`?\s*$/im);
  if (sourcePlanMatch && sourcePlanMatch[1].trim().length > 0) {
    return deriveWorkflowIdFromSourcePlan(sourcePlanMatch[1]);
  }

  return sessionId;
};

const isNotFoundError = (error: unknown): boolean =>
  error instanceof Error && "code" in error && (error as Error & { code?: string }).code === "ENOENT";

const listSessionDirectories = async (cwd: string): Promise<string[]> => {
  const handoffsDir = join(cwd, ".sinfonica", "handoffs");
  try {
    const entries = await readdir(handoffsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("s-"))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left));
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }
    throw error;
  }
};

const isActiveWorkflowStatus = (status: string): boolean => ACTIVE_STATUSES.some((token) => status.includes(token));

const readWorkflowId = async (cwd: string, sessionId: string): Promise<string> => {
  const workflowPath = join(cwd, ".sinfonica", "handoffs", sessionId, "workflow.md");
  const rawWorkflow = await readFile(workflowPath, "utf8");
  return extractWorkflowId(rawWorkflow, sessionId);
};

export const readSessionWorkflowStatus = async (cwd: string, sessionId: string): Promise<WorkflowStatusPayload | null> => {
  try {
    const [state, workflowId] = await Promise.all([readWorkflowState(cwd, sessionId), readWorkflowId(cwd, sessionId)]);
    return {
      sessionId,
      workflowId,
      currentStep: state.currentStep,
      totalSteps: state.totalSteps,
      status: state.status,
    };
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
};

export const readActiveWorkflowStatus = async (cwd: string): Promise<WorkflowStatusPayload | null> => {
  const sessions = await listSessionDirectories(cwd);
  for (const sessionId of sessions) {
    const status = await readSessionWorkflowStatus(cwd, sessionId);
    if (status && isActiveWorkflowStatus(status.status)) {
      return status;
    }
  }
  return null;
};

const formatStatusLine = (status: WorkflowStatusPayload): string =>
  `Workflow ${status.workflowId} | Step ${status.currentStep}/${status.totalSteps} | ${status.status}`;

export const registerStatusWidget = (pi: StatusWidgetApi, options: { cwd?: string } = {}): void => {
  let cwd = options.cwd ?? process.cwd();
  let lastSent = "";

  const publish = async (nextCwd?: string): Promise<void> => {
    cwd = nextCwd ?? cwd;
    const status = await readActiveWorkflowStatus(cwd);
    if (!status) {
      lastSent = "";
      return;
    }

    const signature = JSON.stringify(status);
    if (signature === lastSent) {
      return;
    }

    lastSent = signature;
    pi.sendMessage({
      customType: "sinfonica:status",
      content: formatStatusLine(status),
      details: status,
      display: true,
    });
  };

  const events: StatusEventName[] = ["session_start", "tool_result", "agent_end", "session_compact", "session_switch"];
  for (const eventName of events) {
    pi.on(eventName, async (event, ctx) => {
      const nextCwd =
        typeof ctx?.cwd === "string" && ctx.cwd.trim().length > 0
          ? ctx.cwd
          : typeof event.cwd === "string" && event.cwd.trim().length > 0
            ? event.cwd
            : undefined;
      await publish(nextCwd);
    });
  }
};
