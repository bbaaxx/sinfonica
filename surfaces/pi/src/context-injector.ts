import { readLatestHandoffEnvelope } from "./handoff-reader.ts";
import { readActiveWorkflowStatus } from "./widget/status.ts";

type BeforeAgentStartEvent = {
  type?: "before_agent_start";
  prompt?: string;
  cwd?: string;
};

type ContextMessage = {
  customType: string;
  content: string;
  details?: unknown;
  display?: "hidden" | "inline" | "bubble";
};

type BeforeAgentStartResult = {
  message: ContextMessage;
};

type ContextInjectorApi = {
  on?: (
    event: "before_agent_start",
    handler: (
      event: BeforeAgentStartEvent,
      ctx?: { cwd?: string }
    ) => Promise<BeforeAgentStartResult | void> | BeforeAgentStartResult | void
  ) => void;
};

const normalizePersona = (raw: unknown): string | null => {
  if (typeof raw !== "string") {
    return null;
  }
  const persona = raw.replace(/`/g, "").trim().replace(/^@/, "");
  return persona.length > 0 ? persona : null;
};

const summarizeArtifacts = (section: string | undefined): string[] => {
  if (!section) {
    return [];
  }

  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter((line) => line.length > 0 && line.toLowerCase() !== "none");
};

const buildInjectionText = (input: {
  workflowId: string;
  currentStep: number;
  totalSteps: number;
  status: string;
  persona: string | null;
  artifacts: string[];
}): string => {
  const lines = [
    "Active Sinfonica workflow context:",
    `- Workflow: ${input.workflowId}`,
    `- Status: ${input.status}`,
    `- Step: ${input.currentStep}/${input.totalSteps}`,
    `- Persona: ${input.persona ?? "unknown"}`,
  ];

  if (input.artifacts.length > 0) {
    lines.push(`- Artifacts: ${input.artifacts.join("; ")}`);
  } else {
    lines.push("- Artifacts: none recorded");
  }

  return lines.join("\n");
};

const readPersonaAndArtifacts = async (
  cwd: string,
  sessionId: string
): Promise<{ persona: string | null; artifacts: string[] }> => {
  let persona: string | null = null;
  let artifacts: string[] = [];

  try {
    const dispatchEnvelope = await readLatestHandoffEnvelope(cwd, sessionId, "dispatch");
    persona =
      normalizePersona(dispatchEnvelope.frontmatter.delegate) ??
      normalizePersona(dispatchEnvelope.frontmatter.target_persona) ??
      normalizePersona(dispatchEnvelope.frontmatter.source_persona);
  } catch {
    persona = null;
  }

  try {
    const returnEnvelope = await readLatestHandoffEnvelope(cwd, sessionId, "return");
    artifacts = summarizeArtifacts(returnEnvelope.sections.Artifacts);
  } catch {
    artifacts = [];
  }

  return { persona, artifacts };
};

export const registerWorkflowContextInjector = (pi: ContextInjectorApi, options: { cwd?: string } = {}): void => {
  const defaultCwd = options.cwd ?? process.cwd();

  pi.on?.("before_agent_start", async (event, ctx) => {
    const cwd =
      typeof ctx?.cwd === "string" && ctx.cwd.trim().length > 0
        ? ctx.cwd
        : typeof event.cwd === "string" && event.cwd.trim().length > 0
          ? event.cwd
          : defaultCwd;

    const status = await readActiveWorkflowStatus(cwd);
    if (!status) {
      return;
    }

    const { persona, artifacts } = await readPersonaAndArtifacts(cwd, status.sessionId);
    const content = buildInjectionText({
      workflowId: status.workflowId,
      currentStep: status.currentStep,
      totalSteps: status.totalSteps,
      status: status.status,
      persona,
      artifacts,
    });

    return {
      message: {
        customType: "sinfonica:context",
        content,
        details: {
          sessionId: status.sessionId,
          workflowId: status.workflowId,
          currentStep: status.currentStep,
          totalSteps: status.totalSteps,
          status: status.status,
          persona,
          artifacts,
        },
        display: "hidden",
      },
    };
  });
};
