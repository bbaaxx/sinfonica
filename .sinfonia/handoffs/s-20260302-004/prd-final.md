# PRD: Sinfonia Orchestration Framework (Retrospective Baseline)

## Problem Statement

AI-assisted software delivery often fails operationally due to inconsistent handoffs, loss of session context, and weak process guardrails. Sinfonia exists to provide a local-first orchestration framework that makes multi-agent workflows explicit, traceable, and enforceable through typed handoffs, durable state, and approval-driven progression.

## Product Scope (Current)

Sinfonia is a TypeScript/Node.js CLI framework that currently provides:

- Project bootstrap and runtime scaffolding via `sinfonia init`.
- Persona contract validation via `sinfonia validate`.
- Enforcement rule visibility via `sinfonia rules`.
- Built-in workflows (`create-prd`, `create-spec`, `dev-story`, `code-review`) with fixed persona routing.
- Session-level workflow state persistence in `.sinfonia/handoffs/<sessionId>/workflow.md`.
- Typed handoff envelopes (`dispatch`, `return`, `revision`, `direct`) and approval-gated advancement.
- Runtime enforcement rules for blocking, advisory, and context-injection behaviors.

## Stakeholders and Users

### Primary Users

- AI-assisted engineering teams running multi-step delivery workflows.
- Individual developers/operators bootstrapping or running Sinfonia in a local repository.

### Internal Stakeholders

- Framework maintainers responsible for contract stability and release quality.
- Persona/workflow authors extending or customizing workflow assets.

## Goals (Outcomes)

1. Establish a reliable orchestration baseline where all built-in workflows route to a deterministic persona map and execute in ordered steps.
2. Ensure each workflow session persists auditable state and decisions in a canonical index (`workflow.md`) that supports resume/recovery.
3. Enforce explicit, machine-checkable handoff and persona contracts to reduce ambiguity between agents.
4. Provide runtime safeguards that can block unsafe actions and surface actionable guidance without requiring external hosted infrastructure.
5. Maintain a local-first CLI onboarding path that can initialize a repository and validate core setup in a short command sequence.

## Non-Goals

- Replacing CI/CD, issue tracking, or external code-review platforms.
- Providing a hosted control plane or GUI in the current product shape.
- Defining product-specific business workflows for adopters (teams author their own custom workflows as needed).
- Guaranteeing software quality without team-defined standards beyond provided enforcement hooks.

## Confirmed Constraints

- Runtime is Node.js `>=20` and package is ESM (`"type": "module"`).
- Public CLI surface is limited to `init`, `validate`, and `rules`.
- Built-in workflow IDs and persona mappings are implementation contracts and must remain stable unless coordinated code+doc updates occur.
- Handoff contract keys and types are validated and must remain machine-readable.
- Product is local-first; no hosted service dependency is assumed by core workflows.

## Assumptions (Not Yet Confirmed)

- Adopting teams prioritize auditability and workflow discipline over minimal process overhead.
- Current built-in workflows represent the minimum viable default set for most users.
- Existing enforcement set (ENF-001..ENF-007 subset) is sufficient for baseline governance in early adoption.
- Success will be judged primarily by operational predictability and traceability rather than throughput metrics alone.

## User Stories and Acceptance Criteria

### Story 1: Repository bootstrap and readiness

As a developer, I want to initialize Sinfonia in my repository so that multi-agent workflows and guardrails are available immediately.

**Acceptance Criteria**

- [ ] Running `sinfonia init -y` creates `.sinfonia/` runtime structure and required generated artifacts documented in CLI reference.
- [ ] Re-running init without `--force` preserves user-managed files and remains idempotent.
- [ ] Generated setup supports immediate persona validation and rule inspection through documented commands.

### Story 2: Contract-safe role and handoff execution

As a maintainer, I want handoffs and persona definitions to be validated so that orchestration failures are caught early and consistently.

**Acceptance Criteria**

- [ ] Handoff envelopes use typed metadata and required sections for `dispatch`, `return`, `revision`, and `direct` contracts.
- [ ] Persona markdown validation returns non-zero errors when contracts are malformed and zero when valid.
- [ ] Self-hosting acceptance tests verify live-session envelopes pass validator checks.

### Story 3: Deterministic workflow orchestration with approvals

As a workflow operator, I want each workflow step to route and progress deterministically with approval gates so that team review is enforced before advancement.

**Acceptance Criteria**

- [ ] Workflow IDs map to fixed personas (`create-prd->libretto`, `create-spec->amadeus`, `dev-story->coda`, `code-review->rondo`).
- [ ] Return envelope approval advances state; rejection blocks state and can issue revision handoff.
- [ ] Unknown workflow IDs fail fast at dispatch.

### Story 4: Durable state, resume, and recovery

As a long-running session operator, I want workflow state to persist and resume after interruptions/compaction so that work can continue without manual reconstruction.

**Acceptance Criteria**

- [ ] Each session has a canonical `.sinfonia/handoffs/<sessionId>/workflow.md` with required frontmatter and sections.
- [ ] Compaction injection includes sufficient workflow/session context to support resume.
- [ ] Resume paths reconstruct current step index and session identity from persisted state.

### Story 5: Runtime safety and policy visibility

As a team lead, I want runtime enforcement rules to prevent unsafe operations and remain inspectable so that policy is transparent and actionable.

