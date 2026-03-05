# Dispatch Envelope

- Session: `s-20260302-006`
- Workflow: `pi-surface-addition`
- Stage: `05-implementation-phase-5`
- Delegate: `@sinfonica-coda`
- Date: `2026-03-02`

## Objective

Implement Phase 5 from `Pi_Surface_Addition.md` by adding workflow status UI support and context injection for active workflows in the Pi extension.

## Inputs

- Development guide: `Pi_Surface_Addition.md` (Phase 5)
- Session tracker: `.sinfonica/handoffs/s-20260302-006/workflow.md`
- Prior approved return: `.sinfonica/handoffs/s-20260302-006/return-04-coda.md`
- Existing extension and Phase 3/4 utilities under `pi-sinfonica-extension/`

## Constraints

- Scope limited to Phase 5 only.
- Add modules under:
  - `pi-sinfonica-extension/src/widget/status.ts`
  - `pi-sinfonica-extension/src/context-injector.ts`
- Implement status widget behavior:
  - read workflow state on session start,
  - update on workflow lifecycle/tool events (at minimum `agent_end` and tool result equivalent hooks in current extension API),
  - expose workflow ID/current step/total steps/status.
- Register renderer/message path for custom status payload (`sinfonica:status`) aligned with current extension API constraints.
- Implement context injection:
  - subscribe to `before_agent_start` (or closest compatible API hook),
  - inject active workflow context including step, persona, and produced artifacts summary when available.
- Ensure behavior remains robust across compaction/reload-style events supported by this codebase.
- Add focused tests for widget and context injection behavior.
- Run validation commands and report outcomes.

## Expected Outputs

1. Phase 5 widget and context injector modules.
2. Extension integration wiring for status updates and context injection.
3. Tests covering status updates and context injection.
4. Return envelope in this session directory containing:
   - status (`approved` or `blocked`),
   - implementation summary,
   - artifacts list,
   - validation evidence (commands + outcomes),
   - blockers/risks.

## Acceptance Criteria

- Workflow status is surfaced via extension status payload/render path.
- Status updates occur when workflow state changes.
- Active workflow context is injected before agent execution.
- Behavior is validated by focused tests.
- Relevant tests pass and `npm run build` passes, or blockers are explicitly documented.

## Execution Instruction

`@sinfonica-coda` please read and execute this dispatch envelope and write your return envelope in this same session directory.
