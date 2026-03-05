# Dispatch Envelope

- Session: `s-20260302-006`
- Workflow: `pi-surface-addition`
- Stage: `01-implementation-phase-1`
- Delegate: `@sinfonica-coda`
- Date: `2026-03-02`

## Objective

Implement Phase 1 from `Pi_Surface_Addition.md`: extend `sinfonica init` to generate Pi surface assets (`.pi/package.json` and `.pi/skills/*/SKILL.md`) with idempotent and force-overwrite behavior matching existing OpenCode integration patterns.

## Inputs

- Development guide: `Pi_Surface_Addition.md` (Phase 1)
- Current tracker: `.sinfonica/handoffs/s-20260302-006/workflow.md`
- Reference repository for Pi surface context: `tmp/pi-mono/`
- Existing implementation target: `src/cli/init.ts`

## Constraints

- Keep scope limited to Phase 1 only.
- Mirror existing `mergeOpenCodeConfig()` style and idempotence semantics.
- Generate exactly four skill stubs:
  - `.pi/skills/create-prd/SKILL.md`
  - `.pi/skills/create-spec/SKILL.md`
  - `.pi/skills/dev-story/SKILL.md`
  - `.pi/skills/code-review/SKILL.md`
- Skill stubs must reference Sinfonica CLI workflow starts (`sinfonica start <workflow>`).
- Add focused tests for generation and force/non-force behavior.
- Run validation commands and report outcomes.

## Expected Outputs

1. Updated `src/cli/init.ts` implementing Pi package/skills generation.
2. New tests in `tests/cli/init-pi.test.ts` covering:
   - generation on first run,
   - preserve without `--force`,
   - overwrite with `--force`.
3. Return envelope in this session directory with:
   - status (`approved` or `blocked`),
   - evidence (files generated and test/build command outcomes),
   - artifacts list,
   - blockers (if any).

## Acceptance Criteria

- `sinfonica init` creates `.pi/package.json` with valid schema content.
- `sinfonica init` creates all required `.pi/skills/*/SKILL.md` files.
- Existing Pi files are preserved without `--force`.
- Existing Pi files are overwritten with `--force`.
- Build and relevant tests pass, or explicit blockers are documented.

## Execution Instruction

`@sinfonica-coda` please read and execute this dispatch envelope and write your return envelope in this same session directory.
