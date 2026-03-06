---
handoff_id: r-20260306-amadeus-002
session_id: s-20260306-001
sequence: 3
source_persona: amadeus
target_persona: maestro
handoff_type: return
status: complete
created_at: 2026-03-06T17:53:23Z
word_count: ~1500
---

# Return Envelope: Technical Spec for Per-Workflow Phase Maps

## Summary

Completed an implementation-ready technical specification for PRD Item #4 (Per-Workflow Phase Maps) focused on Pi surface files only.

Spec includes:
- explicit module-level change plan for `phase-tools.ts`, `policy.ts`, `workflow-state.ts`, and `index.ts`
- concrete type/interface contracts and error/result model
- validation strategy (TypeBox-compatible shape + semantic validation)
- end-to-end data flow and fallback matrix
- explicit safety behavior and backward compatibility guarantees
- ordered implementation sequence and test matrix for Coda

## Artifacts

- `.sinfonica/handoffs/s-20260306-001/spec-per-workflow-phase-maps.md` (created)
- `.sinfonica/handoffs/s-20260306-001/return-02-amadeus.md` (created)

## Completion Assessment

**PASS**

Rationale:
- All required dispatch sections are addressed with concrete interfaces and sequencing.
- Non-negotiable constraints are preserved (Pi-only scope, backward compatibility, matcher behavior stability, dual workflow location support).
- Safety behavior is explicit and testable (fallback-to-default with warnings, not allow-all).
- Test matrix covers unit, integration, regression, negative paths, and cache invalidation.

## Blockers

None.

## Unresolved Decisions / Risks

1. Parser implementation detail for nested `phase_tool_map` in workflow definition markdown:
   - Recommendation: implement a constrained parser for this exact shape in Pi layer and pair with strict validation + error codes.
   - Alternative (not recommended for this scope): add external YAML dependency.

## Recommendations

1. Dispatch Coda to implement exactly per sequence in the spec, starting with `phase-tools.ts` contracts and loader cache.
2. Keep warning dedupe behavior explicit in `index.ts` to prevent per-tool-call UI spam.
3. Require focused test run for Pi policy suite before full repository test pass.

## Recommended Coda Dispatch Scope

- Implement module updates only in:
  - `surfaces/pi/src/orchestration/phase-tools.ts`
  - `surfaces/pi/src/orchestration/policy.ts`
  - `surfaces/pi/src/workflow-state.ts`
  - `surfaces/pi/index.ts`
  - `surfaces/pi/tests/phase7-policy-gating.test.ts` (and optional split test file)
- Do not modify core `src/` modules.
