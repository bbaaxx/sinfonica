# Technical Spec: Per-Workflow Phase Maps (Pi Surface)

## 1) Scope and Constraints

This spec defines implementation for PRD Item #4 inside `surfaces/pi/` only.

- In scope: per-workflow `phase_tool_map` loading, validation, merge with defaults, policy wiring, cache + reload invalidation, tests.
- Out of scope: core `src/` workflow loader changes, regex tool matching, runtime user overrides, per-step map selection.
- Compatibility constraint: workflows with no `phase_tool_map` continue to use `DEFAULT_PHASE_TOOL_MAP` with no behavior change.
- Location constraint: workflow definition lookup must support both:
  - `.sinfonica/workflows/<workflowId>/workflow.md`
  - `workflows/<workflowId>/workflow.md` (fallback)

## 2) Architecture Decisions

### AD-1: Canonical map is full map; config input is partial override

Rationale: evaluation remains O(1) and deterministic in policy layer; merging happens once at load time.

```ts
export type WorkflowPhase = "planning" | "implementation" | "review" | "approval";

export type PhaseToolRule = {
  allowed: string[];
  blocked: string[];
};

export type PhaseToolMap = Record<WorkflowPhase, PhaseToolRule>;

export type PhaseToolMapOverride = Partial<Record<WorkflowPhase, PhaseToolRule>>;
```

### AD-2: Validation is two-layered (shape + semantic)

- Layer 1 (shape): TypeBox schema checks object/array/string structure.
- Layer 2 (semantic): explicit checks for valid phase keys, required `allowed`/`blocked` arrays per overridden phase, non-empty patterns, and supported wildcard syntax.

Rationale: TypeBox catches structural failures quickly; semantic checks provide actionable messages tied to workflow config authoring.

### AD-3: Safety behavior is "fallback-to-default" (fail-safe continuity)

- If workflow map is missing, unreadable, or invalid: use `DEFAULT_PHASE_TOOL_MAP`.
- Policy enforcement still runs with default rules (not full allow-all).
- `sinfonica_*` bypass remains unchanged.

Rationale: prevents session disruption while preserving existing enforcement posture.

### AD-4: Cache stores resolved map result by workflow ID and cwd

- Cache key: `${cwd}::${workflowId}`.
- Cached value includes map + source metadata + optional validation warning/error.
- Cache is cleared by `/sinfonica reload`.

Rationale: avoids repeated disk + parse overhead during frequent `tool_call` events.

## 3) Contract Definitions

## 3.1 Runtime result and error contracts

```ts
export type PhaseToolMapSource =
  | "default:no-config"
  | "default:missing-workflow"
  | "default:read-error"
  | "default:invalid-config"
  | "workflow:custom";

export type PhaseToolMapConfigErrorCode =
  | "PTM-001" // unknown phase key
  | "PTM-002" // phase rule missing allowed/blocked array
  | "PTM-003" // non-string or empty pattern
  | "PTM-004" // unsupported pattern syntax
  | "PTM-005" // malformed frontmatter phase_tool_map block
  | "PTM-006"; // workflow definition unreadable

export type PhaseToolMapConfigError = {
  code: PhaseToolMapConfigErrorCode;
  message: string;
  workflowId: string;
  filePath?: string;
  phase?: string;
  field?: "allowed" | "blocked";
};

export type PhaseToolMapLoadResult = {
  map: PhaseToolMap;
  source: PhaseToolMapSource;
  cacheHit: boolean;
  warnings: string[];
  error?: PhaseToolMapConfigError;
};
```

## 3.2 Public APIs

`surfaces/pi/src/orchestration/phase-tools.ts`

```ts
export const loadPhaseToolMap = async (cwd: string, workflowId: string): Promise<PhaseToolMapLoadResult> => { ... }
export const clearPhaseToolMapCache = (): void => { ... }
export const mergePhaseToolMapOverride = (
  base: PhaseToolMap,
  override: PhaseToolMapOverride
): PhaseToolMap => { ... }
```

`surfaces/pi/src/orchestration/policy.ts`

```ts
export const evaluateToolCall = (
  toolName: string,
  input: unknown,
  currentPhase: WorkflowPhase,
  workflowState: WorkflowStateSnapshot,
  phaseToolMap?: PhaseToolMap
): PolicyDecision => { ... }
```

`surfaces/pi/src/workflow-state.ts`

```ts
export type WorkflowState = {
  currentStep: number;
  totalSteps: number;
  status: string;
  persona?: string | null;
  stepSlugs: string[];
  phaseToolMap?: PhaseToolMap;
  phaseToolMapSource?: PhaseToolMapSource;
  phaseToolMapWarnings?: string[];
};

export const readWorkflowState = async (
  cwd: string,
  sessionId: string,
  options?: { workflowId?: string; includePhaseToolMap?: boolean }
): Promise<WorkflowState> => { ... }
```

## 4) Module-Level Change Plan

### 4.1 `surfaces/pi/src/orchestration/phase-tools.ts`

