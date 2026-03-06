---
handoff_id: s-20260305-003-002
session_id: s-20260305-003
sequence: 2
source_persona: amadeus
target_persona: maestro
handoff_type: return
status: complete
created_at: 2026-03-05T18:30:00Z
word_count: 450
---

## Summary

Completed architect review of `pi_integration_plan.md` against the actual Pi extension API reference. Produced a corrected technical specification with per-workstream implementation guidance, an API migration table, risk register, and recommended execution order. Nine distinct API mismatches were identified in the current codebase; all have corrective guidance below.

## Artifacts

- `.sinfonica/handoffs/s-20260305-003/return-01-amadeus.md` (this envelope, includes full spec inline)

## Completion Assessment

Pass. All five workstreams (WS1-WS5) evaluated. API surface validated against the provided Pi extension reference. Each mismatch has a concrete correction. Implementation order and risk mitigations documented.

## Blockers

None. All workstreams are feasible within the Pi API as documented.

## Recommendations

- Execute workstreams in the order: WS-API (foundation fixes) > WS2 > WS1 > WS3 > WS4 > WS5
- Coda should start with the `ExtensionAPI` type corrections since every other module depends on them
- Add `@sinclair/typebox` as a dependency in `surfaces/pi/package.json` (or use a type-only import pattern if already available transitively via the Pi host)
- Consider a phased rollout: first fix API contract mismatches (non-behavioral), then add policy/evidence gating

---

# Corrected Technical Specification: Pi-Native Orchestration Refactor

## 1. API Migration Table

| # | Current Pattern | Location | Correct Pi API | Breaking? | Notes |
|---|----------------|----------|----------------|-----------|-------|
| M1 | `pi.on?.()` (optional chaining) | `index.ts` (type), `enforcement/index.ts:74`, `context-injector.ts:110`, `widget/status.ts:151` | `pi.on()` — non-optional, always present | Yes (type) | Remove `?` from `on` in `ExtensionAPI` type and all call sites |
| M2 | `display: "hidden" \| "inline" \| "bubble"` | `ExtensionAPI.sendMessage`, `context-injector.ts:14`, `widget/status.ts:20` | `display: boolean` (true = show, false = hidden) | Yes (type + runtime) | `"hidden"` -> `false`, `"inline"` -> `true`, `"bubble"` -> `true` |
| M3 | `event.block(reason)` / `event.preventDefault(reason)` callback | `enforcement/index.ts:106-109` | Return `{ block: true, reason: string }` from `tool_call` handler | Yes (runtime) | Handler must return the blocking object, not call a method on event |
| M4 | `event.injectContext()` / `event.setContext()` | `enforcement/index.ts:90-94` | No direct equivalent in Pi API; use `before_agent_start` systemPrompt return or `tool_result` modification | Yes (runtime) | Remove from tool_call handler; move context injection to `before_agent_start` return `{ systemPrompt }` |
| M5 | `event.notify()` on tool_call event | `enforcement/index.ts:50-51` | No `notify` on event object; use `ctx.ui.notify()` from ExtensionContext | Yes (runtime) | Pass `ctx` to enforcement checker, use `ctx.ui.notify()` |
| M6 | Plain JSON Schema objects for tool parameters | `index.ts:327-341`, `:404-417`, `:493-496` | `@sinclair/typebox` `Type.Object()` with `StringEnum` from `@mariozechner/pi-ai` | Yes (runtime) | Replace all `parameters: { type: "object", ... }` with TypeBox schemas |
| M7 | `pi.sendMessage?.()` (optional) | `widget/status.ts:139` | `pi.sendMessage()` — treat as non-optional (available on API) | Minor | Remove optional chaining |
| M8 | `pi.registerMessageRenderer?.()` (optional) | `widget/status.ts:29` | Not identified as core API; remove or verify availability | Minor | May not be needed if using standard Pi message rendering |
| M9 | `pi.exec()` missing `timeout` option | `index.ts:100` | `pi.exec(command, args, { signal?, timeout?, cwd? })` | Non-breaking | Add timeout support for long-running commands |

## 2. ExtensionAPI Type Corrections

The `ExtensionAPI` type in `index.ts` (lines 79-101) must be rewritten. Corrected interface:

