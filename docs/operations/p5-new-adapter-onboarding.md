# P5 New Adapter Onboarding Guide

Use this guide when adding a new surface adapter under `surfaces/`.

## Prerequisites

- Migration baseline gates `C11..C13` are green.
- Adapter ownership boundary is approved against core contracts.

## Required structure

1. Create package skeleton: `surfaces/<adapter>/` with `package.json`, `src/`, `tests/`, and `README.md`.
2. Import core contract types from canonical contract modules; do not fork contract shapes.
3. Add adapter build and test scripts and wire release matrix lane commands.

## Required quality gates

- **contract**
  - Shared adapter contract is consumed directly.
  - Success and error payload mappings follow compatibility fixtures.
- **tests**
  - Add adapter-local tests under `surfaces/<adapter>/tests`.
  - Add/extend cross-adapter compatibility tests under `tests/surfaces/`.
- **release**
  - Add matrix lane script for the adapter.
  - Add local install smoke command with timestamped output.

## Dry-run checklist

Reviewer executes this checklist from `packages/sinfonica/` before cutover sign-off.

| Step | Command or Action | Expected Result |
| --- | --- | --- |
| 1 | Create temp adapter skeleton in a throwaway branch | Package scaffold is complete and installable. |
| 2 | `npm run build` | Core build passes with adapter scaffold present. |
| 3 | `npm test -- tests/surfaces` | Cross-adapter tests pass. |
| 4 | Add adapter lane scripts and run lane command | Lane exits `0` with isolated status output. |
| 5 | Run adapter install smoke command | Timestamped pass line is emitted. |

Record dry-run evidence in session handoff artifacts before declaring `C15` pass.
