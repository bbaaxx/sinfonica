# Dispatch Envelope

- Session: `s-20260302-006`
- Workflow: `pi-surface-addition`
- Stage: `02-implementation-phase-2`
- Delegate: `@sinfonica-coda`
- Date: `2026-03-02`

## Objective

Implement Phase 2 from `Pi_Surface_Addition.md` by creating a new Pi extension package (`pi-sinfonica-extension`) that registers core workflow control tools and a `/sinfonica` slash command entry.

## Inputs

- Development guide: `Pi_Surface_Addition.md` (Phase 2)
- Session tracker: `.sinfonica/handoffs/s-20260302-006/workflow.md`
- Prior approved work: `.sinfonica/handoffs/s-20260302-006/return-01-coda.md`
- Optional API reference context: `tmp/pi-mono/`

## Constraints

- Scope limited to Phase 2 only (no Phase 3+ implementation in this dispatch).
- Create root-level directory: `pi-sinfonica-extension/`.
- Add extension entrypoint and package manifest:
  - `pi-sinfonica-extension/index.ts`
  - `pi-sinfonica-extension/package.json`
  - `pi-sinfonica-extension/README.md`
- Register core tools with structured parameters/results:
  - `sinfonica_start_workflow`
  - `sinfonica_advance_step`
  - `sinfonica_list_workflows`
- Register slash command `/sinfonica` with args: `status`, `advance`, `list`, `abort`.
- Tools should delegate to Sinfonica CLI commands (do not reimplement workflow engine).
- Add or update tests for Phase 2 behavior where practical in current package test architecture.
- Run validation commands and report outcomes.

## Expected Outputs

1. New extension scaffold and core tool registration implementation.
2. Slash command registration and handler wiring.
3. Phase-appropriate tests validating registration/execution behavior.
4. Return envelope in this session directory containing:
   - status (`approved` or `blocked`),
   - implementation summary,
   - evidence (test/build output),
   - artifacts list,
   - blockers/risks.

## Acceptance Criteria

- Extension package exists and loads without TypeScript/build errors.
- Core tools are registered and return structured results.
- `/sinfonica` command is registered with required subcommands.
- CLI delegation pattern is used (`sinfonica start`, `sinfonica advance`, list workflows source).
- Relevant tests pass and `npm run build` passes, or blockers are explicitly documented.

## Execution Instruction

`@sinfonica-coda` please read and execute this dispatch envelope and write your return envelope in this same session directory.
