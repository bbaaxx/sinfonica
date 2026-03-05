---
handoff_id: h-20260304-004051-coda-return-08
session_id: s-20260302-008
sequence: 11
source_persona: coda
target_persona: maestro
handoff_type: return
status: blocked
created_at: 2026-03-04T00:40:51Z
word_count: 389
---

## Summary

Implemented both requested blocker remediations with test-first updates, then validated build/release checks and adapter post-install runtime probes.

- Root package entrypoint/build-output mismatch remediated via deterministic build output alignment (`dist/cli` wrappers generated from fresh build artifacts) and a clean-build entrypoint existence gate.
- Adapter self-containment remediated by removing root cross-import contract dependencies from both adapters and introducing package-local contract modules.
- Install smoke checks now execute post-install runtime probes (not install-only) by transpiling and executing each adapter's declared probe module in an isolated temp install.
- Regression tests were added/updated to lock these expectations.

## Blocker -> Fix Mapping

1. **Critical: root entrypoint/build-output mismatch**
   - Fix: updated root entrypoints to deterministic `dist/cli` outputs and added `scripts/sync-cli-entrypoints.mjs` to generate wrapper entrypoints from clean build output.
   - Fix: enabled declaration emit (`tsconfig.json`) so declared type entrypoint exists.
   - Fix: added clean-build gate `scripts/check-entrypoints.mjs` + scripts `check:entrypoints` and `check:entrypoints:clean`; wired into `prepublishOnly`.
   - Tests: `tests/operations/p4-release-gates.test.ts` now asserts entrypoint paths and gate scripts.

2. **High: adapter package not self-contained after pack/install**
   - Fix: `surfaces/pi/index.ts` now imports local `./src/adapter-contract.ts` (new file), removing root contract dependency.
   - Fix: `surfaces/opencode/src/adapter-contract.ts` now contains local contract types/builders (no root cross-import).
   - Fix: added `sinfonicaSmoke.runtimeProbe` in both adapter package manifests.
   - Fix: `scripts/install-smoke.mjs` now performs post-install runtime probe execution for each adapter in isolated temp install.
   - Tests: added `tests/operations/p6-release-blockers.test.ts` to enforce self-contained imports + runtime probe manifest contract.

## Artifacts

- `package.json`
- `tsconfig.json`
- `scripts/check-entrypoints.mjs`
- `scripts/sync-cli-entrypoints.mjs`
- `scripts/install-smoke.mjs`
- `surfaces/pi/index.ts`
- `surfaces/pi/src/adapter-contract.ts`
- `surfaces/pi/package.json`
- `surfaces/opencode/src/adapter-contract.ts`
- `surfaces/opencode/package.json`
- `src/cli/init.ts`
- `src/cli/program.ts`
- `src/persona/loader.ts`
- `tests/operations/p4-release-gates.test.ts`
- `tests/operations/p6-release-blockers.test.ts`
- `tests/self-hosting/clean-init.test.ts`

## Validation Results

- `npm run build` -> **pass**
- `npm test` -> **fail (1 test)**
  - failing test: `tests/personas/maestro.test.ts` (`keeps generated maestro stub aligned with canonical persona guidance`)
  - root cause: existing modified `.opencode/agent/sinfonica-maestro.md` is out of sync with `agents/maestro.md` expected text.
- `npm run check:entrypoints:clean` -> **pass**
- `npm run check:smoke:install:pi` -> **pass**
- `npm run check:smoke:install:opencode` -> **pass**
- `npm run build -- --listEmittedFiles` -> **pass** (includes `dist/src/cli/index.js` and `dist/src/cli/index.d.ts` used by wrapper entrypoint generation)
- `npm pack --json` in `surfaces/pi` / `surfaces/opencode` -> **pass** (adapter-local contract files included in tar manifests)

## Completion Assessment

**Blocked** for final sign-off because full `npm test` is not green due an unrelated pre-existing/stale persona stub mismatch.

## Blockers

- Unrelated existing workspace mismatch in `.opencode/agent/sinfonica-maestro.md` vs `agents/maestro.md` causing one full-suite test failure.

## Recommendations

1. Regenerate or manually align `.opencode/agent/sinfonica-maestro.md` with `agents/maestro.md`, then rerun `npm test`.
2. If green, proceed to follow-up full review focusing on P6 remediation evidence.
