# Multi-Surface Adapter Migration Plan (Revision 02 - Execution-Safe)

## 1) Scope Extraction

### Confirmed Constraints

- Source strategy remains `Multi_Surface_Adapter_Strategy.md`.
- This artifact is planning-only; no implementation changes are in scope.
- Migration target remains adapter packages under `surfaces/` with core kept surface-agnostic.
- Existing valid sequencing (`P0 -> P5`) is preserved unless remediations require stricter gating.
- Gates must be deterministic, auditable, and tied to concrete evidence artifacts.

### Stakeholders and Owners

- Program owner: `@sinfonica-maestro`.
- Implementation owner: designated migration engineer for repository moves and contract updates.
- QA/review owner: designated gate approver for acceptance evidence.
- Rollback owner: on-call migration owner for each phase (explicitly assigned below).

### Outcomes

- Migration can start only after explicit precondition decisions are recorded.
- Each phase has objective pass/fail criteria and rollback trigger thresholds.
- Every gate produces an auditable artifact for re-review.

### Assumptions (Not Confirmed; Must Become Decisions)

- Workspace/package topology can support nested adapter packages under `surfaces/` without tooling migration.
- `pi-sinfonica-extension/` is still canonical Pi baseline for migration.
- OpenCode integration concerns can be centralized into `surfaces/opencode/` with compatibility shims.
- Release stream remains single-version through this migration cycle.

## 2) Review Finding to Plan Change Mapping

| Finding ID | Review Finding | Plan Changes in This Revision |
| --- | --- | --- |
| F1 | Critical assumptions were not mandatory preconditions. | Added mandatory `Gate P0.0 (Go/No-Go)` with four decision records (`D-01` to `D-04`), each with owner, due time, decision artifact, accepted option, and fallback path. Phase 1 is explicitly blocked until all decisions are in `approved` state. |
| F2 | Rollback triggers were subjective and owner-less. | Added phase-specific rollback thresholds (timebox and failed-gate attempt limits) and explicit rollback owner assignment for `P1` to `P5` (plus precondition rollback for `P0`). |
| F3 | Boundary/compatibility gates had subjective criteria. | Replaced reviewer-judgment gates with measurable checks: command outputs (`npm run build`, `npm test`), `rg` scans for path ownership and legacy references, and required compatibility test assertions tied to gate IDs. |

## 3) Scope Boundaries

### In Scope

- Standardized adapter package topology under `surfaces/`.
- Pi package relocation to `surfaces/pi/`.
- OpenCode adapter package creation and host-glue migration to `surfaces/opencode/`.
- Shared contract normalization and cross-adapter compatibility tests.
- Validation matrix, release readiness checks, and migration documentation updates.

### Out of Scope

- Core semantic redesign (workflow/handoff/enforcement behavior changes).
- Net-new host feature expansion beyond parity migration.
- Independent adapter versioning rollout in this migration cycle.

## 4) Phase 0 - Mandatory Preconditions and Freeze

**Goal**: Convert assumptions into recorded decisions before any structural migration work.

### Gate P0.0 (Go/No-Go, mandatory before P1)

All decisions below must be `approved` and archived in session evidence before Phase 1 starts.

| Decision ID | Decision Topic | Owner | Due Time | Decision Artifact | Accepted Option | Fallback Path if Unresolved by Due Time |
| --- | --- | --- | --- | --- | --- | --- |
| D-01 | Workspace/package topology under `surfaces/` | Program owner | T0 + 1 business day | ADR or decision note in session handoff directory | Nested packages allowed without tooling migration | Block P1; execute a planning-only branch to define minimal workspace/tooling migration, then re-baseline schedule |
| D-02 | Canonical Pi baseline source | Implementation owner | T0 + 1 business day | Inventory manifest linking baseline commit/ref | `pi-sinfonica-extension/` confirmed as source of truth | Block P1; run delta inventory against alternate Pi source and issue revision before moves |
| D-03 | OpenCode contract/glue centralization boundary | Program + implementation owner (joint sign-off) | T0 + 2 business days | Boundary matrix with explicit keep/move list | OpenCode glue centralized into `surfaces/opencode/` with shims | Block P1; keep selected bridge files in core under temporary compatibility allowlist with expiry date |
| D-04 | Versioning policy during migration | Program owner | T0 + 2 business days | Release policy note with sign-off | Single-version stream across core + adapters | Block release prep; define temporary dual-track policy and additional validation matrix before P4 |

**Go/No-Go Rule**: If any `D-01` to `D-04` remains unresolved at due time, migration progression is `No-Go` and only planning remediation is allowed.

### P0 Tasks

- Capture baseline build/test state.
- Produce host-specific file inventory mapped to target ownership.
- Define freeze window for high-churn host integration files.

### P0 Validation Checks

- `npm run build` passes from repo root and output is attached as evidence.
- `npm test` passes from repo root and output is attached as evidence.
- Inventory artifact lists source path, target owner, and disposition (`move`, `wrap`, `retain`) for all host-specific files.

