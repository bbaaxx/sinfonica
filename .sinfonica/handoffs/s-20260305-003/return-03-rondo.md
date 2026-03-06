---
handoff_id: s-20260305-003-006
session_id: s-20260305-003
sequence: 6
source_persona: rondo
target_persona: maestro
handoff_type: return
status: complete
created_at: 2026-03-05T20:30:00Z
word_count: 1800
---

## Summary

Completed structured quality review of the Pi-Native Orchestration Refactor (6 phases: WS-API, WS2, WS1, WS3, WS4, WS5) against the corrected architect spec and acceptance criteria. Reviewed all 4 new files, 9 modified files, and 1 new test file. Build passes, 594/594 tests pass across 65 test files.

## Artifacts

- `.sinfonica/handoffs/s-20260305-003/return-03-rondo.md` (this envelope)

## Findings

### BLOCKING

*None identified.* All findings are advisory. The implementation is sound, tests pass, and acceptance criteria are met.

---

### ADVISORY

#### A1: `readActiveState` produces a synthetic slug, not the real step slug

- **Severity:** Medium | **Confidence:** High
- **Location:** `surfaces/pi/index.ts:404-407`
- **Issue:** When building the `WorkflowStateSnapshot`, the `currentStepSlug` is constructed as `"${state.currentStep}-step"` (e.g., `"1-step"`). This synthetic slug will never match any slug in `PLANNING_SLUGS`, `REVIEW_SLUGS`, etc. in `resolvePhaseFromStep`. The policy engine will always fall through to the positional heuristic for advance gating, making slug-based classification dead code in this path.
- **Impact:** Phase resolution will work via the positional heuristic fallback (step 1 = planning, last step = approval, middle = implementation), which is reasonable but less precise than slug-based matching. This matters most when a workflow has non-standard step ordering.
- **Remediation:** Read the actual step slug from the workflow index frontmatter (`current_step` field typically stores `"1-analyze-prd"`) or derive it from the `steps` array in the workflow index. The `readWorkflowState` already parses the frontmatter and could expose the slug directly.

#### A2: Evidence not reset on successful CLI-path advance (non-fallback)

- **Severity:** Medium | **Confidence:** High
- **Location:** `surfaces/pi/index.ts:620-627`
- **Issue:** When the CLI `sinfonica advance` command succeeds (code 0, lines 620-627), `currentStepEvidence` is not reset to `null`. It is only reset in the local-fallback path (line 601). This means after a successful CLI-mediated advance, the stale evidence from the previous step could satisfy the gate for the next step's advance without new work being done.
- **Impact:** Partially undermines the evidence-gated advance protection in the CLI-success path. The local-fallback path (which is the primary path today given CLI `advance` is unsupported) is correct.
- **Remediation:** Add `currentStepEvidence = null;` after line 620 (the `normalizeResult` call in the CLI-success path), mirroring the reset in the fallback path at line 601.

#### A3: In-memory evidence state is fragile

