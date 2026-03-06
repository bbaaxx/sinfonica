---
handoff_id: h-20260305-021558-rondo-dispatch-09
session_id: s-20260302-008
sequence: 12
source_persona: maestro
target_persona: rondo
handoff_type: dispatch
status: pending
created_at: 2026-03-05T02:15:58Z
---

## Task

Perform a focused re-review of P6 remediation to confirm the critical/high release blockers from `return-07-rondo-full-review.md` have been properly addressed.

## Context

- **Prior Review:** `return-07-rondo-full-review.md` identified two release blockers:
  1. **Critical:** Root package entrypoint/build-output mismatch
  2. **High:** Adapter packages not self-contained after pack/install

- **Remediation:** `return-08-coda-p6-remediation.md` implemented fixes for both blockers.

- **Current Validation State:**
  - `npm test`: 554 tests pass (64 files)
  - `npm run build`: Clean build with declaration emit
  - `npm run check:entrypoints:clean`: Pass
  - `npm run check:smoke:install:pi`: Pass
  - `npm run check:smoke:install:opencode`: Pass

## Scope

Focus your re-review on:

1. **Critical Blocker Resolution (root entrypoint/build-output):**
   - Verify `scripts/sync-cli-entrypoints.mjs` generates deterministic `dist/cli` wrappers
   - Verify `scripts/check-entrypoints.mjs` gates clean-build entrypoint existence
   - Confirm `prepublishOnly` includes entrypoint check
   - Verify `tsconfig.json` has declaration emit enabled

2. **High Blocker Resolution (adapter self-containment):**
   - Verify `surfaces/pi/index.ts` imports from local `./src/adapter-contract.ts`
   - Verify `surfaces/opencode/src/adapter-contract.ts` contains local contract types
   - Confirm both adapters have `sinfonicaSmoke.runtimeProbe` in manifests
   - Verify `scripts/install-smoke.mjs` executes post-install runtime probes

3. **Test Coverage:**
   - Confirm `tests/operations/p4-release-gates.test.ts` covers entrypoint gates
   - Confirm `tests/operations/p6-release-blockers.test.ts` covers self-contained imports + runtime probe manifest contract

## Expected Outputs

- Return envelope at `.sinfonica/handoffs/s-20260302-008/return-09-rondo-p6-rereview.md`
- Verdict: `approve` if all blockers resolved, `revise` if issues remain
- For each blocker, provide resolution confirmation with evidence paths

## Constraints

- Do NOT modify implementation code
- Focus only on verifying the remediation quality
- If approving, confirm readiness for release gate progression