### P0 Acceptance Criteria

- AC-P0-1: `Gate P0.0` decision table is complete with owner, due time, artifact, accepted option, and fallback for `D-01` to `D-04`.
- AC-P0-2: Baseline build and test outputs are recorded and timestamped.
- AC-P0-3: Freeze scope and timeline are documented and acknowledged by implementation owner.

### P0 Rollback Protocol

- Rollback owner: Program owner.
- Trigger threshold: Any missing or unapproved precondition decision at due time.
- Action: Halt migration, publish blocker note, and open planning remediation handoff within 1 business day.

## 5) Phase 1 - Repository Structure Migration

**Goal**: Establish package topology and complete deterministic path moves with compatibility preserved.

### Tasks

- Create `surfaces/`, `surfaces/pi/`, and `surfaces/opencode/` package topology.
- Move `pi-sinfonica-extension/` to `surfaces/pi/`.
- Create initial `surfaces/opencode/` skeleton.
- Add compatibility wrappers or documented forwarding references for legacy paths.

### Dependencies

- Requires `Gate P0.0 = Go` and `P0` acceptance complete.

### Validation Gate P1.1/P1.2 (Objective)

- Check C1: `npm run build` exits `0` after moves.
- Check C2: `npm test` exits `0` after moves.
- Check C3: `rg "pi-sinfonica-extension/"` only returns approved shim/deprecation references listed in migration notes.
- Check C4: Move manifest confirms all tracked Pi files are present under `surfaces/pi/`.

### Acceptance Criteria

- AC-P1-1: `surfaces/pi/` contains all migrated Pi files with no missing tracked files.
- AC-P1-2: `surfaces/opencode/` exists with minimal installable skeleton (`package.json`, `README.md`, `src/`, `tests/`).
- AC-P1-3: Legacy Pi path references are either removed or captured in approved shim allowlist.

### Rollback Protocol

- Rollback owner: Implementation owner.
- Trigger threshold: Required gate check (C1 to C4) fails after one fix attempt or remains unresolved for 60 minutes.
- Action: Revert Phase 1 move-only commits as one unit; restore pre-P1 baseline; file incident note with failing check ID.

## 6) Phase 2 - Core vs Adapter Boundary Enforcement

**Goal**: Enforce explicit ownership boundaries and remove host glue leakage from core.

### Tasks

- Define and approve boundary matrix (core-owned vs adapter-owned modules).
- Relocate OpenCode host concerns to `surfaces/opencode/` per approved matrix.
- Ensure adapter entrypoints consume core contracts/APIs as orchestration authority.

### Dependencies

- Depends on `P1` completion.

### Validation Gate P2.1/P2.2 (Objective)

- Check C5: `rg "opencode|pi" src/ --glob "*.ts"` returns only approved extension-point files listed in boundary allowlist.
- Check C6: Boundary matrix artifact maps each touched path to exactly one owner (`core` or named adapter).
- Check C7: `rg "from ['\"][^'\"]*src/(workflow|handoff|enforcement)" surfaces/opencode/ --glob "*.ts"` shows adapter imports only through approved public contracts/CLI APIs.

### Acceptance Criteria

- AC-P2-1: No host runtime/render/event logic remains in core except allowlisted extension points.
- AC-P2-2: Every migrated host-specific behavior maps to an adapter-owned path in the matrix.
- AC-P2-3: Boundary gate checks C5 to C7 pass and are archived.

### Rollback Protocol

- Rollback owner: Implementation owner.
- Trigger threshold: Any boundary check (C5 to C7) fails after one fix attempt or unresolved for 90 minutes.
- Action: Revert latest boundary relocation slice(s) while preserving P1 structure; reopen boundary matrix decision for failed paths.

## 7) Phase 3 - Contract Hardening and Compatibility

**Goal**: Standardize adapter contract and verify compatibility through repeatable tests.

### Tasks

- Finalize shared contract location per `D-03` decision artifact.
- Normalize adapter result/error schemas.
- Add cross-adapter compatibility tests with shared fixtures.

### Dependencies

- Depends on `P2` boundary completion.

### Validation Gate P3.1/P3.2 (Objective)

- Check C8: Contract tests for `surfaces/pi/` and `surfaces/opencode/` pass (`npm test -- <contract-test-target>` or equivalent documented command).
- Check C9: Required assertion set validates success/failure payload shapes for workflow start, step advance, and status/reporting operations.
- Check C10: Drift detection test fails when fixture schema intentionally mismatches (negative control documented once).

### Acceptance Criteria

- AC-P3-1: Shared contract artifact exists and is imported by each adapter package.
- AC-P3-2: Compatibility tests contain explicit assertions for required operation classes and pass on both adapters.
- AC-P3-3: Schema drift detection is present and tied to C10 evidence.

### Rollback Protocol

