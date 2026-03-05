# Commit-Ready Staging Plan (P0-P5)

## Goal

Provide a deterministic staging plan for the completed migration work, split by phase intent, with clear include/exclude boundaries.

## Default Exclusions (do not include in product commits)

- `.sinfonica/handoffs/**` (session orchestration logs/evidence/dispatch/returns)
- `.sinfonica/plans/**` (planning artifacts)
- `tmp/**` (temporary workspace if present)

## Commit 0 (Optional): Planning/ops artifacts only

Use this only if you want to keep planning history in-repo.

- Include:
  - `Multi_Surface_Adapter_Strategy.md`
  - `.sinfonica/plans/Pi_Surface_Addition.md`

## Commit 1: Surface topology + Pi move (P1)

- Include:
  - `surfaces/pi/**`
  - `surfaces/opencode/package.json`
  - `surfaces/opencode/README.md`
  - `surfaces/opencode/src/index.ts`
  - `surfaces/opencode/tests/skeleton.test.ts`
  - `vitest.config.ts`
  - `docs/operations/p1-repository-migration-notes.md`
  - `README.md`
  - `AGENTS.md`

- Suggested message:
  - `refactor(surfaces): establish surfaces topology and migrate pi adapter`

## Commit 2: Boundary enforcement (P2)

- Include:
  - `src/cli/init.ts`
  - `src/cli/generate-stubs.ts`
  - `tsconfig.json`
  - `surfaces/opencode/src/config.ts`
  - `surfaces/opencode/src/workflow-stubs.ts`
  - `surfaces/opencode/tests/config.test.ts`
  - `surfaces/opencode/tests/workflow-stubs.test.ts`
  - `docs/operations/p2-boundary-enforcement-notes.md`
  - `docs/operations/p2-boundary-matrix.json`
  - `tests/cli/init-pi.test.ts`

- Suggested message:
  - `refactor(opencode): enforce core-adapter boundaries for host glue`

## Commit 3: Shared contract + compatibility (P3)

- Include:
  - `src/surfaces/adapter-contract.ts`
  - `surfaces/pi/index.ts`
  - `surfaces/opencode/src/adapter-contract.ts`
  - `surfaces/pi/tests/phase3-adapter-contract.test.ts`
  - `surfaces/opencode/tests/adapter-contract.test.ts`
  - `tests/surfaces/adapter-contract-compatibility.test.ts`
  - `docs/operations/p3-contract-compatibility-notes.md`

- Suggested message:
  - `feat(contracts): add shared adapter contract and compatibility validation`

## Commit 4: Release matrix and smoke checks (P4)

- Include:
  - `package.json`
  - `scripts/install-smoke.mjs`
  - `docs/operations/p4-release-validation-matrix.md`
  - `docs/operations/release-checklist.md`
  - `docs/index.md`
  - `tests/operations/p4-release-gates.test.ts`

- Suggested message:
  - `ci(operations): add core-adapter validation matrix and install smoke checks`

## Commit 5: Cutover docs and onboarding (P5)

- Include:
  - `docs/operations/p5-support-matrix.md`
  - `docs/operations/p5-new-adapter-onboarding.md`
  - `docs/operations/p5-legacy-reference-audit.md`
  - `docs/operations/p5-cutover-checklist.md`
  - `tests/operations/p5-cutover-docs.test.ts`

- Suggested message:
  - `docs(cutover): publish support matrix onboarding and migration closure`

## Verification Before First Commit

- Run:
  - `npm run build`
  - `npm test`

## Final Sanity Check

- Confirm `git status --short` includes only intended files per commit slice.
- Ensure no `.sinfonica/handoffs/**` evidence files are accidentally staged unless explicitly desired.
