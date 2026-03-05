export type WorkflowStub = {
  commandName: string;
  description: string;
  workflowId: string;
  skillName: string;
};

export const WORKFLOW_STUBS: WorkflowStub[] = [
  {
    commandName: "sinfonica-create-prd",
    description: "Create a PRD with the Sinfonica workflow",
    workflowId: "create-prd",
    skillName: "sinfonica-create-prd"
  },
  {
    commandName: "sinfonica-create-spec",
    description: "Create a spec with the Sinfonica workflow",
    workflowId: "create-spec",
    skillName: "sinfonica-create-spec"
  },
  {
    commandName: "sinfonica-dev-story",
    description: "Implement a story with the Sinfonica workflow",
    workflowId: "dev-story",
    skillName: "sinfonica-dev-story"
  },
  {
    commandName: "sinfonica-code-review",
    description: "Run a code review with the Sinfonica workflow",
    workflowId: "code-review",
    skillName: "sinfonica-code-review"
  }
];

export const toCommandStub = (workflow: WorkflowStub): string => `---
name: ${workflow.commandName}
description: ${workflow.description}
---

Route this request to @sinfonica-maestro and run workflow \`${workflow.workflowId}\`.

User input: $ARGUMENTS

Load skill package: \`.opencode/skills/${workflow.skillName}/SKILL.md\`.
`;

export const toSkill = (workflow: WorkflowStub): string => `# ${workflow.skillName}

Workflow support skill for workflow \`${workflow.workflowId}\`.

## Steps

1. Parse and normalize the request input.
2. Build a short execution plan for this workflow.
3. Execute the workflow stages through the assigned persona chain.
4. Validate outputs against acceptance criteria.
5. Return a concise result summary and next actions.
`;
