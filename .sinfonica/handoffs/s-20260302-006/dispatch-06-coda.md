# Dispatch Envelope

- Session: `s-20260302-006`
- Workflow: `pi-surface-addition`
- Stage: `06-implementation-phase-6`
- Delegate: `@sinfonica-coda`
- Date: `2026-03-02`

## Objective

Implement Phase 6 from `Pi_Surface_Addition.md`: complete documentation and packaging readiness for Pi surface integration, including Sinfonica root docs updates and extension publish/install readiness checks.

## Inputs

- Development guide: `Pi_Surface_Addition.md` (Phase 6)
- Session tracker: `.sinfonica/handoffs/s-20260302-006/workflow.md`
- Prior approved return: `.sinfonica/handoffs/s-20260302-006/return-05-coda.md`
- Extension workspace: `pi-sinfonica-extension/`

## Constraints

- Scope limited to Phase 6 only.
- Update extension docs:
  - `pi-sinfonica-extension/README.md`
  - include install, usage, troubleshooting
- Update Sinfonica root docs:
  - `README.md` add Pi surface integration section with quick start and link to extension README
  - `AGENTS.md` add Pi extension development-location/context note
- Ensure `pi-sinfonica-extension/package.json` packaging metadata is sufficient for local/git installation and exports remain correct.
- Validate package usability from local path or equivalent reproducible check documented in evidence.
- Run validation commands and report outcomes.

## Expected Outputs

1. Documentation updates for extension and root project docs.
2. Packaging metadata updates if needed.
3. Validation evidence for build/tests and installation/readiness checks.
4. Return envelope in this session directory containing:
   - status (`approved` or `blocked`),
   - implementation summary,
   - artifacts list,
   - validation evidence,
   - blockers/risks.

## Acceptance Criteria

- Extension README clearly covers install, usage, troubleshooting.
- Root README includes Pi integration and quick start path.
- AGENTS.md references Pi extension location/development guide.
- Extension package metadata is publish/install-ready for this phase.
- Full build and tests pass, or blockers are explicitly documented.

## Execution Instruction

`@sinfonica-coda` please read and execute this dispatch envelope and write your return envelope in this same session directory.
