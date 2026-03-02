# Dispatch Envelope: Stage 01 -> @sinfonia-coda

## Session
- Session ID: `s-20260302-003`
- Stage: `01 - Test hardening implementation`
- Requested by: Developer via Maestro (new session)

## Task
Implement Rondo's follow-up test hardening from the prior session by expanding coordinator tests to assert that `orchestrationCue` is present and correctly structured across all relevant public coordinator API result paths.

Reference findings:
- `.sinfonia/handoffs/s-20260302-002/return-05-rondo.md`

Primary target file:
- `tests/workflow/coordinator.test.ts`

Supporting implementation context:
- `src/workflow/coordinator.ts`

## Required Scope
1. Add/extend tests so each relevant coordinator public return path verifies `result.orchestrationCue` includes required labels:
   - Stage status
   - Blockers (or explicit None)
   - Next action
   - Approval required
2. Keep this as a test-hardening slice; avoid behavior changes unless strictly necessary to make tests accurate.
3. Preserve existing orchestration semantics and non-blocking behavior.
4. Include a small Maestro prompt correction for subagent routing clarity:
   - In `agents/maestro.md` Subagent table (`When to spawn`), update the `sinfonia-metronome` row to align with Metronome's core role as context-management specialist (context pressure/compaction/memory recovery), not primary QA/test planning.
   - Keep routing intent consistent with Maestro handoff instructions and routing table.
   - If a generated stub mirror exists (`.opencode/agent/sinfonia-maestro.md`), keep it aligned.

## Constraints
1. Minimal, focused edits.
2. No unrelated refactors.
3. Run focused tests and full quality gates.

## Expected Output
Return envelope including:
1. Files changed and why.
2. Added assertions/coverage detail by API path.
3. Metronome routing wording correction implemented and aligned artifacts listed.
4. Validation evidence:
   - `npm test -- tests/workflow/coordinator.test.ts`
   - `npm run build`
   - `npm test`
5. Any blockers/open questions.

## Validation Checklist
- [ ] Coordinator tests assert `orchestrationCue` on relevant API result paths
- [ ] Maestro prompt routing row for `sinfonia-metronome` reflects context-management trigger semantics
- [ ] No regression in behavior semantics
- [ ] Focused tests pass
- [ ] Build and full test suite pass (or blocker documented)
