# P1 Repository Structure Migration Notes

This note captures compatibility handling for the Phase 1 move from `pi-sinfonica-extension/` to `surfaces/pi/`.

## Compatibility posture

- Runtime behavior remains unchanged; only package and test paths moved.
- Canonical Pi package path is now `surfaces/pi/`.
- OpenCode surface placeholder is introduced at `surfaces/opencode/` without feature migration.

## Legacy path allowlist for checks

`pi-sinfonica-extension/` references are allowed only in archival planning and handoff artifacts:

- `.sinfonica/handoffs/**`
- `.sinfonica/plans/**`
- `Multi_Surface_Adapter_Strategy.md`

No active source/test/docs paths outside this allowlist should reference `pi-sinfonica-extension/`.
