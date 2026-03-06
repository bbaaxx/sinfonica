# Dispatch Envelope: Requirements Analysis for Per-Workflow Phase Maps

## Task
Analyze and document requirements for **Item #4: Per-Workflow Phase Maps** in the Sinfonica Pi surface extension.

## Context

### Current Implementation
- Location: `surfaces/pi/src/orchestration/phase-tools.ts`
- `DEFAULT_PHASE_TOOL_MAP` defines phase-to-tool mappings for all workflows:
  - `planning`: Read, Glob, Grep, WebFetch, sinfonica_* allowed; Write, Edit, Bash blocked
  - `implementation`: All tools allowed
  - `review`: Read, Glob, Grep, Bash, sinfonica_* allowed; Write, Edit blocked
  - `approval`: Read, Glob, sinfonica_* allowed; Write, Edit, Bash blocked

### Problem Statement
Different workflow types may need different phase-to-tool restrictions. For example:
- A "docs-only" workflow might allow Write in planning phase
- A "safe-review" workflow might block Bash even in implementation phase
- Custom workflows have no way to define their own tool policies

### Constraints
- Do NOT modify Sinfonica core (`src/`) — only Pi surface (`surfaces/pi/`)
- Maintain backward compatibility: workflows without custom maps use `DEFAULT_PHASE_TOOL_MAP`
- Follow existing patterns in the codebase

## Required Analysis

1. **Configuration Format**
   - Where should per-workflow phase maps be defined?
   - Options to consider:
     - Workflow definition files (`.sinfonica/workflows/<workflow-id>/workflow.yaml`)
     - Extension config file (`.sinfonica/config.json`)
     - Frontmatter in workflow.md
     - Dedicated phase-policy.yaml

2. **Schema Definition**
   - Define the schema for a per-workflow `PhaseToolMap`
   - Should it extend or replace the default map?
   - Support for phase inheritance or overrides?

3. **Loading Mechanism**
   - When/how should custom maps be loaded?
   - Integration with existing `readWorkflowState` and `resolveCurrentPhase`
   - Caching strategy

4. **API Changes**
   - Changes to `isToolAllowedInPhase`, `computeAllowedTools`
   - Changes to `resolveCurrentPhase` in `policy.ts`
   - How does the extension know which workflow is active?

5. **Backward Compatibility**
   - Default behavior when no custom map exists
   - Migration path for existing workflows

## Expected Output
Produce a PRD document at `.sinfonica/handoffs/s-20260306-001/prd-per-workflow-phase-maps.md` with:
- User stories
- Functional requirements
- Configuration schema proposal
- Acceptance criteria

## References
- `surfaces/pi/src/orchestration/phase-tools.ts` — Current phase map implementation
- `surfaces/pi/src/orchestration/policy.ts` — Policy evaluation using phase maps
- `surfaces/pi/src/workflow-state.ts` — Workflow state loading
- `surfaces/pi/index.ts` — Extension entry point, workflow type resolution
- `pi_integration_plan.md` — Original refactor plan context
