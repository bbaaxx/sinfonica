# Dispatch Envelope

- Session: `s-20260302-008`
- Workflow: `multi-surface-adapter-migration-implementation`
- Stage: `P4-release-gates-and-validation-matrix`
- Delegate: `@sinfonica-coda`
- Date: `2026-03-03`

## Objective

Execute P4 from the approved migration plan: establish/validate release gates and matrix checks for core + adapters, including failure isolation evidence and install smoke checks.

## Inputs

- Approved plan: `.sinfonica/handoffs/s-20260302-007/plan-02-libretto-revision.md`
- P3 return and notes:
  - `.sinfonica/handoffs/s-20260302-008/return-04-coda-p3.md`
  - `docs/operations/p3-contract-compatibility-notes.md`
- Session tracker: `.sinfonica/handoffs/s-20260302-008/workflow.md`

## Constraints

- Scope limited to P4 only (do not execute P5 cutover/docs finalization yet).
- Implement or document reproducible validation matrix checks for:
  - core,
  - `surfaces/pi`,
  - `surfaces/opencode`.
- Demonstrate failure isolation behavior (`C12`) in an objective, auditable way.
- Add/execute adapter install smoke checks with captured outputs (`C13`).
- Keep changes minimal and aligned with existing build/test scripts.

## Expected Outputs

1. P4 artifacts for release/matrix validation (scripts/docs/tests as appropriate).
2. Evidence for checks:
   - `C11` matrix status separation,
   - `C12` failure isolation demonstration,
   - `C13` install smoke checks.
3. Return envelope with:
   - status (`approved` or `blocked`),
   - `C11..C13` outcomes,
   - artifacts list,
   - validation command results,
   - blockers/risks,
   - recommended next action.

## Acceptance Criteria

- Matrix covers core + both adapters with distinct status reporting.
- Failure isolation proof is explicit and repeatable.
- Install smoke checks are documented and pass.
- Build/tests remain green.

## Execution Instruction

`@sinfonica-coda` please read and execute this dispatch envelope and write your return envelope in this same session directory.
