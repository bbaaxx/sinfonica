# Dispatch Envelope

- Session: `s-20260302-008`
- Workflow: `multi-surface-adapter-migration-implementation`
- Stage: `P3-contract-hardening-and-compatibility`
- Delegate: `@sinfonica-coda`
- Date: `2026-03-03`

## Objective

Execute P3 from the approved migration plan: harden shared adapter contracts, normalize payload/error semantics across adapters, and add compatibility coverage with objective checks (`C8..C10`).

## Inputs

- Approved plan: `.sinfonica/handoffs/s-20260302-007/plan-02-libretto-revision.md`
- P2 baseline:
  - `.sinfonica/handoffs/s-20260302-008/return-03-coda-p2.md`
  - `docs/operations/p2-boundary-matrix.json`
  - `docs/operations/p2-boundary-enforcement-notes.md`
- Session tracker: `.sinfonica/handoffs/s-20260302-008/workflow.md`

## Constraints

- Scope limited to P3 only (do not execute P4 CI/release matrix work yet).
- Implement/locate shared contract surface and ensure adapter conformance.
- Normalize result/error schema behavior for required operation classes:
  - workflow start,
  - step advance,
  - status/reporting.
- Add compatibility tests and drift-detection checks as defined by plan.
- Preserve current runtime behavior unless change is required for schema conformance.
- Run and report P3 checks:
  - `C8` contract tests pass for `surfaces/pi` and `surfaces/opencode`,
  - `C9` assertion coverage for required operation payload shapes,
  - `C10` drift detection/negative control evidence.

## Expected Outputs

1. P3 implementation artifacts for contract normalization and compatibility tests.
2. Evidence for `C8..C10` with command outputs and explicit pass/fail.
3. Return envelope with:
   - status (`approved` or `blocked`),
   - `C8..C10` outcomes,
   - artifacts list,
   - validation command results,
   - blockers/risks,
   - recommended next action.

## Acceptance Criteria

- Shared contract artifact exists and is consumed by both adapters.
- Required operation payload/error assertions are covered and passing.
- Drift-detection control is present and evidence-backed.
- Build/tests pass with no regressions.

## Execution Instruction

`@sinfonica-coda` please read and execute this dispatch envelope and write your return envelope in this same session directory.
