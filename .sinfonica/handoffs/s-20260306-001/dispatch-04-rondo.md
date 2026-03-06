# Dispatch Envelope: Code Review for Per-Workflow Phase Maps

## Task
Perform a structured code review of **Item #4: Per-Workflow Phase Maps** implementation.

## Session Context
- Session: `s-20260306-001`
- Stage: 4/4 (Code Review)
- Approved PRD: `.sinfonica/handoffs/s-20260306-001/prd-per-workflow-phase-maps.md`
- Approved Spec: `.sinfonica/handoffs/s-20260306-001/spec-per-workflow-phase-maps.md`
- Implementation Return: `.sinfonica/handoffs/s-20260306-001/return-03-coda.md`

## Implementation Artifacts to Review

### Changed Files
| File | Lines Changed |
|------|---------------|
| `surfaces/pi/src/orchestration/phase-tools.ts` | +471 |
| `surfaces/pi/src/orchestration/policy.ts` | +10 |
| `surfaces/pi/src/workflow-state.ts` | +46 |
| `surfaces/pi/index.ts` | +37 |
| `surfaces/pi/tests/phase7-policy-gating.test.ts` | +534 |

## Review Criteria

### 1. Correctness
- [ ] Implementation matches approved spec
- [ ] All acceptance criteria from PRD are met
- [ ] Edge cases handled (missing files, invalid YAML, malformed config)
- [ ] Error codes (PTM-001 through PTM-006) are actionable

### 2. Type Safety
- [ ] TypeScript strict mode compliance
- [ ] No `any` types without justification
- [ ] Exported types are well-documented

### 3. Backward Compatibility
- [ ] Workflows without `phase_tool_map` work unchanged
- [ ] Existing API signatures preserved (optional params only)
- [ ] Default behavior identical to pre-implementation

### 4. Performance
- [ ] Cache implementation is sound (keyed by cwd + workflowId)
- [ ] No unnecessary file reads on repeated calls
- [ ] Cache invalidation works correctly

### 5. Test Coverage
- [ ] Unit tests for loader, validator, merge, cache
- [ ] Integration tests for policy evaluation with custom maps
- [ ] Regression tests for backward compatibility
- [ ] Negative path tests for invalid configs

### 6. Code Quality
- [ ] Follows repo conventions (ESM, kebab-case, etc.)
- [ ] No hardcoded secrets or paths
- [ ] Error messages are actionable
- [ ] No dead code or unused imports

## Validation Gates (Already Passed)
- `npm run build` ✅
- `npm test` ✅ (619/619)

## Expected Output
Write a return envelope at `.sinfonica/handoffs/s-20260306-001/return-04-rondo.md` containing:
1. **Verdict**: APPROVE / REQUEST_REVISION / REJECT
2. **Findings**: List of issues by severity (blocking / advisory / nit)
3. **Summary**: Brief assessment of implementation quality
4. **Recommendations**: Any follow-up actions

## References
- AGENTS.md — Repository conventions
- `.sinfonica/handoffs/s-20260306-001/spec-per-workflow-phase-maps.md` — Technical spec
- `.sinfonica/handoffs/s-20260306-001/prd-per-workflow-phase-maps.md` — PRD with acceptance criteria