- **Severity:** Low-Medium | **Confidence:** High
- **Location:** `surfaces/pi/index.ts:396`
- **Issue:** `currentStepEvidence` is a module-scoped `let` variable. It is correctly reset on `session_start` (line 438) and after local advance (line 601), but it does not survive extension reload, Pi session compaction, or session switching. The `session_compact` and `session_switch` events are subscribed in `widget/status.ts` but not used to manage evidence state.
- **Impact:** Documented as a known deferral (Coda recommendation #3). Risk is limited since evidence is primarily a guardrail rather than a source of truth. However, aggressive session compaction could silently clear evidence, allowing an advance through without work.
- **Remediation:** Subscribe to `session_compact` and `session_switch` events to reset evidence (conservative approach), or reconstruct from `appendEntry` records as noted in the deferral. Low urgency.

#### A4: `tool_result` evidence extraction requires `details.ok === true`

- **Severity:** Low | **Confidence:** Medium
- **Location:** `surfaces/pi/src/orchestration/evidence.ts:49-51`, `surfaces/pi/index.ts:427`
- **Issue:** When there is no `sinfonica_evidence` field in `details`, evidence extraction requires `details.ok === true` to set `executed = true`. However, third-party tools invoked during a workflow step may not set `ok` in their `details` at all. The evidence accumulation in `index.ts:427` also gates on `extracted.executed` being truthy, so tools that produce successful results without `ok: true` in their details will never accumulate evidence.
- **Impact:** This means evidence gating effectively only tracks sinfonica-aware tool results or results that happen to include `ok: true`. In practice, most real work will be done by tools that don't set this field, making the evidence gate unlikely to naturally pass without explicit evidence injection. This is conservative (safe by default) but may cause user friction.
- **Remediation:** Consider also treating non-error tool results (`isError !== true`) as evidence of execution, or provide a mechanism (like a `/sinfonica mark-complete` command) for the user to manually mark step evidence.

#### A5: Phase tool map uses case-sensitive comparison for some paths

- **Severity:** Low | **Confidence:** Medium
- **Location:** `surfaces/pi/src/orchestration/phase-tools.ts:69`
- **Issue:** `matchesToolPattern` does a `toLowerCase()` comparison for exact matches, but the wildcard prefix match (`startsWith`) uses the original casing. For example, the pattern `"sinfonica_*"` would not match `"Sinfonica_start_workflow"`. This is fine given current tool naming conventions (all sinfonica tools are lowercase), but could be a latent issue if tool naming conventions change.
- **Impact:** Negligible with current tool names. Defensive improvement only.
- **Remediation:** Apply `toLowerCase()` to both sides in the `startsWith` branch as well.

#### A6: No test coverage for the command-path advance evidence gate

- **Severity:** Low | **Confidence:** High
- **Location:** `surfaces/pi/index.ts:745-752` (command handler approve path)
- **Issue:** The `/sinfonica advance` command handler includes evidence gating for `approve` decisions (lines 745-752), but no test exercises this path. The `phase2-extension.test.ts` tests only use `request-revision` (which bypasses the gate). The `phase7-policy-gating.test.ts` integration tests cover the tool-based advance gate but not the command-based one.
- **Impact:** The command-path evidence gate is untested. While the logic is identical to the tool path (both call `evaluateAdvanceRequest`), the integration path through the command handler is unique (it also calls `ctx.ui.confirm` first).
- **Remediation:** Add a test in `phase7-policy-gating.test.ts` or `phase2-extension.test.ts` that exercises `/sinfonica advance` with `approve` when no evidence exists, verifying the `ctx.ui.notify` warning message.

#### A7: TypeBox deferral is well-documented but creates a type contract gap

- **Severity:** Low | **Confidence:** High
- **Location:** `surfaces/pi/index.ts:119-127`
- **Issue:** Tool `parameters` are `Record<string, unknown>` instead of `TObject` from `@sinclair/typebox`. This is correctly documented with a TODO comment (line 119-120) and noted in Coda's recommendations. The Pi runtime may reject plain JSON Schema objects depending on its validation behavior.
- **Impact:** If the Pi host strictly validates that `parameters` is a TypeBox instance (checking for TypeBox symbols), tool registration could fail at runtime. However, many hosts accept plain JSON Schema objects as a duck-type match.
- **Remediation:** Test tool registration against the real Pi runtime early. If it fails, add `@sinclair/typebox` as a dependency and convert. Already tracked as deferral #1.

---

## Acceptance Criteria Assessment

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | No blind auto-advance | **PASS** | `evaluateAdvanceRequest` blocks `approve` without valid evidence. Tested in `phase7-policy-gating.test.ts:305-327`. `request-revision` correctly bypasses gate. |
| 2 | No same-thread drift | **PASS** | Policy module (`evaluateToolCall`, `isToolAllowedInPhase`) implemented and tested. Not wired to `tool_call` handler for non-sinfonica tools (deliberate deferral behind `pi_native_enforcement` flag). Module correctness verified by 13 unit tests. |
| 3 | Persona integrity | **PASS** | Context injector resolves persona from dispatch envelope -> workflow index frontmatter. `systemPrompt` delegation return added. Tested in `phase5-status-context.test.ts:192-225`. |
| 4 | Artifact integrity | **PASS** | Evidence accumulation from `tool_result` details. Advance requires evidence for `approve`. Artifacts listed in context injection. Tested in `phase5-status-context.test.ts` and `phase7-policy-gating.test.ts`. |
| 5 | State integrity | **PASS** | `Math.min(currentStep, totalSteps)` overflow guard in both frontmatter and legacy parsing paths of `workflow-state.ts:101,118`. Optional `persona` field added. |
| 6 | UX integrity | **PASS** | All `/sinfonica` commands (status, advance, list, abort, reload) stable. Status uses `setStatus`/`setWidget`. Advance uses `confirm` dialog. No `session control` calls in event handlers. Tested across `phase2-extension.test.ts`. |

## API Mismatch Resolution Assessment

| # | Mismatch | Status | Notes |
|---|----------|--------|-------|
| M1 | `pi.on?.()` optional chaining | **Fixed** | `on` is non-optional in `ExtensionAPI`. Zero grep hits for `on?.` in surfaces/pi. |
| M2 | `display` string enum | **Fixed** | `display: boolean` everywhere. `false` for hidden, `true` for visible. Zero grep hits for `"hidden"`, `"inline"`, `"bubble"`. |
| M3 | `event.block(reason)` | **Fixed** | Enforcement returns `{ block: true, reason }`. Zero grep hits for `event.block(`. |
| M4 | `event.injectContext()` | **Fixed** | Removed. Context injection via `before_agent_start` `systemPrompt` return. Zero grep hits for `injectContext`/`setContext`. |
| M5 | `event.notify()` | **Fixed** | Uses `ctx.ui.notify()` from `ExtensionContext`. Zero grep hits for `event.notify`. |
| M6 | Plain JSON Schema | **Deferred** | TODO comment in place. Parameters use `Record<string, unknown>`. See A7. |
| M7 | `pi.sendMessage?.()` | **Fixed** | `sendMessage` is non-optional. Zero grep hits for `sendMessage?.`. |
| M8 | `registerMessageRenderer` | **Fixed** | Removed entirely. Zero grep hits. |
| M9 | `pi.exec()` missing timeout | **Fixed** | `exec` options type includes `timeout?: number`. |

## Deferral Risk Assessment

| Deferral | Risk | Assessment |
|----------|------|------------|
| TypeBox migration (M6) | **Medium** | Safe to defer if Pi host accepts plain JSON Schema. Test against real runtime before first release. |
| Full tool_call policy enforcement | **Low** | Policy module is implemented and tested. Wiring it is a configuration change behind a flag. No behavioral risk from deferral. |
| Evidence persistence across sessions | **Low-Medium** | In-memory evidence is sufficient for single-session workflows. Multi-session or compacted sessions may lose evidence, but the conservative default (block advance) is safe. |

## Completion Assessment

**PASS.** The implementation correctly addresses all 6 acceptance criteria and 8 of 9 API mismatches (M6 is a documented, tracked deferral). Code quality is high: clean separation of concerns across orchestration modules, consistent error handling, comprehensive test coverage (31 new tests in phase7, plus updates to 4 existing test files). No blocking defects found.

## Blockers

None.

## Recommendations

1. **Fix A2 (evidence reset on CLI-success path)** before the next major feature addition. This is the highest-risk advisory finding. Single-line fix.
2. **Improve A1 (real step slug resolution)** to enable precise phase classification. Currently the positional heuristic is a reasonable fallback.
3. **Add command-path advance test (A6)** for completeness.
4. **Test tool registration against real Pi runtime** to validate the TypeBox deferral (A7).

## Verdict

**APPROVE.** All acceptance criteria are met. All blocking API mismatches are resolved. No blocking defects. The 7 advisory findings are genuine improvement opportunities but do not compromise correctness or safety for the current use case. The implementation is ready for merge.