- Rollback owner: Implementation owner.
- Trigger threshold: C8 to C10 cannot be made green within 120 minutes or after one failed fix cycle.
- Action: Revert contract-normalization behavior commits (retain scaffolding), restore prior mapping layer, and re-open contract delta plan.

## 8) Phase 4 - Release Gates and Validation Matrix

**Goal**: Validate core and adapters with isolated, auditable release readiness checks.

### Tasks

- Add matrix validation for core and each adapter.
- Add adapter install smoke checks.
- Publish release readiness checklist.

### Dependencies

- Depends on `P3` stabilization.

### Validation Gate P4.1/P4.2 (Objective)

- Check C11: CI (or equivalent scripted run) reports separate pass/fail statuses for `core`, `surfaces/pi`, `surfaces/opencode`.
- Check C12: Failure isolation proves one adapter failure does not mask core status.
- Check C13: Smoke install checks are runnable via documented commands and produce timestamped outputs.

### Acceptance Criteria

- AC-P4-1: Validation matrix includes core + both adapters with distinct status outputs.
- AC-P4-2: Readiness checklist requires C11 to C13 evidence before sign-off.
- AC-P4-3: Required checks and optional checks are explicitly labeled.

### Rollback Protocol

- Rollback owner: Program owner (with implementation support).
- Trigger threshold: C11 fails twice consecutively for same lane or C12 cannot be demonstrated in one iteration.
- Action: Freeze release progression; revert latest CI matrix changes for failed lane; keep previously passing lanes unchanged.

## 9) Phase 5 - Documentation, Onboarding, and Cutover

**Goal**: Complete migration adoption with verifiable documentation and cutover closure.

### Tasks

- Publish support matrix (surfaces, paths, maintainers, support status).
- Publish new-adapter onboarding guide and required checklist.
- Remove or deprecate stale legacy path references.
- Complete cutover checklist and sign-off.

### Dependencies

- Depends on `P4` readiness.

### Validation Gate P5.1/P5.2 (Objective)

- Check C14: `rg "pi-sinfonica-extension/|legacy adapter path" docs/` returns only approved deprecation references.
- Check C15: Onboarding dry run checklist is completed by a reviewer not authoring the guide, with completion artifact.
- Check C16: Migration completion checklist has zero open critical blockers.

### Acceptance Criteria

- AC-P5-1: Support matrix is present and complete.
- AC-P5-2: New-adapter guide includes mandatory contract/test/release requirements.
- AC-P5-3: C14 to C16 evidence is archived and approved.

### Rollback Protocol

- Rollback owner: QA/review owner.
- Trigger threshold: C14 finds non-deprecated stale canonical references or C15 dry run fails once without same-day correction.
- Action: Block cutover declaration, restore temporary compatibility notes, and issue docs correction task before re-gating.

## 10) Cross-Phase Dependencies and Sequencing

- `P0 -> P1`: path moves blocked until `Gate P0.0` is `Go`.
- `P1 -> P2`: ownership enforcement requires finalized topology.
- `P2 -> P3`: contract hardening requires approved boundaries.
- `P3 -> P4`: release matrix depends on stable contract behavior.
- `P4 -> P5`: documentation cutover depends on validated release process.

## 11) Program-Level Gates and Required Evidence

- G1 Structural Integrity: backed by C1 to C4 evidence bundle.
- G2 Boundary Integrity: backed by C5 to C7 evidence bundle.
- G3 Contract Integrity: backed by C8 to C10 evidence bundle.
- G4 Release Readiness: backed by C11 to C13 evidence bundle.
- G5 Adoption Readiness: backed by C14 to C16 evidence bundle.

Each gate is pass/fail only. No subjective approvals without linked check evidence.

## 12) Commit Slicing (Preserved, with Gate Linkage)

1. `chore(repo): add surfaces package topology and placeholders` (supports P1 C1/C4)
2. `refactor(pi): move pi extension into surfaces/pi with path updates` (supports P1 C2/C3)
3. `refactor(opencode): introduce surfaces/opencode and migrate host glue` (supports P2 C5/C7)
4. `feat(contracts): add shared adapter contract and normalize payload/error schemas` (supports P3 C8/C9)
5. `test(adapters): add compatibility fixtures and cross-surface tests` (supports P3 C10)
6. `ci(release): add core+adapter matrix checks and smoke validations` (supports P4 C11/C13)
7. `docs(migration): publish support matrix, onboarding guide, and cutover notes` (supports P5 C14/C16)

Commit slicing rule remains unchanged: isolate file moves from behavior changes for rollback safety.

## 13) Execution-Readiness Checklist

- `Gate P0.0` decisions approved with artifacts and fallbacks recorded.
- Phase progression only after prior phase gate is `pass` with evidence IDs.
- Any rollback trigger threshold breach causes immediate halt and rollback by designated owner.
- Re-review can audit each finding remediation directly via Section 2 mapping and objective checks.
