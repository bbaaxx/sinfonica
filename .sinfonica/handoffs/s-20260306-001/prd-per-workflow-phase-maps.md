# PRD: Per-Workflow Phase Maps

**Item #4** | **Status:** Draft | **Author:** Libretto | **Date:** 2026-03-06

---

## Problem Statement

The Sinfonica Pi surface extension currently uses a single global `DEFAULT_PHASE_TOOL_MAP` that defines tool restrictions for all workflows. This one-size-fits-all approach prevents workflow authors from customizing phase-to-tool policies to match their specific requirements.

### Current Behavior

All workflows share the same phase tool restrictions:

| Phase | Allowed | Blocked |
|-------|---------|---------|
| planning | Read, Glob, Grep, WebFetch, sinfonica_* | Write, Edit, Bash |
| implementation | * (all tools) | (none) |
| review | Read, Glob, Grep, Bash, sinfonica_* | Write, Edit |
| approval | Read, Glob, sinfonica_advance_step, sinfonica_list_workflows | Write, Edit, Bash |

### User Need

Different workflow types require different tool policies:

- **"docs-only" workflow**: May need Write access during planning to draft documentation
- **"safe-review" workflow**: May need to block Bash even during implementation for security
- **"ci-pipeline" workflow**: May allow specific Bash commands but block others
- **Custom workflows**: Currently have no mechanism to define their own tool policies

### Impact

Without per-workflow phase maps, workflow authors cannot:
1. Create specialized workflows with tailored security postures
2. Enable or restrict tools based on workflow-specific risk profiles
3. Override default phase behaviors for domain-specific use cases

---

## User Stories

### US-1: Workflow Author Defines Custom Phase Map

**As a** workflow author
**I want** to define per-phase tool restrictions in my workflow definition
**So that** my workflow enforces appropriate tool policies for its specific context

**Acceptance Criteria:**
- AC-1.1: Workflow definition file supports optional `phase_tool_map` configuration
- AC-1.2: If `phase_tool_map` is omitted, `DEFAULT_PHASE_TOOL_MAP` is used
- AC-1.3: Partial overrides are supported (can override specific phases, inherit defaults for others)

### US-2: Extension Loads and Applies Custom Phase Map

**As a** workflow author
**I want** the Pi extension to load and apply my custom phase map when my workflow is active
**So that** tool calls are gated according to my specified policy

**Acceptance Criteria:**
- AC-2.1: When a workflow session is active, the extension resolves the workflow's phase map
- AC-2.2: `isToolAllowedInPhase` uses the workflow-specific phase map when available
- AC-2.3: Phase map is loaded once per session and cached for performance

### US-3: Fallback to Default Phase Map

**As a** workflow author
**I want** my workflow to work without defining a phase map
**So that** I can create simple workflows without boilerplate configuration

**Acceptance Criteria:**
- AC-3.1: Workflows without custom phase maps use `DEFAULT_PHASE_TOOL_MAP`
- AC-3.2: No breaking changes to existing workflow definitions
- AC-3.3: Existing workflow sessions continue to function without modification

### US-4: Clear Error on Invalid Phase Map

**As a** workflow author
**I want** clear error messages if my phase map configuration is invalid
**So that** I can quickly identify and fix configuration errors

**Acceptance Criteria:**
- AC-4.1: Invalid phase map syntax produces actionable error message
- AC-4.2: Unknown phases are rejected with list of valid phases
- AC-4.3: Invalid tool pattern syntax is detected and reported

---

## Functional Requirements

### FR-1: Configuration Schema

**FR-1.1** The phase tool map shall be defined in workflow definition frontmatter.

**FR-1.2** The schema shall support the following structure:

```yaml
phase_tool_map:
  planning:
    allowed: [string[]]   # Tool patterns to allow
    blocked: [string[]]   # Tool patterns to block (takes precedence)
  implementation:
    allowed: [string[]]
    blocked: [string[]]
  review:
    allowed: [string[]]
    blocked: [string[]]
  approval:
    allowed: [string[]]
    blocked: [string[]]
```

**FR-1.3** Each phase is optional; omitted phases inherit from `DEFAULT_PHASE_TOOL_MAP`.

**FR-1.4** Tool patterns support:
- Exact match: `"Read"`
- Prefix wildcard: `"sinfonica_*"`
- Global wildcard: `"*"`

### FR-2: Loading Mechanism

**FR-2.1** Phase maps shall be loaded from `workflows/<workflow-id>/workflow.md` frontmatter.

**FR-2.2** Loading shall occur when resolving the active workflow state.

