import { Type, Static } from "@sinclair/typebox";

export const WorkflowType = Type.Union([
  Type.Literal("create-prd"),
  Type.Literal("create-spec"),
  Type.Literal("dev-story"),
  Type.Literal("code-review")
], {
  description: "Workflow ID to start."
});

export const AdvanceDecision = Type.Union([
  Type.Literal("approve"),
  Type.Literal("request-revision")
], {
  description: "Decision for the active step."
});

export const StartWorkflowParams = Type.Object({
  workflowType: WorkflowType,
  context: Type.Optional(Type.String({
    description: "Optional context to include when starting the workflow."
  }))
});

export const AdvanceStepParams = Type.Object({
  decision: AdvanceDecision,
  feedback: Type.Optional(Type.String({
    description: "Optional reviewer feedback."
  }))
});

export const ListWorkflowsParams = Type.Object({});

export type StartWorkflowParamsType = Static<typeof StartWorkflowParams>;
export type AdvanceStepParamsType = Static<typeof AdvanceStepParams>;
export type ListWorkflowsParamsType = Static<typeof ListWorkflowsParams>;
