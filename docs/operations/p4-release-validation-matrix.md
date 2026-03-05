# P4 Release Validation Matrix

This note defines reproducible P4 release-gate checks for core and adapters.

## Required checks

- `C11` matrix status separation:
  - `npm run check:core`
  - `npm run check:surface:pi`
  - `npm run check:surface:opencode`
- `C12` failure isolation demonstration:
  - Simulate one adapter lane failure:
    - `node -e "process.exit(1)"`
  - Then re-run core lane independently:
    - `npm run check:core`
  - Pass condition: the simulated adapter failure remains local to that lane and core still reports its own independent status.
- `C13` adapter install smoke checks:
  - `npm run check:smoke:install:pi`
  - `npm run check:smoke:install:opencode`

## Optional checks

- Re-run full matrix end-to-end:
  - `npm run check:matrix:p4`
- Re-run full package validation:
  - `npm run build`
  - `npm test`

## Status recording template

Record per-lane status independently for each run:

| Timestamp (UTC) | Lane | Command | Exit | Status |
| --- | --- | --- | --- | --- |
| `<ISO-8601>` | `core` | `npm run check:core` | `0/1` | `pass/fail` |
| `<ISO-8601>` | `surfaces/pi` | `npm run check:surface:pi` | `0/1` | `pass/fail` |
| `<ISO-8601>` | `surfaces/opencode` | `npm run check:surface:opencode` | `0/1` | `pass/fail` |
| `<ISO-8601>` | `install/pi` | `npm run check:smoke:install:pi` | `0/1` | `pass/fail` |
| `<ISO-8601>` | `install/opencode` | `npm run check:smoke:install:opencode` | `0/1` | `pass/fail` |

## Notes

- Run commands from `packages/sinfonica/`.
- Install smoke checks are intentionally non-publish and local-path based.
- `scripts/install-smoke.mjs` prints timestamped `C13` status lines for audit trails.

## Evidence snapshot (2026-03-03)

- `C11` lane statuses:
  - `npm run check:core` -> pass (`62` files, `549` tests)
  - `npm run check:surface:pi` -> pass (`6` files, `22` tests)
  - `npm run check:surface:opencode` -> pass (`4` files, `7` tests)
- `C12` failure isolation:
  - Simulated adapter-lane failure emitted `Error: C12 simulated adapter failure in surfaces/opencode lane`.
  - Follow-up `npm run check:core` still passed (`62` files, `549` tests), confirming core status remained independently observable.
- `C13` install smoke output lines:
  - `[C13][install-smoke] started=2026-03-03T14:53:04.710Z target=.../surfaces/pi`
  - `[C13][install-smoke] status=pass target=.../surfaces/pi`
  - `[C13][install-smoke] started=2026-03-03T14:53:04.710Z target=.../surfaces/opencode`
  - `[C13][install-smoke] status=pass target=.../surfaces/opencode`
