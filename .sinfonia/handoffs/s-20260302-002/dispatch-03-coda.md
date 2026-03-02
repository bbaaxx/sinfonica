# Dispatch Envelope: Stage 02 -> @sinfonia-coda

## Session
- Session ID: `s-20260302-002`
- Stage: `02 - Implementation (Option C)`
- Requested by: Developer via Maestro (`AR approved`, Option C selected)

## Task
Implement the approved **Option C (hybrid)** to make Maestro more friendly and conversational while preserving deterministic orchestration behavior.

Use the evaluation return at `.sinfonia/handoffs/s-20260302-002/return-02-amadeus.md` as design input.

## Required Implementation Scope
1. **Phase 1 (required):** Update Maestro persona tone guidance to be warmer and more conversational without weakening orchestration obligations.
   - Primary source: `agents/maestro.md`
   - Keep mandatory sequencing/gating requirements intact.
2. **Phase 2 (required, minimal):** Add a narrow, presentation-only guardrail for required orchestration cues where appropriate in runtime behavior.
   - Guardrail must not mutate workflow decision logic/state transitions.
   - Preserve existing coordinator authority boundaries and non-blocking delegation behavior.
3. Regenerate or align generated persona artifacts if repository conventions require it (e.g., `.opencode/agent/sinfonia-maestro.md`).
4. Add/update tests to verify:
   - Friendlier Maestro guidance is present and valid.
   - Deterministic orchestration behavior remains unchanged.
   - Required response cues are preserved by guardrails.

## Hard Constraints
1. Do not alter core workflow semantics in `src/workflow/coordinator.ts` and approval contracts in `src/handoff/approval.ts` beyond presentation-only additions.
2. Preserve safety-critical directives: stage confirmation, blocker surfacing, approval gating, evidence-based progression.
3. Keep changes minimal and reversible.
4. Maintain persona validation compatibility.

## Expected Output
Return envelope with:
1. Files changed and rationale for each.
2. How Option C was implemented (persona + runtime guardrail).
3. Test evidence (commands run and pass/fail outcomes).
4. Any open risks, assumptions, or follow-up recommendations.

## Validation Checklist
- [ ] `agents/maestro.md` updated with warmer conversational style while retaining orchestration rigor
- [ ] Any generated/runtime persona artifact updates are consistent
- [ ] Guardrail is presentation-only and does not alter workflow state logic
- [ ] Relevant tests updated/added and passing
- [ ] `npm run build` and `npm test` executed (or blocker explicitly documented)
