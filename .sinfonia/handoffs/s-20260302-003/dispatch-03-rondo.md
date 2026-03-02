# Dispatch Envelope: Stage 02 -> @sinfonia-rondo

## Session
- Session ID: `s-20260302-003`
- Stage: `02 - Code review and quality gate`
- Requested by: Developer via Maestro (`AR`)

## Task
Review the implementation from Stage 01 for correctness, scope compliance, and regression risk.

Primary evidence:
- `.sinfonia/handoffs/s-20260302-003/return-02-coda.md`

Changed artifacts to review:
- `tests/workflow/coordinator.test.ts`
- `agents/maestro.md`
- `.opencode/agent/sinfonia-maestro.md`

## Review Focus
1. Verify coordinator cue assertions were added across relevant public API result paths.
2. Confirm Metronome routing text now aligns with context-management semantics.
3. Confirm no runtime behavior changes were introduced beyond test hardening and wording correction.
4. Validate reported build and test evidence.

## Constraints
1. Review-only stage: no code edits.
2. Provide evidence-backed findings with severity.
3. Return explicit verdict: `approve` or `revise`.

## Expected Output
Return envelope with:
1. Findings with file references and severity.
2. Scope/acceptance assessment.
3. Final verdict.
4. Any recommendations.

## Validation Checklist
- [ ] All changed files reviewed
- [ ] Runtime behavior safety confirmed
- [ ] Test/build evidence verified
- [ ] Final verdict provided
