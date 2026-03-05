# Multi-Surface Adapter Migration Plan (Phase-by-Phase)

## 1) Scope Extraction

### Confirmed Constraints

- Source strategy: `Multi_Surface_Adapter_Strategy.md` is the governing input for migration direction.
- Planning stage only: produce executable migration plan; no implementation code required in this stage.
- Migration goal: move from mixed surface integration to dedicated adapter packages under `surfaces/`.
- Required outputs: deterministic sequencing, dependencies, core-vs-adapter boundaries, acceptance criteria, validation checks, risk mitigation, and commit slicing.
- Existing reference: `.sinfonica/plans/Pi_Surface_Addition.md` provides implementation detail patterns for the Pi surface.

### Stakeholders

- Primary: `@sinfonica-maestro` (orchestration and execution owner for rollout).
- Secondary: surface adapter contributors (OpenCode, Pi, future Claude), release maintainers, QA/review owners.

### Outcomes

- Sinfonica core remains surface-agnostic and stable.
- Host-specific behavior is isolated in adapter packages.
- Rollout can be executed safely in small, verifiable slices.

### Assumptions (Not Yet Confirmed)

- Base package manager/workspace model can support nested adapter packages under `surfaces/` without introducing a monorepo tooling migration.
- Existing `pi-sinfonica-extension/` code is still the canonical Pi integration baseline to migrate.
- OpenCode-specific integration concerns currently split across root config/assets can be safely centralized into `surfaces/opencode/` without external compatibility breakage if compatibility shims are added.
- Initial release stream remains single-version across core + adapters until at least three adapters demand independent cadence.

## 2) Scope Boundaries

### In Scope (Migration Program)

- Create standardized adapter package topology under `surfaces/`.
- Relocate Pi integration package into `surfaces/pi/`.
- Create OpenCode adapter package in `surfaces/opencode/` and route host glue there.
- Define/normalize shared adapter contract surface and cross-adapter compatibility tests.
- Add validation/release matrix and documentation for supported surfaces + onboarding.

### Out of Scope (For This Migration)

- Rewriting core workflow/handoff/enforcement semantics.
- Shipping net-new host features beyond parity migration.
- Independent adapter versioning rollout in this cycle.

## 3) Phase Plan and Sequencing

## Phase 0 - Preconditions and Freeze

**Goal**: Establish a controlled migration baseline and explicit no-regression target.

**Tasks**
- Baseline current passing build/test state for core and existing Pi integration references.
- Inventory current host-specific files (OpenCode + Pi) and map to target `surfaces/<name>/` ownership.
- Define migration freeze window for high-churn host integration files.

**Dependencies**
- None.

**Validation Gate**
- Gate P0.1: Baseline test/build results and file inventory are captured in migration notes and approved by rollout owner.

**Acceptance Criteria**
- AC-P0-1: Current integration touchpoints are explicitly listed with source path, target package owner, and migration disposition (move, wrap, or retain).
- AC-P0-2: Freeze scope and timeline are documented and acknowledged by implementation owner.

**Risks / Mitigations / Rollback**
- Risk: hidden host coupling missed during inventory.
- Mitigation: include grep-based keyword inventory for host-specific identifiers (`opencode`, `pi`, extension loader entrypoints).
- Rollback: do not start path moves until inventory sign-off completes.

## Phase 1 - Repository Structure Migration

**Goal**: Establish package topology and perform deterministic path moves with compatibility preserved.

**Tasks**
- Create `surfaces/` root with package directories: `surfaces/pi/`, `surfaces/opencode/`.
- Move `pi-sinfonica-extension/` into `surfaces/pi/`.
- Create initial `surfaces/opencode/` package skeleton (`package.json`, `README.md`, `src/`, `tests/`).
- Add temporary compatibility wrappers or forwarding docs/entry references where old paths are externally referenced.

**Required File/Path Moves**
- `pi-sinfonica-extension/` -> `surfaces/pi/`
- Introduce: `surfaces/opencode/package.json`, `surfaces/opencode/README.md`, `surfaces/opencode/src/`, `surfaces/opencode/tests/`

