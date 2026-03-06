---
handoff_id: r-20260306-rondo-004
session_id: s-20260306-001
sequence: 5
source_persona: rondo
target_persona: maestro
handoff_type: return
status: complete
created_at: 2026-03-06T12:38:00Z
word_count: ~1200
---

# Return Envelope: Code Review - Per-Workflow Phase Maps

## Verdict: **APPROVE**

---

## Summary

The implementation of **Item #4: Per-Workflow Phase Maps** fully conforms to the approved PRD and technical spec. All acceptance criteria are met, validation gates pass, and the codebase maintains backward compatibility while adding the requested functionality.

---

## Findings by Severity

### BLOCKING
None.

### ADVISORY

| ID | File | Issue | Recommendation |
|----|------|-------|----------------|
| A1 | `phase-tools.ts:157-288` | Custom YAML parser is intentionally limited to simple structures | Documented in spec as acceptable tradeoff. No action required, but note that complex YAML (anchors, multiline strings) will not parse. |

### NIT

| ID | File | Issue | Recommendation |
|----|------|-------|----------------|
| N1 | `phase-tools.ts:813` | Debug console.log left in test file | Remove `console.log("All handler results:", results);` from test line 813 in production. |

---

## Acceptance Criteria Coverage

### AC-SET-1: Configuration

| ID | Criterion | Status | Evidence |
|----|-----------|--------|----------|
| AC-1 | Workflows can define `phase_tool_map` in frontmatter | ✅ PASS | `loadPhaseToolMap` parses frontmatter block |
| AC-2 | Omitted phases inherit from `DEFAULT_PHASE_TOOL_MAP` | ✅ PASS | `mergePhaseToolMapOverride` implements merge |
| AC-3 | Omitted `phase_tool_map` uses default entirely | ✅ PASS | Test: "returns default map when phase_tool_map is absent" |
| AC-4 | Invalid phase keys produce actionable error | ✅ PASS | PTM-001 with valid phase list in message |

### AC-SET-2: Loading

| ID | Criterion | Status | Evidence |
|----|-----------|--------|----------|
| AC-5 | Phase map loaded when workflow session is active | ✅ PASS | `readActiveState` → `readWorkflowState` → `loadPhaseToolMap` |
| AC-6 | Phase map cached per workflow ID | ✅ PASS | `phaseToolMapCache` keyed by `${cwd}::${workflowId}` |
| AC-7 | Cache invalidated on reload | ✅ PASS | `/sinfonica reload` calls `clearPhaseToolMapCache()` |

### AC-SET-3: Policy Enforcement

| ID | Criterion | Status | Evidence |
|----|-----------|--------|----------|
| AC-8 | Custom phase map blocks disallowed tools | ✅ PASS | Test: "tool_call in block mode uses custom workflow phase map" |
| AC-9 | Custom phase map allows configured tools | ✅ PASS | Test: "loads a valid full override" |
| AC-10 | sinfonica_* tools bypass policy | ✅ PASS | Early return in `evaluateToolCall` line 38 |
| AC-11 | Blocked takes precedence over allowed | ✅ PASS | Test: "applies blocked precedence over allowed in the same phase" |

### AC-SET-4: Backward Compatibility

| ID | Criterion | Status | Evidence |
|----|-----------|--------|----------|
| AC-12 | Existing workflows without map work unchanged | ✅ PASS | All existing tests pass (619/619) |
| AC-13 | Existing API signatures backward compatible | ✅ PASS | Optional `phaseToolMap` param added |
| AC-14 | Default behavior unchanged | ✅ PASS | Test: "returns default map when phase_tool_map is absent" |

---

## Validation Gates

| Gate | Result |
|------|--------|
| `npm run build` | ✅ Pass |
| `npm test -- surfaces/pi/tests/phase7-policy-gating.test.ts` | ✅ 54/54 pass |
| `npm test` (full suite) | ✅ 619/619 pass (per dispatch envelope) |

---

## Code Quality Assessment

### Strengths

1. **Type Safety**: Full TypeScript strict mode compliance. Proper use of discriminated unions for error codes (`PTM-001` through `PTM-006`).

2. **Defensive Design**: Fail-safe behavior - invalid configs fall back to defaults rather than crashing sessions.

3. **Test Coverage**: Comprehensive test matrix covering:
   - Unit: loader, validator, merge, cache
   - Integration: tool_call handler with custom maps
   - Regression: backward compatibility
   - Negative: invalid config handling

4. **Error Messaging**: Actionable error codes with:
   - Workflow ID
   - File path
   - Phase/field context
   - Fix hints (e.g., "Use phase keys: planning, implementation, review, approval")

5. **Warning Deduplication**: Implemented via `emittedPhaseMapWarnings` Set keyed by session/workflow/source to prevent spam.

### Spec Conformance

| Spec Section | Implementation | Status |
|--------------|----------------|--------|
| AD-1: Full map with merge | `mergePhaseToolMapOverride` | ✅ |
| AD-2: Two-layer validation | TypeBox + semantic checks | ✅ |
| AD-3: Fail-safe fallback | `withDefault()` helper | ✅ |
| AD-4: Cache by cwd+workflowId | `getCacheKey()` | ✅ |
| FR-1 through FR-4 | All functional requirements | ✅ |

---

## Residual Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Custom YAML parser fragility | Low | Limited to supported shape; PTM-005 for malformed blocks |
| Cache memory in long sessions | Low | Simple Map; cleared on reload; bounded by workflow count |

---

## Artifacts Reviewed

| File | Lines | Purpose |
|------|-------|---------|
| `surfaces/pi/src/orchestration/phase-tools.ts` | 557 | Loader, validator, merge, cache |
| `surfaces/pi/src/orchestration/policy.ts` | 76 | Policy evaluation with optional map |
| `surfaces/pi/src/workflow-state.ts` | 181 | State hydration with phase map |
| `surfaces/pi/index.ts` | 898 | Extension wiring and reload command |
| `surfaces/pi/tests/phase7-policy-gating.test.ts` | 1273 | Test coverage |

---

## Recommendations

1. **Immediate**: Remove debug `console.log` at test line 813 (N1).
2. **Optional**: Consider extracting YAML parsing to a dedicated helper module if future items require more frontmatter parsing.

---

## Completion Assessment

**PASS** - All acceptance criteria met, validation gates pass, code quality standards satisfied.

## Blockers

None.

---

*Return envelope written to `.sinfonica/handoffs/s-20260306-001/return-04-rondo.md`. Task complete.*