**Acceptance Criteria**

- [ ] Blocking rules can deny unsafe file access and non-test-first writes.
- [ ] Advisory and injection rules execute on registered hooks without blocking normal informational flows.
- [ ] `sinfonia rules` lists registered rules and supports machine-readable output (`--json`).

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR01 | CLI SHALL provide `init`, `validate`, and `rules` commands with documented behavior and exit semantics. | Must |
| FR02 | `init` SHALL scaffold runtime/persona/workflow support assets and support idempotent re-run behavior. | Must |
| FR03 | Workflow coordinator SHALL resolve built-in workflow IDs to fixed persona routes. | Must |
| FR04 | Orchestration SHALL create typed dispatch/return envelopes and support approval/revision flow control. | Must |
| FR05 | Session state SHALL persist in canonical `workflow.md` with auditable steps, artifacts, decisions, and session records. | Must |
| FR06 | System SHALL support resume from persisted index and compaction injection context. | Must |
| FR07 | Enforcement registry SHALL expose blocking, advisory, and injection rules and make active rules inspectable. | Must |
| FR08 | Persona and handoff contracts SHALL be validator-checkable and fail on structural violations. | Must |
| FR09 | Built-in workflow set (`create-prd`, `create-spec`, `dev-story`, `code-review`) SHALL remain operable end-to-end with tests. | Should |

## Requirement-to-Acceptance Traceability

| Requirement Group | FR IDs | Acceptance Criteria Mapping |
| --- | --- | --- |
| CLI bootstrap and command surface | FR01, FR02 | Story 1 AC1-AC3 |
| Contracts and validation | FR08 | Story 2 AC1-AC3 |
| Workflow routing and approvals | FR03, FR04 | Story 3 AC1-AC3 |
| Durable state and recovery | FR05, FR06 | Story 4 AC1-AC3 |
| Enforcement and policy visibility | FR07 | Story 5 AC1-AC3 |
| Built-in workflow continuity | FR09 | Story 3 AC1 + Story 4 AC1 + regression tests |

## Success Metrics

- 100% of built-in workflow routes resolve correctly in coordinator tests.
- 100% of session envelopes in acceptance fixtures validate with zero schema errors.
- 100% of required workflow state fields are present and parseable in `workflow.md` artifacts.
- 0 blocking-severity regressions allowing protected secret access paths.
- CLI validation command exits with contract-correct status codes (`0` success, `1` validation errors).

## Dependencies and Sequencing Constraints

1. `init` scaffolding assets must exist before persona validation and practical workflow execution.
2. Persona/handoff contract integrity is a prerequisite for reliable coordinator dispatch and approval flow.
3. Workflow index persistence must be reliable before resume/compaction continuity can be trusted.
4. Enforcement registry availability is required for policy-aware execution and transparent rule listing.
5. Technical specification stage should sequence after this retrospective PRD baseline is accepted and open governance decisions are closed.

## Phased Scope

### Phase 0 (Already Implemented Baseline)

- Local CLI commands (`init`, `validate`, `rules`).
- Built-in workflow orchestration and persona routing.
- Typed handoff contracts and validation.
- Workflow index persistence and resume/compaction hooks.
- Enforcement registry with active blocking/advisory/injection rules.

### Phase 1 (Spec-Ready Clarification Work)

- Convert retrospective requirements into explicit technical interfaces and module-level boundaries for extension points.
- Define measurable adoption/operational SLO targets (beyond contract-level correctness).
- Confirm backward-compatibility policy for workflow IDs, envelope schema fields, and rule IDs.

### Phase 2 (Future Expansion - Out of Immediate Spec Scope)

- Additional workflow packs and richer policy profiles.
- Potential non-CLI surfaces, if product strategy explicitly expands beyond local-first CLI.

## Risks and Mitigations

- **Risk:** Contract drift between docs, workflow assets, and runtime types may break orchestration continuity.
  **Mitigation:** Treat workflow IDs, handoff keys, and status enums as governed contracts with mandatory test+doc updates.
- **Risk:** Enforcement false positives/negatives can reduce trust in guardrails.
  **Mitigation:** Maintain rule-level tests and expose rule inventory through CLI for operator inspection.
- **Risk:** Ambiguous approval/revision semantics can stall pipelines.
  **Mitigation:** Keep approval outcomes explicit (`advanced`, `held`, `revision-sent`) and recorded in workflow decisions.
- **Risk:** Retrospective PRD may miss unstated business goals.
  **Mitigation:** Track unresolved business metrics and governance decisions as pre-spec closure items.

## Open Questions / Evidence Gaps

1. What adoption targets (team count, workflow run frequency, success-rate thresholds) should define product success beyond technical correctness?
2. What backward-compatibility window is required for handoff schema/workflow ID changes across releases?
3. Should enforcement rules be user-configurable by policy profile at runtime, or remain fixed defaults in current stage?

## Evidence Base

- `README.md`
- `docs/overview/product-overview.md`
- `docs/overview/use-cases.md`
- `docs/reference/cli-reference.md`
- `docs/reference/types-and-contracts.md`
- `docs/workflows/workflow-catalog.md`
- `src/workflow/coordinator.ts`
- `src/workflow/index-manager.ts`
- `src/handoff/types.ts`
- `src/enforcement/registry.ts`
- `tests/self-hosting/acceptance.test.ts`
