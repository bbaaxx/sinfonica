# Dispatch Envelope

- Session: `s-20260302-006`
- Workflow: `pi-surface-addition`
- Stage: `03-implementation-phase-3`
- Delegate: `@sinfonica-coda`
- Date: `2026-03-02`

## Objective

Implement Phase 3 from `Pi_Surface_Addition.md` by adding handoff envelope parsing/writing utilities and workflow state reader modules for the Pi extension.

## Inputs

- Development guide: `Pi_Surface_Addition.md` (Phase 3)
- Session tracker: `.sinfonica/handoffs/s-20260302-006/workflow.md`
- Prior approved return: `.sinfonica/handoffs/s-20260302-006/return-02-coda.md`
- Extension baseline: `pi-sinfonica-extension/`

## Constraints

- Scope limited to Phase 3 only.
- Add modules under:
  - `pi-sinfonica-extension/src/handoff-reader.ts`
  - `pi-sinfonica-extension/src/handoff-writer.ts`
  - `pi-sinfonica-extension/src/workflow-state.ts`
- Implement parsing for dispatch/return envelopes from `.sinfonica/handoffs/<sessionId>/` with frontmatter + body extraction.
- Implement return envelope writing with decision + optional feedback and contract validation.
- Implement workflow state parsing from `.sinfonica/handoffs/<sessionId>/workflow.md` (current step, total steps, status).
- Add focused tests for each module.
- Keep contracts compatible with existing Sinfonica handoff patterns.
- Run validation commands and report outcomes.

## Expected Outputs

1. New Phase 3 utility modules for handoff read/write and workflow state extraction.
2. Test coverage for parser/writer/state-reader behavior.
3. Return envelope in this session directory containing:
   - status (`approved` or `blocked`),
   - implementation summary,
   - artifacts list,
   - validation evidence (commands + outcomes),
   - blockers/risks.

## Acceptance Criteria

- `handoff-reader` correctly parses existing dispatch envelopes.
- `handoff-writer` generates valid return envelopes accepted by Sinfonica contracts.
- `workflow-state` correctly extracts workflow status fields from `workflow.md`.
- Relevant tests pass and `npm run build` passes, or blockers are explicitly documented.

## Execution Instruction

`@sinfonica-coda` please read and execute this dispatch envelope and write your return envelope in this same session directory.
