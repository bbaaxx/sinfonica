# Dispatch Envelope: Technical Spec for Per-Workflow Phase Maps

## Task
Author the technical specification for **Item #4: Per-Workflow Phase Maps** for the Pi surface extension.

## Stage Context
- Session: `s-20260306-001`
- Current stage: 2/4 (Technical Spec)
- Upstream approved artifact: `.sinfonica/handoffs/s-20260306-001/prd-per-workflow-phase-maps.md`

## Objective
Translate the PRD into an implementation-ready spec with explicit module-level changes, schema definitions, data flow, validation/error behavior, and test plan.

## Inputs to Use
1. PRD: `.sinfonica/handoffs/s-20260306-001/prd-per-workflow-phase-maps.md`
2. Current phase tooling: `surfaces/pi/src/orchestration/phase-tools.ts`
3. Policy engine: `surfaces/pi/src/orchestration/policy.ts`
4. Workflow state reader: `surfaces/pi/src/workflow-state.ts`
5. Pi extension integration: `surfaces/pi/index.ts`
6. Workflow loader behavior reference: `src/workflow/step-engine.ts`

## Non-Negotiable Constraints
- Modify only Pi surface files under `surfaces/pi/` for implementation scope.
- Preserve backward compatibility for workflows without `phase_tool_map`.
- Keep tool pattern behavior consistent with current matcher semantics unless explicitly changed and justified.
- Support both workflow locations that are already used by the extension ecosystem where relevant (`.sinfonica/workflows` and fallback handling already present in Pi layer).

## Required Spec Content

1. **Schema and Types**
   - Define canonical `phase_tool_map` shape and whether it is full map or partial override.
   - Define validation strategy (TypeBox-compatible and/or runtime validation path).
   - Specify final TypeScript types for:
     - Full `PhaseToolMap`
     - Partial override input (if applicable)
     - Error/result shape for invalid configuration handling

2. **Module-Level Change Plan**
   - `surfaces/pi/src/orchestration/phase-tools.ts`
     - New/updated APIs for loading and merging per-workflow phase maps
     - Caching behavior and invalidation hook
   - `surfaces/pi/src/orchestration/policy.ts`
     - Signature changes and propagation of map selection
   - `surfaces/pi/src/workflow-state.ts`
     - How active workflow state provides map or metadata needed to resolve it
   - `surfaces/pi/index.ts`
     - Event-path wiring for `tool_call` and command-path behavior (`/sinfonica reload` cache invalidation)

3. **Data Flow**
   - End-to-end path: active workflow -> phase map resolution -> policy evaluation -> allow/block decision.
   - Explicit fallback behavior when map is absent, unreadable, or invalid.

4. **Error Handling and Safety Rules**
   - Actionable warning/error messaging requirements.
   - Fail-open vs fail-closed behavior (must be explicit and justified).
   - Ensure `sinfonica_*` bypass remains intact.

5. **Testing Strategy**
   - Detailed test matrix for unit + integration-level coverage in Pi tests.
   - Include backward-compatibility and cache invalidation scenarios.
   - Include at least one negative-path test for invalid `phase_tool_map`.

6. **Implementation Sequencing**
   - Ordered task list Coda can execute directly with minimal ambiguity.

## Expected Outputs
1. Technical spec artifact at:
   - `.sinfonica/handoffs/s-20260306-001/spec-per-workflow-phase-maps.md`
2. Return envelope at:
   - `.sinfonica/handoffs/s-20260306-001/return-02-amadeus.md`

Return envelope must include:
- Completion status
- Spec artifact path
- Any unresolved questions/risks
- Recommendation for implementation dispatch scope to Coda
