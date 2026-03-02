# Revision Dispatch Envelope

- Session: `s-20260302-004`
- Workflow: `dev-story` (revision)
- Stage: `09-implementation-revision`
- Delegate: `@sinfonia-coda`
- Date: `2026-03-02`

## Objective

Remediate blocking review findings from `@sinfonia-rondo` and return a validator-clean implementation handoff.

## Inputs

- Review return: `.sinfonia/handoffs/s-20260302-004/return-08-rondo.md`
- Invalid implementation return to fix: `.sinfonia/handoffs/s-20260302-004/return-06-coda.md`

## Mandatory Fixes

1. Correct `.sinfonia/handoffs/s-20260302-004/return-06-coda.md` so it passes handoff validation.
2. Ensure frontmatter fields conform to validator expectations, including:
   - `handoff_id`
   - `session_id`
   - `status`
   - `word_count`
3. Re-run quality gates after fix:
   - `npm run build`
   - `npm test`

## Optional Improvement (Non-blocking)

- Add/adjust Unit C metrics tests to cover missing `run_outcome` states (`blocked`, `failed`) and `skip` action assertions if feasible within focused scope.

## Expected Outputs

1. Corrected implementation return envelope (same path or superseding corrected envelope).
2. New revision return envelope summarizing changes and validation evidence.
3. Explicit approve/revise recommendation for re-review.

## Acceptance Criteria

- Implementation handoff envelope validates with zero errors.
- Build and full tests pass.
- Revision return clearly references remediated findings.

## Execution Instruction

`@sinfonia-coda` please execute this revision dispatch and write your return envelope in this same session directory.