```typescript
import { type TObject } from "@sinclair/typebox";

type ExtensionContext = {
  cwd: string;
  ui: {
    notify: (message: string, level?: "info" | "warning" | "error") => void;
    confirm: (title: string, message: string) => Promise<boolean>;
    select: (title: string, options: string[]) => Promise<string | undefined>;
    input: (title: string, placeholder?: string) => Promise<string | undefined>;
    setStatus: (id: string, text: string | undefined) => void;
    setWidget: (id: string, lines: string[] | undefined) => void;
  };
  sessionManager?: {
    getEntries: () => unknown[];
    getBranch: () => unknown;
  };
};

type ExtensionCommandContext = ExtensionContext & {
  waitForIdle: () => Promise<void>;
  newSession: () => Promise<void>;
  fork: () => Promise<void>;
  navigateTree: () => Promise<void>;
  reload: () => Promise<void>;
};

type ToolCallEvent = {
  toolName: string;
  toolCallId: string;
  input: unknown;
};

type ToolResultEvent = {
  toolName: string;
  toolCallId: string;
  content: unknown;
  details?: Record<string, unknown>;
  isError?: boolean;
};

type BeforeAgentStartEvent = Record<string, unknown>;

type BeforeAgentStartReturn = {
  message?: {
    customType: string;
    content: string;
    display: boolean;  // NOT string enum
    details?: unknown;
  };
  systemPrompt?: string;
};

type ToolCallReturn =
  | { block: true; reason: string }
  | void;

type ToolResultReturn = {
  content?: unknown;
  details?: Record<string, unknown>;
  isError?: boolean;
} | void;

type SendMessageOptions = {
  deliverAs?: "steer" | "followUp" | "nextTurn";
  triggerTurn?: boolean;
};

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  details: Record<string, unknown>;
  isError?: boolean;
};

type RegisteredTool<TParams> = {
  name: string;
  label: string;
  description: string;
  promptSnippet?: string;
  promptGuidelines?: string[];
  parameters: TObject;  // TypeBox schema, NOT plain JSON Schema
  execute: (
    toolCallId: string,
    params: TParams,
    signal: AbortSignal,
    onUpdate: unknown,
    ctx: ExtensionContext
  ) => Promise<ToolResult>;
  renderCall?: (args: unknown, theme: unknown) => unknown;
  renderResult?: (result: unknown, options: unknown, theme: unknown) => unknown;
};

export type ExtensionAPI = {
  registerTool: <TParams>(tool: RegisteredTool<TParams>) => void;
  registerCommand: (name: string, command: {
    description: string;
    handler: (args: string | undefined, ctx: ExtensionCommandContext) => Promise<void>;
  }) => void;
  on: (  // NOT optional
    event: string,
    handler: (event: Record<string, unknown>, ctx?: ExtensionContext) => unknown | Promise<unknown>
  ) => void;
  sendMessage: (  // NOT optional
    message: {
      customType: string;
      content: string;
      display: boolean;  // NOT string enum
      details?: unknown;
    },
    options?: SendMessageOptions
  ) => void;
  sendUserMessage: (content: string, options?: { deliverAs?: "steer" | "followUp" }) => void;
  exec: (
    command: string,
    args: string[],
    options?: { signal?: AbortSignal; timeout?: number; cwd?: string }
  ) => Promise<{ stdout: string; stderr: string; code: number | null; killed?: boolean }>;
  getActiveTools: () => string[];
  getAllTools: () => Array<{ name: string; description: string }>;
  setActiveTools: (names: string[]) => void;
  appendEntry: (customType: string, data?: unknown) => void;
};
```

**Key decisions:**
- `on` and `sendMessage` are non-optional (removes defensive optional chaining)
- `display` is `boolean` everywhere
- `parameters` uses TypeBox `TObject`
- Added `getActiveTools`, `getAllTools`, `setActiveTools` for phase-gating (WS1)
- Added `appendEntry` for state persistence (WS2/WS3)
- Added `sendUserMessage` for delivery modes
- Command handler receives `ExtensionCommandContext` (superset of `ExtensionContext`)

## 3. Workstream Specifications

