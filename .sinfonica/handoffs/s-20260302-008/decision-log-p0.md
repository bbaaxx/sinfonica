# P0 Decision Log (`D-01..D-04`)

Session: `s-20260302-008`  
Stage: `P0-preconditions-and-freeze`  
Mode: `Balanced kickoff`

### Decision Record: D-01
- Topic: Workspace/package topology under `surfaces/`
- Owner: Program owner (`@sinfonica-maestro`)
- Due Time: 2026-03-03T23:59:59Z
- Status: approved
- Decision Artifact Path: `.sinfonica/handoffs/s-20260302-008/decision-log-p0.md`
- Accepted Option: Nested packages under `surfaces/` are allowed without tooling migration.
- Alternatives Considered: Introduce workspace/tooling migration before `P1`.
- Fallback Path if Unresolved: Block `P1`; run planning-only topology/tooling migration design and re-baseline schedule.
- Dependencies Impacted (`P1..P5`): `P1`, `P2`, `P3`, `P4`, `P5`
- Approval Sign-off (name/date): developer-program-owner / 2026-03-03
- Notes: Strategy and revision plan both prescribe adapter topology under `surfaces/`.

### Decision Record: D-02
- Topic: Canonical Pi baseline source
- Owner: Implementation owner (`@sinfonica-coda`)
- Due Time: 2026-03-03T23:59:59Z
- Status: approved
- Decision Artifact Path: `.sinfonica/handoffs/s-20260302-008/evidence-p0-inventory.md`
- Accepted Option: `pi-sinfonica-extension/` is confirmed as source of truth for migration.
- Alternatives Considered: Alternate Pi baseline selected from external branch/source.
- Fallback Path if Unresolved: Block `P1`; run delta inventory against alternate source and issue plan revision.
- Dependencies Impacted (`P1..P5`): `P1`, `P2`, `P3`, `P5`
- Approval Sign-off (name/date): coda / 2026-03-03
- Notes: Full package inventory captured in `E-P0-INVENTORY`.

### Decision Record: D-03
- Topic: OpenCode contract/glue centralization boundary
- Owner: Program + implementation owner (joint sign-off)
- Due Time: 2026-03-04T23:59:59Z
- Status: approved
- Decision Artifact Path: `.sinfonica/handoffs/s-20260302-008/evidence-p0-inventory.md`
- Accepted Option: Centralize OpenCode glue into `surfaces/opencode/` with compatibility shims.
- Alternatives Considered: Keep selected bridge files in core behind temporary compatibility allowlist.
- Fallback Path if Unresolved: Block `P1`; retain bridge files in core under expiry-dated compatibility allowlist.
- Dependencies Impacted (`P1..P5`): `P1`, `P2`, `P3`, `P4`, `P5`
- Approval Sign-off (name/date): developer-program-owner + coda-implementation-owner / 2026-03-03
- Notes: Boundary candidate paths and provisional dispositions are listed in `E-P0-INVENTORY`.

### Decision Record: D-04
- Topic: Versioning policy during migration
- Owner: Program owner (`@sinfonica-maestro`)
- Due Time: 2026-03-04T23:59:59Z
- Status: approved
- Decision Artifact Path: `.sinfonica/handoffs/s-20260302-008/evidence-p0-gonogo.md`
- Accepted Option: Single-version stream across core + adapters during this migration cycle.
- Alternatives Considered: Temporary dual-track versioning by adapter.
- Fallback Path if Unresolved: Block release-prep (`P4`); define dual-track policy and expanded validation matrix before progression.
- Dependencies Impacted (`P1..P5`): `P4`, `P5`
- Approval Sign-off (name/date): developer-program-owner / 2026-03-03
- Notes: Near-term default in strategy document is single-version stream.