**Dependencies**
- Depends on Phase 0 inventory/sign-off.

**Validation Gate**
- Gate P1.1: Repository builds/tests pass with moved Pi package and no broken import/path references.
- Gate P1.2: Legacy references to old Pi path either updated or intentionally shimmed with documented deprecation notes.

**Acceptance Criteria**
- AC-P1-1: `surfaces/pi/` contains all previously tracked Pi extension files with functional parity.
- AC-P1-2: `surfaces/opencode/` exists with minimal installable package skeleton.
- AC-P1-3: No unresolved references to removed legacy paths in code/docs/scripts.

**Risks / Mitigations / Rollback**
- Risk: path-move blast radius breaks tests/docs/scripts.
- Mitigation: perform move-only commit first; run full test/build before functional edits.
- Rollback: revert only Phase 1 move commits as a unit if baseline gates fail and cannot be patched quickly.

## Phase 2 - Core vs Adapter Boundary Enforcement

**Goal**: Codify ownership boundaries so host glue does not leak into core orchestration.

**Tasks**
- Define boundary matrix (core-owned modules vs adapter-owned modules) and align file ownership.
- Relocate host-specific OpenCode concerns from core paths to `surfaces/opencode/` where feasible.
- Ensure adapters call into core CLI/contracts APIs instead of duplicating orchestration logic.

**Dependencies**
- Depends on Phase 1 topology completion.

**Validation Gate**
- Gate P2.1: Static review confirms no host event/render/runtime-specific logic left in core-owned modules beyond explicit extension points.
- Gate P2.2: Adapter entrypoints consume core contracts/CLI paths as the orchestration authority.

**Acceptance Criteria**
- AC-P2-1: Core ownership list maps cleanly to `src/` orchestration, handoff, enforcement semantics, and shared utilities only.
- AC-P2-2: Adapter ownership list maps to host subscriptions/tools/rendering/install metadata only.
- AC-P2-3: At least one reviewer can trace each host-specific behavior to an adapter package without ambiguous ownership.

**Risks / Mitigations / Rollback**
- Risk: accidental semantic changes while relocating code.
- Mitigation: use parity-first migration; prohibit feature expansion in boundary phase.
- Rollback: revert individual relocation commit slices, retaining structure setup from Phase 1.

## Phase 3 - Adapter Contract Hardening and Compatibility

**Goal**: Standardize adapter contract and error/result semantics across surfaces.

**Tasks**
- Define shared adapter contract location (either dedicated package or `src/surfaces/contracts.ts`) and freeze minimal interface.
- Normalize adapter result payload format and error mapping taxonomy.
- Add cross-adapter compatibility tests covering contract fixtures and representative success/failure flows.

**Dependencies**
- Depends on boundary agreement from Phase 2.

**Validation Gate**
- Gate P3.1: Contract tests pass for both `surfaces/pi/` and `surfaces/opencode/` against shared fixtures.
- Gate P3.2: Error/result schema checks pass for required operation classes (workflow start, step advance, status/reporting).

**Acceptance Criteria**
- AC-P3-1: Shared contract artifact exists and is referenced by all adapter packages.
- AC-P3-2: Adapter outputs conform to normalized result/error schemas in test assertions.
- AC-P3-3: Contract drift detection exists via compatibility tests that fail on schema mismatch.

**Risks / Mitigations / Rollback**
- Risk: over-designing contract too early blocks migration velocity.
- Mitigation: lock a minimal v1 contract and defer optional fields/extensions.
- Rollback: keep previous adapter-local mapping layer while iterating contract in a feature branch until tests stabilize.

## Phase 4 - Release Gates and CI Matrix

**Goal**: Ensure each adapter and core can be validated/released consistently.

**Tasks**
- Add matrix validation coverage: core build/tests + adapter build/tests per surface.
- Add optional adapter install smoke checks.
- Define adapter readiness checklist (build, tests, docs, install verification, known issues).

**Dependencies**
- Depends on Phase 3 contract stabilization.

