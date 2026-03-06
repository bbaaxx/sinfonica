---
handoff_id: r-20260306-coda-003
session_id: s-20260306-001
sequence: 4
source_persona: coda
target_persona: maestro
handoff_type: return
status: complete
created_at: 2026-03-06T12:35:00Z
word_count: ~800
---

# Return Envelope: Implementation of Per-Workflow Phase Maps

## Summary

Successfully implemented **Item #4: Per-Workflow Phase Maps** following the approved technical spec.

### Implementation Delivered

1. **`surfaces/pi/src/orchestration/phase-tools.ts`** — Extended with:
   - New types: `PhaseToolMapOverride`, `PhaseToolMapLoadResult`, `PhaseToolMapConfigError`, `PhaseToolMapSource`
   - `loadPhaseToolMap(cwd, workflowId)` — Loads per-workflow phase map with validation and caching
   - `mergePhaseToolMapOverride(base, override)` — Merges partial overrides with defaults
   - `clearPhaseToolMapCache()` — Cache invalidation for reload
   - Frontmatter parser for `phase_tool_map` YAML block
   - Two-layer validation (shape + semantic) with actionable error codes (PTM-001 through PTM-006)

2. **`surfaces/pi/src/orchestration/policy.ts`** — Extended:
   - `evaluateToolCall` now accepts optional `phaseToolMap` parameter
   - Backward compatible: defaults to `DEFAULT_PHASE_TOOL_MAP` when not provided

3. **`surfaces/pi/src/workflow-state.ts`** — Extended:
   - `WorkflowState` type includes optional `phaseToolMap`, `phaseToolMapSource`, `phaseToolMapWarnings`
   - `readWorkflowState` accepts optional `{ workflowId, includePhaseToolMap }` options

4. **`surfaces/pi/index.ts`** — Wired:
   - `readActiveState` loads phase map for active workflow
   - `tool_call` handler passes phase map to `evaluateToolCall`
   - `/sinfonica reload` clears phase map cache
   - Warning deduplication for invalid config scenarios

5. **Tests** — `surfaces/pi/tests/phase7-policy-gating.test.ts`:
   - 54 tests total (all passing)
   - Coverage for: loader, validation, merge, cache, policy evaluation, event handlers, reload invalidation

## Files Changed

| File | Changes |
|------|---------|
| `surfaces/pi/src/orchestration/phase-tools.ts` | +471 lines (new types, loader, validator, cache) |
| `surfaces/pi/src/orchestration/policy.ts` | +10 lines (optional phaseToolMap param) |
| `surfaces/pi/src/workflow-state.ts` | +46 lines (optional map hydration) |
| `surfaces/pi/index.ts` | +37 lines (wiring + reload) |
| `surfaces/pi/tests/phase7-policy-gating.test.ts` | +534 lines (test coverage) |

## Validation Gates

| Command | Result |
|---------|--------|
| `npm run build` | ✅ Pass |
| `npm test -- surfaces/pi/tests/phase7-policy-gating.test.ts` | ✅ 54/54 pass |
| `npm test` | ✅ 619/619 pass |

## Deviations from Spec

None. Implementation follows the approved spec exactly.

## Residual Risks / Blockers

**None.** All acceptance criteria from the PRD and spec are met.

## Recommendations for Review

1. Verify cache invalidation behavior in `/sinfonica reload` path
2. Confirm warning deduplication works as expected in multi-tool-call scenarios
3. Test with real Pi runtime for end-to-end validation