### WS-API: Foundation API Contract Fixes (NEW - Execute First)

**Rationale:** Every other workstream depends on correct API types. Fix mismatches M1-M9 before adding new capabilities.

**Scope:**
1. Update `ExtensionAPI` type as specified in Section 2.
2. Add `@sinclair/typebox` dependency (or import from Pi host if available).
3. Convert all three tool `parameters` blocks to TypeBox schemas:
   - `sinfonica_start_workflow`: `Type.Object({ workflowType: StringEnum([...]), context: Type.Optional(Type.String()) })`
   - `sinfonica_advance_step`: `Type.Object({ decision: StringEnum([...]), feedback: Type.Optional(Type.String()) })`
   - `sinfonica_list_workflows`: `Type.Object({})`
4. Fix `display` values: `"hidden"` -> `false`, `"inline"` -> `true`.
5. Remove all `pi.on?.()` optional chaining -> `pi.on()`.
6. Remove all `pi.sendMessage?.()` optional chaining -> `pi.sendMessage()`.
7. Fix enforcement bridge `tool_call` handler to return `{ block: true, reason }` instead of calling `event.block()`.
8. Remove `event.injectContext`/`event.setContext`/`event.notify` from enforcement types.

**Files affected:**
- `surfaces/pi/index.ts` (type definition, tool registrations, display values)
- `surfaces/pi/src/enforcement/index.ts` (blocking return pattern, remove event methods)
- `surfaces/pi/src/context-injector.ts` (display value, remove optional chaining)
- `surfaces/pi/src/widget/status.ts` (display value, remove optional chaining)

**Test impact:** Update test harnesses in all test files to match new type signatures. `phase4-enforcement.test.ts` must change: instead of asserting `block` mock was called, assert the handler's return value is `{ block: true, reason: "..." }`.

**Risk:** Medium. Broad change across all files. Mitigate by running full test suite after each file change.

---

### WS1: Orchestration Policy Module

**Plan assessment:** Feasible as proposed. The module structure (`policy.ts`, `phase-tools.ts`, `evidence.ts`) is sound.

**Corrections to the plan:**

1. **`tool_call` blocking**: Policy engine MUST return `{ block: true, reason }` from the `tool_call` handler, not call `event.block()`. The tool_call event shape is `{ toolName, toolCallId, input }` — no methods on the event object.

2. **Phase tool restriction via `pi.setActiveTools()`**: Confirmed supported. Implementation should:
   - Read current workflow state on `session_start` and `tool_result` events
   - Map workflow step slug to an allowed tool set
   - Call `pi.setActiveTools(allowedTools)` after each state change

3. **Context injection**: Cannot inject context via `tool_call` event (no `injectContext` method). Instead:
   - Use `before_agent_start` handler to return `{ systemPrompt: "..." }` with phase-specific instructions
   - Use `promptGuidelines` on registered tools for per-tool behavioral guidance
   - Use `tool_result` handler to return modified `{ details }` with policy metadata

**New module interfaces:**

```typescript
// surfaces/pi/src/orchestration/policy.ts
export type PolicyDecision = {
  allowed: boolean;
  reason?: string;
  requiredEvidence?: string[];
};

export type WorkflowPhase = "planning" | "implementation" | "review" | "approval";

export const evaluateToolCall = (
  toolName: string,
  input: unknown,
  currentPhase: WorkflowPhase,
  workflowState: WorkflowStateSnapshot
): PolicyDecision;

export const computeAllowedTools = (
  currentPhase: WorkflowPhase,
  allTools: Array<{ name: string }>
): string[];

// surfaces/pi/src/orchestration/phase-tools.ts
export type PhaseToolMap = Record<WorkflowPhase, {
  allowed: string[];   // Tool name patterns
  blocked: string[];   // Explicit blocks
}>;

export const DEFAULT_PHASE_TOOL_MAP: PhaseToolMap;

export const resolvePhaseFromStep = (
  stepSlug: string,
  stepIndex: number,
  totalSteps: number
): WorkflowPhase;

// surfaces/pi/src/orchestration/evidence.ts
export type StepEvidence = {
  executed: boolean;
  stepId: string;
  persona: string;
  artifacts: string[];
  resultStatus: "success" | "partial" | "failed";
};

export const validateStepEvidence = (
  evidence: unknown,
  requiredFields: string[]
): { valid: boolean; missing: string[] };

export const extractEvidenceFromToolResult = (
  details: Record<string, unknown>
): Partial<StepEvidence>;
```