**Validation Gate**
- Gate P4.1: CI (or equivalent scripted checks) runs and reports distinct pass/fail by core and each adapter.
- Gate P4.2: Readiness checklist is required for release candidate sign-off.

**Acceptance Criteria**
- AC-P4-1: Validation matrix includes at minimum core + `surfaces/pi/` + `surfaces/opencode/`.
- AC-P4-2: Failure in one adapter is isolated and reported without obscuring core status.
- AC-P4-3: Install smoke checks are documented and repeatable.

**Risks / Mitigations / Rollback**
- Risk: CI duration and complexity increase.
- Mitigation: tier checks (required vs optional) and parallelize adapter jobs.
- Rollback: temporarily mark smoke checks non-blocking while preserving build/test blockers.

## Phase 5 - Documentation, Onboarding, and Cutover

**Goal**: Complete migration adoption with clear contributor and user guidance.

**Tasks**
- Publish root support matrix for all surfaced adapters and status.
- Add contributor guide for adding a new adapter package using standardized template.
- Update references from legacy paths to `surfaces/<name>/` and deprecate old docs.
- Execute cutover checklist and declare migration completion.

**Dependencies**
- Depends on Phase 4 readiness gates.

**Validation Gate**
- Gate P5.1: Docs validation confirms no stale canonical references to pre-migration adapter locations.
- Gate P5.2: New adapter onboarding dry run can be completed using contributor guide without implicit tribal knowledge.

**Acceptance Criteria**
- AC-P5-1: Root matrix lists supported surfaces, package paths, maintainer ownership, and support status.
- AC-P5-2: New-adapter guide includes mandatory contract/tests/release checks.
- AC-P5-3: Migration completion checklist signed off with no open critical blockers.

**Risks / Mitigations / Rollback**
- Risk: stale docs create misconfigured downstream integrations.
- Mitigation: docs link audit plus explicit deprecation notes for legacy references.
- Rollback: reintroduce short-term compatibility notes and redirects while docs corrections land.

## 4) Cross-Phase Dependency Graph

- P0 -> P1 (inventory and freeze are preconditions for safe path moves).
- P1 -> P2 (ownership enforcement requires target topology present).
- P2 -> P3 (contract normalization requires clear ownership boundary).
- P3 -> P4 (CI/release matrix depends on stable shared contract).
- P4 -> P5 (documentation cutover depends on validated release process).

## 5) Validation Gates (Program-Level)

- G1 Structural Integrity: moved paths resolve, imports/scripts/docs updated.
- G2 Behavioral Parity: no regression in baseline flows after relocation.
- G3 Contract Integrity: adapter outputs/errors conform to shared contract fixtures.
- G4 Release Readiness: core + each adapter pass defined checks.
- G5 Adoption Readiness: docs and onboarding enable immediate implementation kickoff.

## 6) Recommended Commit Slicing

1. `chore(repo): add surfaces package topology and placeholders`
   - Create `surfaces/` tree and package skeletons only.
2. `refactor(pi): move pi extension into surfaces/pi with path updates`
   - Pure move + path/document/script reference updates.
3. `refactor(opencode): introduce surfaces/opencode and migrate host glue`
   - Relocate OpenCode-specific integration concerns.
4. `feat(contracts): add shared adapter contract and normalize payload/error schemas`
   - Contract definitions and adapter conformance updates.
5. `test(adapters): add compatibility fixtures and cross-surface tests`
   - Adapter contract test suite and fixture enforcement.
6. `ci(release): add core+adapter matrix checks and smoke validations`
   - Pipeline/checklist updates.
7. `docs(migration): publish support matrix, onboarding guide, and cutover notes`
   - Docs-only completion commit.

Commit slicing rule: keep file moves isolated from behavior changes to simplify rollback and review.

## 7) Kickoff Checklist for Implementation Stage

- Confirm assumptions requiring stakeholder decision:
  - contract location choice (`dedicated package` vs `src/surfaces/contracts.ts`)
  - versioning stream remains single-version for this migration cycle
- Start with P0 evidence capture and sign-off.
- Execute phases in order with mandatory gate checks at each boundary.
- If a gate fails, halt progression and issue revision handoff with blocker details.
