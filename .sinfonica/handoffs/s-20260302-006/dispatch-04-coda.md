# Dispatch Envelope

- Session: `s-20260302-006`
- Workflow: `pi-surface-addition`
- Stage: `04-implementation-phase-4`
- Delegate: `@sinfonica-coda`
- Date: `2026-03-02`

## Objective

Implement Phase 4 from `Pi_Surface_Addition.md` by bridging Sinfonica enforcement rules to Pi tool-call interception in the extension.

## Inputs

- Development guide: `Pi_Surface_Addition.md` (Phase 4)
- Session tracker: `.sinfonica/handoffs/s-20260302-006/workflow.md`
- Prior approved return: `.sinfonica/handoffs/s-20260302-006/return-03-coda.md`
- Phase 3 utilities under `pi-sinfonica-extension/src/`

## Constraints

- Scope limited to Phase 4 only.
- Add enforcement modules under:
  - `pi-sinfonica-extension/src/enforcement/loader.ts`
  - `pi-sinfonica-extension/src/enforcement/checker.ts`
  - `pi-sinfonica-extension/src/enforcement/index.ts`
- Load and parse rules from `.sinfonica/enforcement/rules/`.
- Match tool calls against rule patterns and classify violations with severities:
  - `blocking`
  - `advisory`
  - `injection`
- Register tool-call interceptor (`tool_call`) to:
  - block execution on blocking violations,
  - inject context for injection rules,
  - notify user for advisory rules.
- Support rules reload path for `/sinfonica reload` behavior (or equivalent command handling for reload action).
- Add focused tests for loader/checker/interceptor behavior.
- Run validation commands and report outcomes.

## Expected Outputs

1. Enforcement bridge implementation under `pi-sinfonica-extension/src/enforcement/`.
2. Tests validating blocking/injection/advisory/reload behavior.
3. Return envelope in this session directory containing:
   - status (`approved` or `blocked`),
   - implementation summary,
   - artifacts list,
   - validation evidence (commands + outcomes),
   - blockers/risks.

## Acceptance Criteria

- Blocking rules prevent tool execution.
- Injection rules provide added context before tool runs.
- Advisory rules notify without blocking.
- Rules reload capability is implemented and tested.
- Relevant tests pass and `npm run build` passes, or blockers are explicitly documented.

## Execution Instruction

`@sinfonica-coda` please read and execute this dispatch envelope and write your return envelope in this same session directory.