**Risk:** Low for the module itself. Integration risk is medium — the `tool_call` handler now needs to synchronously return the blocking decision, which requires the policy evaluation to be synchronous (or the handler to be async with awaited policy check).

---

### WS2: Workflow State Fidelity

**Plan assessment:** Sound. Current `workflow-state.ts` and `widget/status.ts` already handle dual parsing (frontmatter + legacy). Hardening is incremental.

**Corrections/additions:**

1. **State persistence via `pi.appendEntry()`**: Use `pi.appendEntry("sinfonica:state-change", { sessionId, stepIndex, persona, timestamp })` to persist state transitions. These are NOT in LLM context but are recoverable via `ctx.sessionManager.getEntries()` on `session_start`.

2. **Branch-safe state**: Store current step state in tool result `details` so Pi's branch/fork model preserves state per branch. The `details` field in tool results is the Pi-recommended mechanism for branch-safe state.

3. **Index overflow guard**: Add to `readWorkflowState`:
   ```typescript
   const clampedStep = Math.min(currentStep, totalSteps);
   ```

4. **Persona resolution**: Current `readPersonaAndArtifacts` in `context-injector.ts` silently falls back to `null`. Strengthen by also checking workflow index frontmatter for `persona` field (set during `startWorkflowLocally`).

**Risk:** Low. Incremental changes to existing parsers with additive behavior.

---

### WS3: Advance Gate Hardening

**Plan assessment:** Core objective is correct. Implementation needs API-correct patterns.

**Corrections:**

1. **Evidence validation in `tool_call` handler**: When `sinfonica_advance_step` is called, the `tool_call` handler receives `{ toolName: "sinfonica_advance_step", toolCallId, input: { decision, feedback? } }`. The policy engine should:
   - Check if step evidence exists (from prior `tool_result` details or `appendEntry` records)
   - If evidence is missing/invalid, return `{ block: true, reason: "Cannot advance: no execution evidence for current step. Required: [list]" }`
   - If evidence is valid, return `void` (allow)

2. **Evidence accumulation via `tool_result` handler**: Subscribe to `tool_result` events. When a tool completes successfully during an active workflow step, extract evidence and store it:
   ```typescript
   pi.on("tool_result", (event) => {
     if (isWorkflowRelevantTool(event.toolName)) {
       accumulateEvidence(event.details);
       return { details: { ...event.details, sinfonica_evidence: currentEvidence } };
     }
   });
   ```

3. **`sinfonica_advance_step` execute function**: Remove CLI-first delegation pattern. Execute locally-first since the extension has direct access to workflow state. The CLI fallback is unnecessary when the extension can call `processReturnEnvelope` directly. Keep CLI exec only as a final fallback for forward compatibility.

**Risk:** Medium-high. This is the behavioral core of the refactor. Evidence tracking state must survive across turns (use `appendEntry` + details). Test thoroughly with multi-step sequences.

---

### WS4: Delegation Path

**Plan assessment:** Feasible. Needs refinement on message delivery.

**Corrections:**

1. **Dispatch envelope creation**: Keep current `handoff-writer.ts` pattern but add persona metadata:
   ```typescript
   // In dispatch creation, include:
   details: {
     stepId: `${stepIndex}-${stepSlug}`,
     persona: resolvedPersona,
     dispatchedAt: new Date().toISOString(),
   }
   ```

2. **Context injection for delegated persona**: Use `before_agent_start` handler to return:
   ```typescript
   {
     message: {
       customType: "sinfonica:delegation",
       content: `You are operating as ${persona}. Current step: ${stepSlug}. ...`,
       display: false,  // boolean, not "hidden"
       details: { stepId, persona, sessionId }
     },
     systemPrompt: `Active Sinfonica role: ${persona}. Step: ${stepSlug}. ...`
   }
   ```

