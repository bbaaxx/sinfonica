# Full Migration Review (P0-P5)

Date: 2026-03-04
Reviewer: @sinfonica-rondo
Session: `s-20260302-008`
Verdict: **revise**

## Scope Reviewed

- Dispatch and phase artifacts: `.sinfonica/handoffs/s-20260302-008/dispatch-07-rondo-full-review.md`, `workflow.md`, consolidated changelog, commit staging plan, and `return-01` through `return-06`.
- Code/doc/test deltas in working tree for P1-P5 migration.
- Validation evidence rerun in this review:
  - `npm run build` (pass)
  - `npm test` (pass, 63 files / 551 tests)
  - `npm run build -- --listEmittedFiles` (used for emitted-path verification)
  - `npm pack --json` in `surfaces/pi` and `surfaces/opencode` (used for package boundary verification)

## Acceptance Coverage

- Correctness: **partial pass** (core build/tests are green, but packaging/runtime correctness has release blockers).
- Boundary integrity: **partial pass** (core/adapter split is clearer, but adapter packages cross-import root internals not shipped with adapter tarballs).
- Contract safety: **partial pass** (shared contract and tests exist; package boundaries can break contract availability at runtime).
- Test/release readiness: **fail** (critical entrypoint/build artifact drift and adapter package self-containment defects).
- Regression risk: **high** for release/publish flows; **low-moderate** for in-repo test execution.

## Severity-Ranked Findings

### 1) Critical - Root package entrypoints are inconsistent with actual build output (release-blocking)

- Severity: **critical**
- Confidence: **high**
- Impact: Build artifacts are non-deterministic and can publish stale or missing runtime entrypoints; clean environments may fail to run expected binaries/modules.
- Evidence:
  - `package.json` declares `main: dist/index.js`, `types: dist/index.d.ts`, `bin.sinfonica: dist/cli/index.js`.
  - `npm run build -- --listEmittedFiles` emits under `dist/src/**` and `dist/surfaces/**` (including `dist/src/cli/index.js`), not `dist/index.js` and not `dist/cli/index.js`.
  - `dist/index.js` is absent in current workspace.
  - `dist/cli/index.js` exists but is not emitted by the current compiler output list (stale artifact risk).
- Remediation target:
  - Align `tsconfig` output layout and package entrypoints (`main`, `types`, `bin`) to emitted files.
  - Add a release gate asserting declared entrypoints exist immediately after a clean build.

### 2) High - Adapter packages are not contract-self-contained after pack/install (boundary + runtime risk)

- Severity: **high**
- Confidence: **high**
- Impact: Packed adapters can lose access to shared contract module and fail at runtime/type-check in real install contexts.
- Evidence:
  - `surfaces/pi/index.ts` imports `../../src/surfaces/adapter-contract.ts` (outside adapter package root).
  - `surfaces/opencode/src/adapter-contract.ts` imports `../../../src/surfaces/adapter-contract.js` (outside adapter package root).
  - `npm pack --json` manifests for both adapters do not include root `src/surfaces/adapter-contract.*`.
  - Existing `C13` smoke checks verify install success only; they do not execute/import adapter entrypoints post-install.
- Remediation target:
  - Move shared adapter contract to a package-shippable location consumed by both adapters (or vendor/copy into each adapter package with drift controls).
  - Extend smoke checks to import/execute adapter entrypoint in an isolated temp project after install.

## Non-Blocking Improvements

- Severity: **medium** | Confidence: **medium**
- Add an explicit clean-build check (remove dist or build into a clean temp output directory) in release matrix to detect stale artifact masking.
- Add package-level validation for declared `main`/`bin` and adapter import closure before release sign-off.

## Recommendation

**Revise before commit/release prep.**

Top risks to address first:

1. Fix root package entrypoint/build-output mismatch and ensure clean-build determinism.
2. Fix adapter contract import boundaries so packed adapters are self-contained and runnable.

After these are corrected, rerun `npm run build`, `npm test`, plus new clean-build and post-install runtime smoke gates, then re-request review.
