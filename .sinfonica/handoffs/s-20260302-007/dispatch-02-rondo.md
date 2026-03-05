# Dispatch Envelope

- Session: `s-20260302-007`
- Workflow: `multi-surface-migration-planning`
- Stage: `02-review`
- Delegate: `@sinfonica-rondo`
- Date: `2026-03-02`

## Objective

Review the migration execution plan for feasibility, sequencing safety, risk controls, and implementation readiness.

## Inputs

- Plan artifact: `.sinfonica/handoffs/s-20260302-007/plan-01-libretto.md`
- Planning return: `.sinfonica/handoffs/s-20260302-007/return-01-libretto.md`
- Session tracker: `.sinfonica/handoffs/s-20260302-007/workflow.md`

## Constraints

- Review-only; do not implement code.
- Evaluate phase order, dependencies, acceptance criteria, and rollback quality.
- Identify ambiguities or missing safeguards that would block execution.
- Provide severity-rated findings and explicit approve/revise verdict.

## Expected Outputs

1. Review report artifact in this session directory (suggested: `review-02-rondo.md`).
2. Return envelope with:
   - verdict (`approved` or `revise`),
   - findings with severity,
   - actionable revision guidance (if needed),
   - blockers (if any).

## Acceptance Criteria

- Review confirms whether plan is executable as-is.
- All material gaps are explicitly identified and prioritized.
- Final verdict is clear enough to gate progression to execution prep.

## Execution Instruction

`@sinfonica-rondo` please read and execute this dispatch envelope and write your return envelope in this same session directory.
