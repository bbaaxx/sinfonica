# Dispatch Envelope

- Session: `s-20260302-004`
- Workflow: `code-review`
- Stage: `07-review`
- Delegate: `@sinfonia-rondo`
- Date: `2026-03-02`

## Objective

Review implementation changes for compliance with approved PRD/spec contracts, code quality, and test coverage expectations.

## Inputs

- PRD: `.sinfonia/handoffs/s-20260302-004/prd-final.md`
- Spec: `.sinfonia/handoffs/s-20260302-004/spec-final.md`
- Implementation return: `.sinfonia/handoffs/s-20260302-004/return-06-coda.md`

## Review Scope

- Validate implemented Units A-D against spec Section 7 sequencing.
- Verify contract stability for workflow IDs, handoff keys, and rule IDs.
- Assess test adequacy for new/changed behavior.
- Flag regressions, risks, and severity-rated findings.

## Constraints

- Perform a structured review only; do not author feature code.
- Ground findings in repository evidence.
- Provide severity and rationale for each issue.

## Expected Outputs

1. Return envelope containing:
   - review summary,
   - findings list with severity,
   - approve/revise verdict,
   - any mandatory remediation before finalization.

## Acceptance Criteria

- Review covers correctness, contract safety, and validation evidence.
- Findings are actionable and severity-ranked.
- Verdict is explicit: `approve` or `revise`.

## Execution Instruction

`@sinfonia-rondo` please read and execute this dispatch envelope and write your return envelope in this same session directory.
