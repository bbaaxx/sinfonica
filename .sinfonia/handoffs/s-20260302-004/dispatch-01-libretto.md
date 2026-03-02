# Dispatch Envelope

- Session: `s-20260302-004`
- Workflow: `create-prd`
- Stage: `01-prd-authoring`
- Delegate: `@sinfonia-libretto`
- Date: `2026-03-02`

## Objective

Create a retrospective Product Requirements Document (PRD) for the current product in this repository.

## Source Request

"Can we retroactively create the PRD of this product"

## Skill Context

Loaded guidance from `.opencode/skills/sinfonia-create-prd/SKILL.md`:

1. Parse and normalize request input.
2. Build a short execution plan for this workflow.
3. Execute workflow stages through assigned persona chain.
4. Validate outputs against acceptance criteria.
5. Return concise result summary and next actions.

## Constraints

- Produce a structured PRD using Sinfonia template conventions.
- Ground the PRD in repository evidence (docs, source, workflows, tests).
- Call out assumptions explicitly where evidence is incomplete.
- Do not modify product code; produce planning artifacts only.

## Expected Outputs

1. PRD artifact path written under the session handoff directory.
2. Return envelope summarizing:
   - what was produced,
   - completeness assessment,
   - open questions or gaps,
   - recommended next stage.

## Acceptance Criteria

- PRD includes: problem context, goals/non-goals, users/personas, core requirements, constraints, success metrics, risks, and phased scope.
- Requirements are testable and specific enough for technical specification handoff.
- Return envelope includes an explicit approve/revise recommendation.

## Execution Instruction

`@sinfonia-libretto` please read and execute this dispatch envelope and write your return envelope in this same session directory.