3. **Return correlation**: On `tool_result` for `sinfonica_advance_step`, verify that the `details` contain evidence matching the dispatched step ID. Use the `details` chain from `tool_result` handler to compare.

4. **Message delivery options**: Use `pi.sendMessage(msg, { deliverAs: "steer" })` for delegation context (steers the LLM without requiring user turn).

**Risk:** Medium. Delegation semantics are inherently complex. The correlation between dispatch and return envelopes depends on consistent step IDs across the pipeline.

---

### WS5: Command Surface Rationalization

**Plan assessment:** Mostly correct. One critical fix needed.

**Corrections:**

1. **`/sinfonica reload` must use `ctx.reload()` ONLY in command handler context**: The plan correctly identifies this. The command handler receives `ExtensionCommandContext` which has `reload()`. BUT: `ctx.reload()` reloads the entire Pi session, not just enforcement rules. For enforcement-only reload, keep the current `enforcementBridge.reload()` pattern. Reserve `ctx.reload()` for full extension reload if needed.

2. **CRITICAL: Session control methods deadlock in event handlers**: `waitForIdle()`, `newSession()`, `fork()`, `navigateTree()`, `reload()` are ONLY safe in command handlers. Never call these from `tool_call`, `tool_result`, `before_agent_start`, or other event handlers. The current code does not violate this, but WS4 delegation logic must not introduce such calls.

3. **`/sinfonica status`**: Enhance to use `ctx.ui.setStatus("sinfonica", statusLine)` for persistent status bar, in addition to the `notify` call. Also use `ctx.ui.setWidget("sinfonica-workflow", widgetLines)` to show a persistent workflow widget.

4. **`/sinfonica advance`**: Gate through the same policy engine as the tool version. Use `ctx.ui.confirm("Advance Step", "Are you sure?")` for interactive confirmation before advancing.

**Risk:** Low. Commands are the simplest surface. Main risk is accidentally introducing session control calls in event handlers during WS4 integration.

## 4. Recommended Implementation Order

```
Phase 1: WS-API (Foundation)     [~2-3 hours]
  - Fix ExtensionAPI type
  - Convert parameters to TypeBox
  - Fix display: boolean
  - Fix tool_call return pattern
  - Update all test harnesses
  
Phase 2: WS2 (State Fidelity)    [~1-2 hours]
  - Add appendEntry usage
  - Add index overflow guard
  - Strengthen persona resolution
  
Phase 3: WS1 (Policy Module)     [~2-3 hours]
  - Create orchestration/ directory
  - Implement policy.ts, phase-tools.ts, evidence.ts
  - Wire into tool_call handler
  - Wire setActiveTools on state changes
  
Phase 4: WS3 (Advance Gate)      [~2-3 hours]
  - Implement evidence accumulation in tool_result
  - Add blocking logic in tool_call for advance without evidence
  - Remove CLI-first pattern from advance tool
  - Add tests for blind-advance prevention
  
Phase 5: WS4 (Delegation)        [~1-2 hours]
  - Enhance dispatch envelope metadata
  - Add delegation context to before_agent_start
  - Add return correlation check
  
Phase 6: WS5 (Commands)          [~1 hour]
  - Add ctx.ui.confirm for advance
  - Add ctx.ui.setStatus/setWidget for status
  - Verify no session control in event handlers
```

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| TypeBox dependency not available in Pi host jiti context | Medium | High | Test import early in Phase 1. Fallback: use `Type` from Pi host re-export if available |
| Evidence state lost on session compact/switch | Medium | High | Use both `appendEntry` (persistent) and `details` (branch-safe). Reconstruct on `session_start` |
| Policy evaluation blocks legitimate tool calls | Low | High | Start in warn mode (`pi_native_enforcement: warn`). Log all decisions. Add escape hatch command |
| `tool_call` handler async timing | Low | Medium | Pi awaits handler return. Ensure policy checks are fast (< 50ms). Cache workflow state |
| Test harness divergence from real Pi runtime | Medium | Medium | Create a `pi-test-harness.ts` shared fixture matching the real API shape exactly |
| Breaking existing extension loading | Low | High | Run `npm run build` in `surfaces/pi/` after each phase. Verify jiti compatibility |