**FR-2.3** The extension shall cache phase maps per workflow ID for the session duration.

**FR-2.4** Cache shall be invalidated on `/sinfonica reload` command.

### FR-3: API Changes

**FR-3.1** New function `loadPhaseToolMap(cwd: string, workflowId: string): Promise<PhaseToolMap>` shall be added to `phase-tools.ts`.

**FR-3.2** `readWorkflowState` return type shall be extended to include optional `phaseToolMap?: PhaseToolMap`.

**FR-3.3** `evaluateToolCall` shall accept optional `phaseToolMap` parameter (maintains backward compatibility).

**FR-3.4** `readActiveState` in `index.ts` shall resolve and include the phase map for the active workflow.

### FR-4: Policy Evaluation

**FR-4.1** When evaluating tool calls, if a custom phase map exists, use it; otherwise use `DEFAULT_PHASE_TOOL_MAP`.

**FR-4.2** Blocked patterns take precedence over allowed patterns (same as current behavior).

**FR-4.3** sinfonica_* tools bypass policy checks (same as current behavior).

---

## Configuration Schema Proposal

### Location

Per-workflow phase maps shall be defined in the frontmatter of workflow definition files:

```
workflows/<workflow-id>/workflow.md
```

### Full Schema

```yaml
---
# workflow.md frontmatter
persona: libretto
description: "Workflow description"

# Optional: Override default phase tool map
phase_tool_map:
  planning:
    allowed:
      - Read
      - Glob
      - Grep
      - WebFetch
      - sinfonica_*
      - Write        # Custom: allow Write in planning
    blocked: []
  implementation:
    allowed: ["*"]
    blocked: []
  # review and approval inherit from DEFAULT_PHASE_TOOL_MAP
---
```

### Partial Override Behavior

When a workflow defines only some phases, the undefined phases inherit from `DEFAULT_PHASE_TOOL_MAP`:

```yaml
phase_tool_map:
  planning:
    allowed: ["Read", "Write"]  # Custom planning policy
    blocked: []
  # implementation, review, approval → use DEFAULT_PHASE_TOOL_MAP
```

### Tool Pattern Syntax

| Pattern | Meaning | Example Matches |
|---------|---------|-----------------|
| `Read` | Exact match (case-insensitive) | `Read` |
| `sinfonica_*` | Prefix wildcard | `sinfonica_start_workflow`, `sinfonica_advance_step` |
| `*` | Global wildcard (all tools) | All available tools |

### Validation Rules

1. All phase keys must be valid: `planning`, `implementation`, `review`, `approval`
2. Each phase must have `allowed` and `blocked` arrays (can be empty)
3. Array elements must be valid tool patterns (non-empty strings)
4. Pattern matching is case-insensitive

---

## Scope Boundaries

### In Scope

- Per-workflow phase map configuration in workflow.md frontmatter
- Loading and caching mechanism in Pi surface
- Integration with existing policy evaluation
- Backward compatibility for workflows without custom maps
- Error handling for invalid configuration

### Out of Scope

- Changes to Sinfonica core (`src/`)
- Per-step phase maps (phase resolution remains step-slug-based)
- Dynamic phase map changes mid-session
- User-level phase map overrides at runtime
- Wildcard patterns beyond prefix matching (e.g., regex)

---

## Dependencies

| Dependency | Type | Description |
|------------|------|-------------|
| `workflow-state.ts` | Internal | Must extend to load phase map with workflow state |
| `phase-tools.ts` | Internal | Must add `loadPhaseToolMap` function |
| `policy.ts` | Internal | Must accept optional phase map parameter |
| `index.ts` | Internal | Must pass phase map through to policy evaluation |
| YAML/frontmatter parser | Internal | Existing `parseFrontmatter` must support nested objects |

---

## Acceptance Criteria

### AC-SET-1: Configuration

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-1 | Workflows can define `phase_tool_map` in frontmatter | Unit test: parse workflow.md with phase_tool_map |
| AC-2 | Omitted phases inherit from `DEFAULT_PHASE_TOOL_MAP` | Unit test: partial override merges with defaults |
| AC-3 | Omitted `phase_tool_map` uses `DEFAULT_PHASE_TOOL_MAP` entirely | Unit test: workflow without phase_tool_map |
| AC-4 | Invalid phase keys produce actionable error | Unit test: unknown phase key error message |

### AC-SET-2: Loading

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-5 | Phase map loaded when workflow session is active | Integration test: active session has correct phase map |
| AC-6 | Phase map cached per workflow ID | Unit test: multiple calls return cached instance |
| AC-7 | Cache invalidated on reload | Integration test: `/sinfonica reload` clears cache |

