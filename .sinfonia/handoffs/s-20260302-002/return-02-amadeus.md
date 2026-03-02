---
handoff_id: h-s-20260302-002-return-02-amadeus
session_id: s-20260302-002
sequence: 2
source_persona: amadeus
target_persona: maestro
handoff_type: return
status: complete
created_at: 2026-03-02T06:51:18Z
word_count: 760
---

# Return Envelope: @sinfonia-amadeus -> @sinfonia-maestro

## Summary

Completed analysis-only architecture evaluation for making Maestro more friendly/conversational while preserving deterministic orchestration behavior.

I mapped current tone-control points to concrete modules, compared three implementation options (prompt-only, runtime response-layer, hybrid), and produced a recommendation with phased rollout and testable acceptance criteria.

### Key components controlling Maestro conversational behavior

1. **Primary voice source (highest leverage)**
   - `agents/maestro.md`: canonical persona text (`Identity`, `Comm Style`, `Activation Sequence`, `Menu`) that defines current terse/deterministic tone.
   - `.opencode/agent/sinfonia-maestro.md`: generated runtime stub consumed by the host; mirrors `agents/maestro.md` body.

2. **Persona propagation and customization boundaries**
   - `src/persona/stub-generator.ts`: inlines persona body into `.opencode/agent/*`; controls regeneration behavior and `customized` preservation.
   - `src/persona/loader.ts`: resolves framework vs `.sinfonia/agents` overrides (enables project-level tone customization).
   - `src/cli/init.ts`: generation lifecycle (`generatePersonaArtifacts`) and `--force` refresh semantics.

3. **Runtime guardrails that must remain invariant**
   - `src/workflow/coordinator.ts`: deterministic dispatch/approval/failure/resume flow; non-blocking state tracking; approval gate behavior.
   - `src/handoff/approval.ts`: approval/rejection contract and revision loop behavior.
   - `src/persona/delegation.ts`: delegation context contract (`Task`, `Context`, `Constraints`) and tracking side effects.

4. **Validation and compatibility gates for persona edits**
   - `src/validators/persona/sections.ts`: required section/order constraints for interactive persona structure.
   - `src/validators/persona/content.ts`: quality checks including `Critical Actions` and menu structure constraints.

5. **Evidence that deterministic behavior is contract-tested**
   - `tests/workflow/coordinator.test.ts`: approval progression, blocking, retry/skip/abort, resume semantics.
   - `tests/persona/stub-generator.test.ts` and `tests/cli/init.test.ts`: persona/stub generation and override/force-refresh behavior.

## Option Matrix

| Option | Touchpoints | UX improvement potential | Correctness/safety risk | Effort + test impact | Backward compatibility |
|---|---|---|---|---|---|
| A. Prompt/persona-instruction updates only | `agents/maestro.md` (+ regenerated `.opencode/agent/sinfonia-maestro.md`) | **Medium-High** for perceived friendliness, low latency to impact | **Low-Medium** (risk of drifting into verbosity/less crisp gating language) | **Low** code effort; update persona validation and snapshot-like tests | **High** if workflow semantics unchanged |
| B. Runtime response-layer changes only | New/updated formatter surfaces around coordinator outputs (likely `src/workflow/*` and possibly CLI wrappers) | **Medium** consistency; can enforce messaging templates independent of LLM style | **Medium-High** if formatting layer entangles with decision logic or state transitions | **Medium-High**; broader regression suite updates for orchestration outputs | **Medium** (new presentation contract may alter existing user expectations) |
| C. Hybrid (minimal persona updates + narrow runtime guardrails) | Persona updates + lightweight runtime “determinism-preserving response contract” checks | **High** (friendlier tone + preserved structure) | **Low-Medium** when runtime guardrails are read-only/presentation-only and non-authoritative | **Medium**; focused tests for both persona text and guardrail behavior | **High** if guardrails are additive/non-breaking |

## Recommendation

**Primary recommendation: Option C (Hybrid), implemented in two small reversible increments.**

Rationale:
- Option A alone improves tone quickly but relies entirely on prompt compliance; it has no deterministic safety net for response shape.
- Option B alone can enforce format consistency but may feel mechanical and requires larger invasive changes with higher orchestration regression risk.
- Option C gives best risk-adjusted outcome: preserve existing deterministic control plane (`coordinator`, approval gate, workflow index semantics) while adding friendliness at persona layer and narrowly constraining only presentation invariants that map to required behavior (stage confirmation, blocker surfacing, approval prompting, evidence references).

**Fallback recommendation:** start with Option A if delivery urgency is high, then add the minimal runtime guardrail subset from Option C only if tone drift or missed gating prompts are observed in acceptance testing.

## Proposed rollout (phased, deterministic-first)

1. **Phase 0 - Baseline (no behavior change)**
   - Capture current Maestro interaction transcripts for representative flows (normal progression, blocker path, rejection/revision path).
   - Define explicit response invariants: must mention stage status, blockers (or explicit none), next action options, and approval requirement where applicable.

2. **Phase 1 - Persona-only friendliness pass (reversible)**
   - Update `agents/maestro.md` `Comm Style` and `Activation Sequence` language to be warmer but still action-first.
   - Keep `Critical Actions` and gating directives unchanged in intent.
   - Regenerate stubs through existing init/generation path; preserve customization behavior.

3. **Phase 2 - Narrow runtime guardrails (optional but recommended)**
   - Introduce a lightweight response-structure helper (presentation-only) that checks or scaffolds mandatory orchestration cues without changing routing/state decisions.
   - Do not couple guardrail logic to workflow mutations; maintain current coordinator authority boundaries.

4. **Phase 3 - Validate and harden**
   - Run targeted tests for coordinator/approval + persona validation.
   - Execute scripted conversational acceptance scenarios to verify friendliness gain without regression in deterministic gating.

## Proposed acceptance criteria for implementation stage

1. Maestro responses include all required orchestration cues in stage-sensitive turns:
   - current stage status,
   - blockers (explicit list or explicit "None"),
   - clear next action,
   - approval prompt when stage gating requires it.
2. Approval/rejection and revision-loop behavior in `src/workflow/coordinator.ts` and `src/handoff/approval.ts` remains unchanged (existing tests pass).
3. Persona validation passes with updated Maestro content (`sinfonia validate` equivalent checks for section/content rules).
4. `init` and stub regeneration behavior remains backward-compatible, including `customized` preservation and `--force` semantics.
5. Conversational UX acceptance shows improved friendliness in at least three canonical scenarios (happy path, blocked path, rejected-return path) without losing deterministic sequencing.
6. Changes are reversible via persona rollback and optional guardrail toggle/removal without data migration.

## Blockers

None.

## Open Questions

1. Should friendliness be standardized only for Maestro, or for all interactive personas over time?
2. Should runtime guardrails be strict formatting enforcement or best-effort scaffolding with warnings only?
3. What is the preferred source of truth for conversational acceptance snapshots (docs fixture vs test fixtures)?

## Artifacts

- Created: `.sinfonia/handoffs/s-20260302-002/return-02-amadeus.md`

## Completion Assessment

Pass.

Rationale:
- Analysis references concrete repository modules and contracts.
- Required option comparison (prompt/runtime/hybrid) is complete with risk/effort/backward-compat evaluation.
- Recommendation includes primary + fallback path, phased rollout, and measurable acceptance criteria.
- No production code or runtime behavior changes were implemented.

## Recommendations

1. Approve Option C for a scoped implementation stage with Phase 1 first and Phase 2 behind an explicit acceptance gate.
2. Require unchanged coordinator/approval behavior as a non-negotiable regression gate in implementation PR criteria.
