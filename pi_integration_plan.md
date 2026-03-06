## Maestro Kickoff Prompt

Please execute this Pi-native orchestration refactor plan end-to-end for the current `packages/sinfonica` workspace.

Focus on replacing CLI-emulation workflow progression with Pi-native extension controls (events, gating, evidence validation, and phase tool restrictions). Do not allow step advancement without real execution evidence. Preserve stability for `/sinfonica status|list|reload`, and keep non-semantic compatibility fallbacks only where unavoidable.

Deliverables required:
- code changes
- tests proving no blind auto-advance and no out-of-phase implementation actions
- manual validation notes
- concise summary of behavioral improvements and residual risks

Run build and relevant tests before handoff.

---

# Sinfonica Pi-Native Orchestration Refactor Plan

## Objective
Refactor the Pi surface integration to use Pi-native extension capabilities for orchestration, instead of CLI-emulation/fallback behavior that allows state progression without real persona execution.

## Why
Current behavior shows workflow state can advance (`sinfonica_advance_step`) without actual subagent execution/artifacts, causing "completed workflow, no real work performed," and then same-thread implementation drift.

Evidence observed:
- Auto-advance through all create-spec steps without real outputs.
- `Persona: unknown` in workflow context.
- Workflow completion with no artifacts in handoffs.
- Prior custom renderer instability (already patched).

---

## Scope

### In Scope
1. Pi-native gating for workflow progression.
2. Real orchestration semantics for step execution/delegation.
3. Hard prevention of implementation actions outside allowed phases.
4. Evidence-based approval/advance.
5. Keep compatibility where needed, but no semantic shortcuts.

### Out of Scope
- Reworking Sinfonica core workflow definitions.
- Rewriting OpenCode surface behavior.
- Broad CLI feature expansion (`start/advance/abort`) in core CLI.

---

## Target Architecture (Pi-native)

### A) Event-driven policy engine (Pi extension)
Use Pi extension events as first-class orchestration controls:
- `before_agent_start`: inject concise active workflow context + next required action.
- `context`: normalize/trim context each LLM turn.
- `tool_call`: enforce hard policy (block disallowed tool usage and invalid step transitions).
- `tool_result`: validate execution evidence and persist progression metadata.

### B) Phase-aware tool control
Use `pi.setActiveTools(...)` to restrict available tools by workflow step:
- Non-implementation steps: disable file-writing/build/exec-heavy tools where inappropriate.
- Implementation steps: enable required tools.
- Approval steps: allow only review/validation/reporting actions.

### C) Evidence-gated advance
`sinfonica_advance_step` must require evidence from current step before approval:
- Required evidence schema in `details` (or validated envelope metadata):
  - `executed: true`
  - `stepId`
  - `persona`
  - `artifacts[]` (can be empty only for explicitly non-artifact steps)
  - `resultStatus`
- If missing/invalid evidence -> block with actionable reason.

### D) Delegation semantics
Introduce/solidify a Pi-native "dispatch/delegate step" action:
- Explicitly identify target persona from workflow + step.
- Record dispatch envelope with persona and step metadata.
- Require matching return evidence before allowing advance.

### E) Safe rendering
Keep UI messaging simple and stable:
- Avoid fragile custom message renderer paths unless returning valid TUI component contracts.
- Prefer standard notifications/messages where possible.

---

## Implementation Workstreams

## WS1: Orchestration Policy Module
Create a dedicated module under Pi surface for policy decisions:
- `surfaces/pi/src/orchestration/policy.ts`
- `surfaces/pi/src/orchestration/phase-tools.ts`
- `surfaces/pi/src/orchestration/evidence.ts`

Responsibilities:
- Compute allowed actions/tools from workflow state.
- Validate whether a requested advance is legal.
- Emit explicit block reasons.

## WS2: Workflow State Fidelity
Strengthen state readers/writers:
- Frontmatter + legacy parsing consistency.
- Stable `workflowId`, `persona`, `stepIndex` derivation.
- Never allow `current_step_index > total_steps`.
- Preserve/record persona identity for active step (no `unknown` where resolvable).

## WS3: Advance Gate Hardening
Refactor `sinfonica_advance_step` and `/sinfonica advance`:
- Remove implicit "approve without work."
- Require evidence token/state from the current step.
- Write return envelope only when conditions are met.
- Deny with actionable message when unmet.

## WS4: Delegation Path
Add/normalize dispatch flow:
- Explicit step dispatch action in Pi extension.
- Dispatch writes enough metadata for context injector to show persona + step.
- Return handling ties back to dispatched step (ID correlation).

## WS5: Command Surface Rationalization
Keep `/sinfonica` commands thin and policy-compliant:
- `/sinfonica status`: always local, no CLI dependency.
- `/sinfonica list`: local.
- `/sinfonica advance`: policy-gated; no blind fallback.
- `/sinfonica abort`: local state transition with safety checks.
- `/sinfonica reload`: native `ctx.reload()` command pattern (terminal command behavior).

---

## Testing Plan

## Unit/Integration Tests
Update/add tests in:
- `surfaces/pi/tests/phase2-extension.test.ts`
- `surfaces/pi/tests/phase3-handoff-utils.test.ts`
- `surfaces/pi/tests/phase5-status-context.test.ts`
- Add new test file if needed: `surfaces/pi/tests/phase7-policy-gating.test.ts`

Required test cases:
1. Cannot advance step without execution evidence.
2. Cannot use implementation tools during non-implementation steps.
3. Dispatch sets persona + step context (not unknown unless truly unavailable).
4. Step completes only with valid correlated return evidence.
5. No index overflow beyond total steps.
6. `/sinfonica` command paths remain non-crashing and deterministic.

## Manual Acceptance Scenarios
1. Start `create-spec`, provide requirement text, ask "proceed" repeatedly:
   - Should NOT auto-complete workflow without generated spec artifact/evidence.
2. Attempt coding during step 1/2:
   - Must be blocked with clear reason.
3. Complete through proper delegation/evidence:
   - Workflow completes with artifact traceable in handoffs.
4. Confirm no TUI crash on status/context messages.

---

## Acceptance Criteria (Must Pass)
1. **No blind auto-advance**: every advance requires validated step evidence.
2. **No same-thread drift**: implementation actions are blocked when phase disallows.
3. **Persona integrity**: context shows resolved persona for active step where available.
4. **Artifact integrity**: completed workflow has recorded outputs/evidence.
5. **State integrity**: no `current_step_index > total_steps`; terminal states consistent.
6. **UX integrity**: `/sinfonica` commands are stable and non-crashing.

---

## Migration / Rollout Strategy
1. Introduce policy gates in warning mode (log + notify) behind feature flag.
2. Flip to blocking mode once tests pass.
3. Remove/limit semantic CLI fallbacks that bypass policy.
4. Keep bootstrap compatibility for missing CLI subcommands only where non-semantic.

Suggested flag (temporary):
- `.sinfonica/config.yaml`: `pi_native_enforcement: warn|block` (default `block` for new init after stabilization).

---

## Deliverables
1. Refactored Pi extension modules for policy/delegation/evidence.
2. Updated command/tool behavior aligned to Pi-native event model.
3. Full automated test coverage for gating and orchestration semantics.
4. Manual verification notes against the 4 acceptance scenarios.
5. Short migration note in `surfaces/pi/README.md`.

---

## Execution Notes
- Follow repo conventions in `AGENTS.md`.
- Run from `packages/sinfonica/`:
  - `npm run build`
  - focused `npm test -- <files>`
  - final `npm test`
- Keep changes minimal but architectural where needed (modularize rather than patch-sprawl).
