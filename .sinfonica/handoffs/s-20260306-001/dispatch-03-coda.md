# Dispatch Envelope: Implementation for Per-Workflow Phase Maps

## Task
Implement **Item #4: Per-Workflow Phase Maps** in the Pi surface, following the approved technical spec.

## Session Context
- Session: `s-20260306-001`
- Stage: 3/4 (Implementation)
- Approved PRD: `.sinfonica/handoffs/s-20260306-001/prd-per-workflow-phase-maps.md`
- Approved Spec: `.sinfonica/handoffs/s-20260306-001/spec-per-workflow-phase-maps.md`

## Scope Constraints (must follow)
- Modify only Pi surface files under `surfaces/pi/`.
- Do not modify core modules under `src/`.
- Preserve backward compatibility when `phase_tool_map` is absent.
- Keep existing matcher behavior semantics unchanged.

## Required Implementation Targets
1. `surfaces/pi/src/orchestration/phase-tools.ts`
   - Add per-workflow map loading API
   - Add partial override merge behavior with defaults
   - Add validation + error/warning handling
   - Add cache keyed by cwd + workflowId
   - Add cache invalidation API

2. `surfaces/pi/src/orchestration/policy.ts`
   - Extend `evaluateToolCall` to accept optional per-workflow `phaseToolMap`
   - Preserve existing behavior when no map provided

3. `surfaces/pi/src/workflow-state.ts`
   - Extend state typing for optional phase map metadata
   - Add optional map hydration path (workflowId + include flag)

4. `surfaces/pi/index.ts`
   - Wire phase-map loading into active state resolution
   - Pass map into policy evaluation in `tool_call`
   - Clear phase-map cache on `/sinfonica reload`
   - Ensure warning behavior is controlled (no spam)

5. Tests
   - Update/add tests per approved spec matrix
   - Cover valid override, partial merge, invalid config fallback, cache hit/invalidation, policy evaluation with custom map, and backward compatibility

## Execution Requirements
- Use TDD discipline where practical.
- Run focused Pi tests while iterating.
- Run final validation gates:
  - `npm run build`
  - `npm test -- surfaces/pi/tests/phase7-policy-gating.test.ts` (or split equivalent)
  - `npm test`

## Expected Outputs
1. Code and test changes committed to working tree (do not create git commit unless instructed by Maestro).
2. Return envelope at `.sinfonica/handoffs/s-20260306-001/return-03-coda.md` containing:
   - Completion status
   - Files changed
   - Test commands run + results
   - Any deviations from spec and why
   - Residual risks/blockers (if any)