### AC-SET-3: Policy Enforcement

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-8 | Custom phase map blocks disallowed tools | Integration test: tool blocked per custom policy |
| AC-9 | Custom phase map allows configured tools | Integration test: tool allowed per custom policy |
| AC-10 | sinfonica_* tools bypass policy regardless of map | Unit test: sinfonica_* always allowed |
| AC-11 | Blocked takes precedence over allowed | Unit test: tool in both lists is blocked |

### AC-SET-4: Backward Compatibility

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-12 | Existing workflows without phase_tool_map work unchanged | Regression test: all existing workflows pass |
| AC-13 | Existing API signatures remain backward compatible | Type check: optional parameters only |
| AC-14 | Default behavior unchanged for workflows without custom maps | Integration test: default enforcement matches current |

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Frontmatter parsing fails for complex nested YAML | Medium | High | Use simple array format; validate on load with clear errors |
| Performance degradation from repeated file reads | Low | Medium | Cache phase maps per workflow ID |
| Invalid phase map breaks workflow execution | Medium | High | Validate on load; fallback to default on error with warning |
| Inconsistent behavior between custom and default maps | Low | Medium | Use same merge/evaluation logic for all paths |

---

## Open Questions

### OQ-1: Phase Map Storage Location (Resolved)

**Decision:** Use workflow.md frontmatter.

**Alternatives Considered:**
1. ~~`.sinfonica/config.json`~~ — Too centralized, harder to maintain per-workflow
2. ~~Dedicated `phase-policy.yaml`~~ — Additional file, discovery cost
3. ~~Frontmatter in workflow.md~~ — **Selected**: Natural location, uses existing parsing

### OQ-2: Partial Override Semantics (Resolved)

**Decision:** Support partial phase overrides; omitted phases inherit from default.

**Rationale:** Reduces boilerplate for workflows that only need to customize one phase.

### OQ-3: Phase Map Hot-Reload (Deferred)

**Question:** Should `/sinfonica reload` reload phase maps mid-session?

**Recommendation:** Yes — consistent with enforcement rule reload behavior.

**Status:** Included in scope (FR-2.4).

### OQ-4: Tool Pattern Complexity (Deferred)

**Question:** Should tool patterns support regex or more complex matching?

**Recommendation:** No — keep prefix wildcard only for v1. Simplicity over power.

**Status:** Out of scope.

---

## Recommended Next Steps for Amadeus Spec Phase

1. **Schema Validation**: Define TypeBox or Zod schema for `PhaseToolMap` in `surfaces/pi/src/schemas.ts`

2. **Loading Function**: Implement `loadPhaseToolMap()` in `phase-tools.ts`:
   - Read workflow.md frontmatter
   - Parse `phase_tool_map` if present
   - Merge with `DEFAULT_PHASE_TOOL_MAP`
   - Validate structure

3. **State Integration**: Extend `readWorkflowState()` to return phase map:
   - Add `phaseToolMap?: PhaseToolMap` to `WorkflowState`
   - Load phase map alongside workflow state

4. **Policy Integration**: Update `evaluateToolCall()` to accept optional phase map:
   - Add optional `phaseToolMap` parameter
   - Use custom map if provided, else default

5. **Extension Integration**: Update `readActiveState()` in `index.ts`:
   - Load phase map for active workflow
   - Pass to policy evaluation

6. **Cache Implementation**: Add simple in-memory cache:
   - `Map<string, PhaseToolMap>` keyed by workflow ID
   - Clear on reload event

7. **Tests**: Add test coverage for:
   - Schema validation
   - Partial override merging
   - Policy evaluation with custom maps
   - Backward compatibility

---

## Appendix: Example Workflow Definitions

### Example A: Docs-Only Workflow (Write in Planning)

```yaml
---
persona: libretto
description: "Documentation-only workflow"

phase_tool_map:
  planning:
    allowed:
      - Read
      - Glob
      - Grep
      - WebFetch
      - Write      # Allow Write in planning for docs
    blocked: []
---
```

### Example B: Safe-Review Workflow (Block Bash in Implementation)

```yaml
---
persona: coda
description: "Restricted implementation workflow"

phase_tool_map:
  implementation:
    allowed: ["*"]
    blocked:
      - Bash       # Block Bash even in implementation
---
```

### Example C: Minimal Customization (Override One Phase)

```yaml
---
persona: amadeus
description: "Spec workflow with relaxed approval"

phase_tool_map:
  approval:
    allowed:
      - Read
      - Glob
      - Grep
      - sinfonica_*
    blocked: []
---
```
