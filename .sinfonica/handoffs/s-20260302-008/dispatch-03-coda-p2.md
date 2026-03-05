# Dispatch Envelope

- Session: `s-20260302-008`
- Workflow: `multi-surface-adapter-migration-implementation`
- Stage: `P2-core-vs-adapter-boundary-enforcement`
- Delegate: `@sinfonica-coda`
- Date: `2026-03-03`

## Objective

Execute P2 from the approved migration plan: enforce core-vs-adapter ownership boundaries, relocate host-specific OpenCode concerns to `surfaces/opencode/` where applicable, and validate objective boundary checks (`C5..C7`).

## Inputs

- Approved plan: `.sinfonica/handoffs/s-20260302-007/plan-02-libretto-revision.md`
- P1 return and notes:
  - `.sinfonica/handoffs/s-20260302-008/return-02-coda-p1.md`
  - `docs/operations/p1-repository-migration-notes.md`
- Session tracker: `.sinfonica/handoffs/s-20260302-008/workflow.md`

## Constraints

- Scope limited to P2 only (do not start P3 contract hardening).
- Produce/maintain explicit boundary matrix evidence mapping paths to owners.
- Move or isolate host-specific OpenCode glue into `surfaces/opencode/` where feasible without behavior regression.
- Keep core orchestration logic surface-agnostic.
- Preserve behavior parity; avoid feature expansion.
- Run and report P2 checks:
  - `C5` host keyword scan/allowlist in core paths,
  - `C6` boundary ownership matrix completeness,
  - `C7` adapter import usage through approved contracts/CLI APIs.

## Expected Outputs

1. P2 implementation and boundary evidence artifacts.
2. Updated/added docs or notes needed to explain ownership allowlists.
3. Return envelope with:
   - status (`approved` or `blocked`),
   - `C5..C7` outcomes,
   - artifacts list,
   - validation command results,
   - blockers/risks,
   - recommended next action.

## Acceptance Criteria

- Boundary ownership is explicit and auditable.
- Host-specific OpenCode concerns are adapter-owned or clearly allowlisted.
- `C5..C7` checks are objective and pass with evidence.
- Build/tests remain green.

## Execution Instruction

`@sinfonica-coda` please read and execute this dispatch envelope and write your return envelope in this same session directory.
