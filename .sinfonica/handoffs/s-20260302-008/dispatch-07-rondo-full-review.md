# Dispatch Envelope

- Session: `s-20260302-008`
- Workflow: `multi-surface-adapter-migration-implementation`
- Stage: `post-cycle-full-review`
- Delegate: `@sinfonica-rondo`
- Date: `2026-03-03`

## Objective

Perform a full code-and-doc review across completed P0-P5 migration changes and produce an approve/revise verdict with severity-ranked findings.

## Inputs

- Workflow tracker: `.sinfonica/handoffs/s-20260302-008/workflow.md`
- Consolidated changelog: `.sinfonica/handoffs/s-20260302-008/consolidated-changelog.md`
- Commit staging plan: `.sinfonica/handoffs/s-20260302-008/commit-ready-staging-plan.md`
- Phase returns:
  - `.sinfonica/handoffs/s-20260302-008/return-01-coda-p0.md`
  - `.sinfonica/handoffs/s-20260302-008/return-02-coda-p1.md`
  - `.sinfonica/handoffs/s-20260302-008/return-03-coda-p2.md`
  - `.sinfonica/handoffs/s-20260302-008/return-04-coda-p3.md`
  - `.sinfonica/handoffs/s-20260302-008/return-05-coda-p4.md`
  - `.sinfonica/handoffs/s-20260302-008/return-06-coda-p5.md`

## Constraints

- Review-only; do not modify code.
- Focus on correctness, boundary integrity, contract safety, test quality, and release readiness.
- Evaluate risk of regressions introduced by structural path migration.
- Provide concise, actionable findings with severity and confidence.

## Expected Outputs

1. Review report artifact in this session directory (suggested: `review-07-rondo-full.md`).
2. Return envelope with:
   - verdict (`approved` or `revise`),
   - findings (severity-ranked),
   - blockers (if any),
   - recommended remediation or next action.

## Acceptance Criteria

- Verdict clearly gates whether commit/release prep can proceed.
- Findings are evidence-backed and actionable.
- If approved, include explicit readiness statement for commit execution.

## Execution Instruction

`@sinfonica-rondo` please read and execute this dispatch envelope and write your return envelope in this same session directory.
