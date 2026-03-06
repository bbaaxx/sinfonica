# Return Envelope: Per-Workflow Phase Maps PRD Complete

---
handoff_id: r-20260306-libretto-001
session_id: s-20260306-001
sequence: 2
source_persona: libretto
target_persona: maestro
handoff_type: return
status: complete
created_at: 2026-03-06T00:00:00Z
word_count: ~2200
---

## Summary

Completed requirements analysis and PRD creation for **Item #4: Per-Workflow Phase Maps**.

### Analysis Performed

1. **Current Implementation Review**
   - Analyzed `surfaces/pi/src/orchestration/phase-tools.ts` — identified `DEFAULT_PHASE_TOOL_MAP` and optional `phaseToolMap` parameter support
   - Analyzed `surfaces/pi/src/orchestration/policy.ts` — confirmed policy evaluation currently uses default map only
   - Analyzed `surfaces/pi/src/workflow-state.ts` — documented state loading mechanism
   - Analyzed `surfaces/pi/index.ts` — mapped extension event flow and active state resolution

2. **Workflow Definition Structure**
   - Reviewed existing workflow files (`create-prd/workflow.md`, `dev-story/workflow.md`)
   - Confirmed simple markdown format with frontmatter
   - Identified natural extension point for phase map configuration

3. **Configuration Options Evaluated**
   - Workflow definition frontmatter ✓ (selected)
   - Extension config file (rejected — too centralized)
   - Dedicated phase-policy.yaml (rejected — discovery cost)
   - Workflow.md body section (rejected — frontmatter cleaner)

4. **Requirements Derived**
   - 4 user stories with 11 acceptance criteria
   - 4 functional requirement groups
   - Configuration schema proposal with partial override semantics
   - Risk analysis with mitigations

## Artifacts

| File | Description |
|------|-------------|
| `.sinfonica/handoffs/s-20260306-001/prd-per-workflow-phase-maps.md` | Complete PRD with user stories, functional requirements, configuration schema, and acceptance criteria |

## Completion Assessment

**Status:** PASS

**Rationale:**
- All dispatch envelope requirements addressed
- Configuration location decided with rationale
- Schema defined with validation rules
- Backward compatibility requirements specified
- Clear acceptance criteria for each user story
- Recommended next steps provided for Amadeus spec phase

## Blockers

**None.** All analysis tasks completed successfully.

## Open Questions Requiring Stakeholder Input

| ID | Question | Recommendation | Status |
|----|----------|----------------|--------|
| OQ-3 | Should phase maps hot-reload? | Yes — include in scope | Resolved: Included |
| OQ-4 | Regex tool patterns needed? | No — keep simple for v1 | Resolved: Out of scope |

## Recommendations for Amadeus Spec Phase

1. **Start with schema definition** in `surfaces/pi/src/schemas.ts` using TypeBox
2. **Implement `loadPhaseToolMap()`** with validation and merge logic
3. **Extend `WorkflowState` type** to include optional `phaseToolMap`
4. **Add simple in-memory cache** keyed by workflow ID
5. **Update policy evaluation path** to pass phase map through
6. **Write tests first** for:
   - Schema validation
   - Partial override merging behavior
   - Policy evaluation with custom maps
   - Backward compatibility

### Suggested Implementation Order

```
1. schemas.ts       — TypeBox schema for PhaseToolMap
2. phase-tools.ts   — loadPhaseToolMap(), merge logic
3. workflow-state.ts — extend return type
4. policy.ts        — optional phaseToolMap parameter
5. index.ts         — wire through active state
6. tests            — comprehensive coverage
```

---

**End of Return Envelope**
