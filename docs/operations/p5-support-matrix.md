# P5 Support Matrix

This matrix defines active surfaces, package paths, maintainers, and support status at migration cutover.

## Surface support matrix

| Surface | Package Path | Maintainer | Support Status | Notes |
| --- | --- | --- | --- | --- |
| Core framework | `src/` | `@sinfonica-maestro` | Active | Surface-agnostic orchestration and contract authority. |
| Pi adapter | `surfaces/pi/` | `@sinfonica-coda` | Active | Production migration target replacing legacy path references. |
| OpenCode adapter | `surfaces/opencode/` | `@sinfonica-coda` | Active | Host integration adapter with shared contract coverage. |

## Ownership and escalation

- Runtime contract breakage: escalate to core maintainer in same release window.
- Adapter-specific failures: escalate to adapter maintainer for isolated fix and matrix re-run.
- Documentation drift: update this matrix and `docs/index.md` in the same change.

## Cutover policy

- New host integrations must be added under `surfaces/<adapter>/`.
- Legacy host-specific paths outside `surfaces/` are deprecated unless explicitly allowlisted in migration evidence.
