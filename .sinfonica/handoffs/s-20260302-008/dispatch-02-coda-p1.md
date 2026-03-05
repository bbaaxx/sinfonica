# Dispatch Envelope

- Session: `s-20260302-008`
- Workflow: `multi-surface-adapter-migration-implementation`
- Stage: `P1-repository-structure-migration`
- Delegate: `@sinfonica-coda`
- Date: `2026-03-03`

## Objective

Execute P1 from the approved migration plan: establish `surfaces/` topology, move Pi adapter package to `surfaces/pi/`, and create `surfaces/opencode/` package skeleton with compatibility-safe references.

## Inputs

- Approved plan: `.sinfonica/handoffs/s-20260302-007/plan-02-libretto-revision.md`
- P0 gate evidence: `.sinfonica/handoffs/s-20260302-008/evidence-p0-gonogo.md`
- Host inventory: `.sinfonica/handoffs/s-20260302-008/evidence-p0-inventory.md`
- Session tracker: `.sinfonica/handoffs/s-20260302-008/workflow.md`

## Constraints

- Scope limited to P1 only (no P2 boundary enforcement yet).
- Perform structure/path work in move-first style:
  - create `surfaces/`
  - move `pi-sinfonica-extension/` -> `surfaces/pi/`
  - create `surfaces/opencode/` skeleton (`package.json`, `README.md`, `src/`, `tests/`)
- Update path references/tests/docs as needed for successful build/test.
- Preserve behavior parity; avoid introducing net-new host features.
- Maintain compatibility notes/shims where required and document them.
- Run required checks for P1 gates (`C1..C4`) and report results.

## Expected Outputs

1. P1 implementation changes for structure migration.
2. Evidence for gate checks:
   - build/test pass,
   - legacy path scan outcome,
   - move manifest confirmation.
3. Return envelope with:
   - status (`approved` or `blocked`),
   - artifacts,
   - gate check outcomes (`C1..C4`),
   - blockers/risks,
   - recommended next action.

## Acceptance Criteria

- `surfaces/pi/` contains migrated Pi adapter files.
- `surfaces/opencode/` package skeleton exists and is install-ready at skeleton level.
- P1 gate checks `C1..C4` are reported with evidence.
- No unresolved broken references to moved paths.

## Execution Instruction

`@sinfonica-coda` please read and execute this dispatch envelope and write your return envelope in this same session directory.