- Keep existing phase resolution and matcher behavior unchanged.
- Add types for `PhaseToolRule`, `PhaseToolMapOverride`, `PhaseToolMapLoadResult`, `PhaseToolMapConfigError`.
- Add `parsePhaseToolMapOverrideFromWorkflowDef(raw: string)` that reads YAML frontmatter `phase_tool_map` block.
  - Parser scope is restricted to this shape only; unsupported structures return `PTM-005`.
- Add validation pipeline:
  - `validatePhaseToolMapOverride(override, workflowId, filePath)` returns semantic errors.
  - Valid phases hardcoded as `planning|implementation|review|approval`.
  - Pattern validator accepts exact token, suffix `*` wildcard, and `*` global wildcard.
- Add map merge utility `mergePhaseToolMapOverride`.
- Add workflow definition resolver:
  1. `.sinfonica/workflows/<workflowId>/workflow.md`
  2. `workflows/<workflowId>/workflow.md` (if #1 ENOENT)
- Add cache:
  - module-level `Map<string, PhaseToolMapLoadResult>`
  - cache default/fallback results too (prevents repeated warnings).
- Add `clearPhaseToolMapCache` for explicit invalidation.

### 4.2 `surfaces/pi/src/orchestration/policy.ts`

- Extend `evaluateToolCall` signature with optional `phaseToolMap`.
- Use `isToolAllowedInPhase(toolName, currentPhase, phaseToolMap ?? DEFAULT_PHASE_TOOL_MAP)`.
- Keep `sinfonica_*` early allow path unchanged.
- Keep reason string format stable except optional suffix: `Policy source: <source>` is NOT required in policy layer (avoid coupling to loader metadata).

### 4.3 `surfaces/pi/src/workflow-state.ts`

- Import `type PhaseToolMap`, `type PhaseToolMapSource`, and `loadPhaseToolMap`.
- Extend `WorkflowState` type with optional phase map fields.
- Add optional options arg (`includePhaseToolMap`, `workflowId`).
- If `includePhaseToolMap` and `workflowId` are provided:
  - call `loadPhaseToolMap(cwd, workflowId)`
  - attach `phaseToolMap`, `phaseToolMapSource`, `phaseToolMapWarnings`
  - never throw due to map load; state read remains resilient.

### 4.4 `surfaces/pi/index.ts`

- Extend `WorkflowStateSnapshot` type usage locally by adding optional `phaseToolMap?: PhaseToolMap`.
- In `readActiveState`:
  - pass `workflowId: active.workflowId` and `includePhaseToolMap: true` to `readWorkflowState`.
  - include `phaseToolMap` in returned snapshot when available.
  - emit warning via `ctx.ui.notify` only when source is `default:invalid-config` or `default:read-error` (once per session/workflow pair).
- In `tool_call` handler:
  - pass `activeState.phaseToolMap` into `evaluateToolCall`.
- In `/sinfonica reload` command path:
  - call `clearPhaseToolMapCache()` before/after `enforcementBridge.reload(...)`.
  - update notification text to include phase map cache clear confirmation.

## 5) Validation Strategy

## 5.1 Shape schema (TypeBox-compatible)

Define in `phase-tools.ts` (or local helper module under `orchestration/`):

```ts
const ToolPattern = Type.String({ minLength: 1 });

const PhaseToolRuleSchema = Type.Object({
  allowed: Type.Array(ToolPattern),
  blocked: Type.Array(ToolPattern),
}, { additionalProperties: false });

const PhaseToolMapOverrideSchema = Type.Partial(Type.Object({
  planning: PhaseToolRuleSchema,
  implementation: PhaseToolRuleSchema,
  review: PhaseToolRuleSchema,
  approval: PhaseToolRuleSchema,
}, { additionalProperties: false }));
```

## 5.2 Semantic validation rules

- Reject unknown phase keys with `PTM-001` and valid set in message.
- Reject missing arrays with `PTM-002`.
- Reject empty/non-string entries with `PTM-003`.
- Reject invalid wildcard usage (`"Re*d"`, `"*foo"`, whitespace-only) with `PTM-004`.
- Return one primary error in load result; include additional warnings where useful.

## 5.3 Messaging requirements

Warnings/errors must include:
- workflow id
- source file path (if resolved)
- machine code (`PTM-xxx`)
- actionable fix hint (example: `Use phase keys: planning, implementation, review, approval`).

Example warning:

`[sinfonica:pi:phase-map][PTM-001] Invalid phase "plan" in workflow "create-spec" at workflows/create-spec/workflow.md. Valid phases: planning, implementation, review, approval. Falling back to DEFAULT_PHASE_TOOL_MAP.`

## 6) End-to-End Data Flow

1. `tool_call` event fires in `index.ts`.
2. Extension resolves active workflow via `readActiveWorkflowStatus`.
3. `readActiveState` calls `readWorkflowState(..., { workflowId, includePhaseToolMap: true })`.
4. `readWorkflowState` delegates to `loadPhaseToolMap`.
5. `loadPhaseToolMap` resolves workflow definition path, parses `phase_tool_map`, validates, merges defaults, caches result.
6. `resolveCurrentPhase` determines phase from step slug/index.
7. `evaluateToolCall` checks:
   - `sinfonica_*` bypass -> allow
   - blocked patterns first
   - allowed patterns second
8. Result drives enforcement:
   - `block` mode -> return `{ block: true, reason }`
   - `warn` mode -> notify warning, allow tool
   - `disabled` mode -> allow tool

## 6.1 Fallback behavior matrix

- `phase_tool_map` absent: source `default:no-config`, map = default.
- workflow definition not found in either location: source `default:missing-workflow`, map = default.
- file unreadable: source `default:read-error`, map = default, warning emitted.
- config invalid: source `default:invalid-config`, map = default, warning emitted.
- config valid partial: source `workflow:custom`, map = merged full map.

## 7) Safety and Compatibility Guarantees

- Existing matcher semantics unchanged (case-insensitive exact/prefix wildcard/global wildcard).
- `sinfonica_*` bypass unchanged and evaluated before phase policy.
- Existing workflows with no custom config remain behavior-identical.
- No change to enforcement mode semantics (`disabled|warn|block`).
- No change to core `src/` contracts.

## 8) Test Matrix

Primary test file updates: `surfaces/pi/tests/phase7-policy-gating.test.ts`.

| ID | Level | Scenario | Expected Result |
|---|---|---|---|
| T1 | Unit | `loadPhaseToolMap` with no `phase_tool_map` | returns default map, source `default:no-config` |
| T2 | Unit | Valid full override | returns custom map, source `workflow:custom` |
| T3 | Unit | Valid partial override (`planning` only) | merged map uses default for missing phases |
| T4 | Unit | Unknown phase key (`plan`) | source `default:invalid-config`, `PTM-001` |
| T5 | Unit | Missing `allowed` or `blocked` | source `default:invalid-config`, `PTM-002` |
| T6 | Unit | Invalid pattern (`Re*d`) | source `default:invalid-config`, `PTM-004` |
| T7 | Unit | Cache hit on second call same cwd/workflow | `cacheHit: true`, no re-read |
| T8 | Unit | `clearPhaseToolMapCache` invalidates cache | subsequent load rereads file |
| T9 | Unit | Path fallback to `workflows/<id>/workflow.md` | map loaded when `.sinfonica/workflows` absent |
| T10 | Unit | `evaluateToolCall` with custom map blocks tool allowed by default | `allowed: false` |
| T11 | Unit | `evaluateToolCall` blocked precedence over allowed in same phase | blocked decision |
| T12 | Unit | `evaluateToolCall` with `sinfonica_*` | always allowed |
| T13 | Integration | `tool_call` in block mode uses custom map | handler returns `{ block: true }` when map blocks tool |
| T14 | Integration | `tool_call` in warn mode uses custom map | warning notification emitted, no block |
| T15 | Integration | `/sinfonica reload` clears cache | edited map takes effect after reload |
| T16 | Integration | Invalid map in active workflow | warning shown, default policy still enforced |
| T17 | Regression | Existing test workflows without map | all prior policy tests still pass unchanged |

Optional organization: if `phase7-policy-gating.test.ts` becomes too dense, split loader/cache tests into `surfaces/pi/tests/phase8-phase-tool-map.test.ts`.

## 9) Implementation Sequence for Coda

1. **Phase-tools contracts first**
   - Add new types/result/error contracts.
   - Implement parser + validator + merge + cache + clear API.
2. **Policy wiring**
   - Extend `evaluateToolCall` signature; keep backward compatibility via optional param.
3. **Workflow-state integration**
   - Extend `WorkflowState` and options-based map hydration path.
4. **Extension wiring (`index.ts`)**
   - Pass workflow id/options into `readWorkflowState`.
   - Pass map into policy evaluation.
   - Connect reload command to `clearPhaseToolMapCache`.
5. **Tests**
   - Add/adjust unit tests for loader/validation/merge/cache.
   - Add integration tests for tool_call behavior and reload invalidation.
6. **Validation gates**
   - `npm run build`
   - `npm test -- surfaces/pi/tests/phase7-policy-gating.test.ts`
   - full `npm test`

## 10) Risks and Mitigations

- **Risk: frontmatter parser fragility for nested YAML**
  - Mitigation: constrain supported shape, return `PTM-005` with fix hints, cover malformed indentation cases in tests.
- **Risk: warning spam on repeated tool calls**
  - Mitigation: cache fallback results and dedupe UI warnings per `(sessionId, workflowId, errorCode)`.
- **Risk: ambiguous workflow source when both locations exist**
  - Mitigation: explicit precedence (`.sinfonica/workflows` first), document in code and tests.
- **Risk: accidental behavior drift in default map path**
  - Mitigation: keep all old policy tests green and add regression assertions for unchanged defaults.

## 11) Handoff Notes for `@sinfonica-maestro`

- Architecture is implementation-ready for `@sinfonica-coda` within Pi surface boundaries.
- No blocking dependency on core modules.
- Only unresolved implementation detail is parser strategy complexity; recommended default is restricted parser + strict validation (no new package dependency).
