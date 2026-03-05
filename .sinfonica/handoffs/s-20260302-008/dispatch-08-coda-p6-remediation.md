# Dispatch Envelope

- Session: `s-20260302-008`
- Workflow: `multi-surface-adapter-migration-implementation`
- Stage: `P6-release-blocker-remediation`
- Delegate: `@sinfonica-coda`
- Date: `2026-03-04`

## Objective

Remediate the two release blockers identified by full review (`review-07-rondo-full.md`) and produce evidence that commit/release prep is safe.

## Inputs

- Review report: `.sinfonica/handoffs/s-20260302-008/review-07-rondo-full.md`
- Review return: `.sinfonica/handoffs/s-20260302-008/return-07-rondo-full-review.md`
- Session tracker: `.sinfonica/handoffs/s-20260302-008/workflow.md`

## Required Remediations

1. **Root entrypoint/build-output alignment (Critical)**
   - Align `package.json` (`main`, `types`, `bin`) with actual emitted files from clean build output.
   - Add deterministic release gate check that fails if declared entrypoints are missing after clean build.

2. **Adapter package self-containment (High)**
   - Remove adapter cross-import reliance on root-only contract files that are not packaged.
   - Ensure `surfaces/pi` and `surfaces/opencode` can resolve contract dependency in packed/install context.
   - Extend smoke checks to include post-install import/runtime verification (not install-only).

## Constraints

- Scope limited to blocker remediation only.
- Preserve behavior parity outside required packaging/runtime safety fixes.
- Add or update tests/checks to prevent regressions for both issues.
- Run full validation and explicit blocker-focused checks.

## Expected Outputs

1. Code/test/script/doc updates that address both blockers.
2. Evidence artifacts/command outputs proving:
   - clean build emits declared entrypoints,
   - packed adapters are self-contained and post-install import/runtime checks pass.
3. Return envelope with:
   - status (`approved` or `blocked`),
   - remediation mapping (blocker -> fix),
   - artifacts,
   - validation results,
   - residual risks/blockers.

## Acceptance Criteria

- Critical and high findings from `review-07-rondo-full.md` are fully remediated.
- `npm run build` and `npm test` pass.
- New release-safety checks pass and are reproducible.

## Execution Instruction

`@sinfonica-coda` please read and execute this dispatch envelope and write your return envelope in this same session directory.
