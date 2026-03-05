# Dispatch Envelope

- Session: `s-20260302-008`
- Workflow: `multi-surface-adapter-migration-implementation`
- Stage: `post-remediation-test-unblock`
- Delegate: `@sinfonica-coda`
- Date: `2026-03-04`

## Objective

Resolve the unrelated failing test caused by persona-stub drift by aligning `.opencode/agent/sinfonica-maestro.md` with canonical `agents/maestro.md`, then re-run full validation.

## Inputs

- Remediation return: `.sinfonica/handoffs/s-20260302-008/return-08-coda-p6-remediation.md`
- Failing test reference: `tests/personas/maestro.test.ts`
- Source/canonical persona docs:
  - `agents/maestro.md`
  - `.opencode/agent/sinfonica-maestro.md`

## Constraints

- Scope limited to unblocking the failing persona-sync test.
- Do not introduce unrelated behavior changes.
- Preserve canonical persona wording consistency.
- Run full validation after fix:
  - `npm run build`
  - `npm test`

## Expected Outputs

1. Synced persona stub/canonical files so `tests/personas/maestro.test.ts` passes.
2. Return envelope with:
   - status (`approved` or `blocked`),
   - artifacts,
   - validation results,
   - residual blockers.

## Acceptance Criteria

- `tests/personas/maestro.test.ts` passes.
- `npm run build` and `npm test` pass.
- No unrelated file churn.

## Execution Instruction

`@sinfonica-coda` please read and execute this dispatch envelope and write your return envelope in this same session directory.
