# Technical Specification: Sinfonia Orchestration Framework (Retrospective Baseline)

## 1) Scope and Objective

This specification translates the approved retrospective PRD baseline into implementation-ready architecture contracts for Sinfonia's local-first orchestration runtime.

In scope:
- Deterministic workflow routing and approval-gated progression.
- Canonical persisted workflow state (`workflow.md`) and resume/recovery behavior.
- Typed handoff envelope contracts and validation behavior.
- Enforcement registry contract and policy configurability model.
- Validation and test traceability to PRD FR01-FR09.

Out of scope:
- New hosted control-plane surfaces.
- Changes to built-in workflow IDs or persona IDs without migration process.

## 2) Architectural Boundaries and Ownership

### 2.1 CLI Boundary

Owner modules:
- `src/cli/program.ts`
- `src/cli/init.ts`
- `src/cli/validate.ts`
- `src/cli/rules.ts`

Responsibilities:
- Parse and validate user command inputs.
- Invoke orchestration/validation/enforcement read surfaces.
- Return documented exit codes.

Non-responsibilities:
- No direct mutation of workflow index internals.
- No handoff schema parsing logic.

### 2.2 Workflow Runtime Boundary

Owner modules:
- `src/workflow/coordinator.ts`
- `src/workflow/step-engine.ts`
- `src/workflow/index-manager.ts`

Responsibilities:
- Resolve workflow->persona routes through `WORKFLOW_PERSONA_MAP`.
- Create and update canonical workflow state atomically.
- Dispatch/approval/revision/retry/skip/abort orchestration flow.
- Resume from persisted index and compaction injection.

Non-responsibilities:
- No persona schema validation.
- No direct enforcement policy registry mutations.

### 2.3 Handoff Boundary

Owner modules:
- `src/handoff/types.ts`
- `src/handoff/writer.ts`
- `src/handoff/reader.ts`
- `src/handoff/validator.ts`
- `src/handoff/approval.ts`

Responsibilities:
- Define envelope metadata and body section contracts.
- Write structured envelopes with sequence/session metadata.
- Validate contract correctness (field, format, section, and type checks).
- Apply approval decisions and emit revision envelopes on rejection.

### 2.4 Enforcement Boundary

Owner modules:
- `src/enforcement/registry.ts`
- `src/enforcement/rules/*`

Responsibilities:
- Register and expose active rules for blocking/advisory/injection hooks.
- Provide machine-readable inventory via CLI.

### 2.5 Persona/Validation Boundary

Owner modules:
- `src/persona/loader.ts`
- `src/validators/persona/validator.ts`

Responsibilities:
- Validate persona contract integrity.
- Supply persona existence checks used by handoff validation.

## 3) Canonical Data Contracts

### 3.1 Workflow Index Contract (`workflow.md`)

File location:
- `.sinfonia/handoffs/<sessionId>/workflow.md`

Frontmatter schema (required):
- `workflow_id: string`
- `workflow_status: created|in-progress|complete|blocked|failed`
- `current_step: string`
- `current_step_index: number`
- `total_steps: number`
- `session_id: string`
- `created_at: ISO-8601 string`
- `updated_at: ISO-8601 string`

Body sections (required, in markdown):
- `## Goal` (free text)
- `## Steps` (table)
- `## Artifacts` (table)
- `## Decisions` (table)
- `## Sessions` (table)
- `## Context` (free text)

State transition constraints (enforced in `index-manager.ts`):
- `created -> {created, in-progress, blocked, failed}`
- `in-progress -> {in-progress, complete, blocked, failed}`
- `complete -> {complete}`
- `blocked -> {blocked, in-progress, failed}`
- `failed -> {failed, in-progress}`

### 3.2 Handoff Envelope Contract

Supported handoff types:
- `dispatch`
- `return`
- `revision`
- `direct`

Frontmatter schema (required):
- `handoff_id: string`
- `session_id: string`
- `sequence: number (1..999)`
- `source_persona: kebab-case string`
- `target_persona: kebab-case string`
- `handoff_type: dispatch|return|revision|direct`
- `status: pending|completed|blocked`
- `created_at: ISO-8601 string`
- `word_count: number <= 500 and exact match`

Required sections by type:
- `dispatch`: Artifacts, Task, Context, Constraints
- `return`: Artifacts, Summary, Completion Assessment, Blockers, Recommendations
- `revision`: Artifacts, Revision Required, Feedback, Next Steps
- `direct`: Artifacts, Message

Validation rule contracts:
- Must fail on missing required metadata/sections.
- Must fail on malformed IDs/status/type/date.
- Must fail when dispatch target persona is unknown.
- Must fail when dispatch constraints are not bullet-list lines.

### 3.3 Workflow Routing Contract

`WORKFLOW_PERSONA_MAP` (stable contract):
- `create-prd -> libretto`
- `create-spec -> amadeus`
- `dev-story -> coda`
- `code-review -> rondo`

Unknown workflow behavior:
- `resolvePersona` returns `null`.
- Dispatch path must fail fast with explicit error.

### 3.4 Enforcement Rule Contract

Rule schema:
- `id: string` (stable ID, e.g., ENF-001)
- `name: string`
- `description: string`
- `severity: blocking|advisory|injection`
- `hook: tool.execute.before|session.idle|experimental.session.compacting|shell.env`
- `layer: plugin|persona|dual`
- `enabled: boolean`

Registry behavior:
- Idempotent registration by `id`.
- Sorted list output by `id`.
- CLI list serialization must preserve machine-readable fields.

## 4) Runtime Data Flow and State Transitions

### 4.1 Initialization Flow
1. CLI receives `init`/workflow start command context.
2. `coordinator.initPipeline` validates config and creates session dir.
3. `index-manager.createWorkflowIndex` writes atomic `workflow.md`.
4. Session starts at `workflow_status=created`, `current_step_index=1`.

### 4.2 Dispatch and Delegation Flow
1. `coordinator.dispatchStep` resolves persona from mapping.
2. `handoff.writer.writeHandoffEnvelope` writes dispatch envelope.
3. Delegation context is formatted and tracked in index artifacts.
4. Orchestration cue is emitted for operator visibility.

### 4.3 Return Approval Flow
1. Incoming return envelope is validated.
2. `approval.applyApprovalDecision` annotates envelope approval metadata.
3. Decision recorded in workflow index.
4. On approve: advance `current_step_index`; terminal state `complete` when last step passed.
5. On reject: set workflow to `blocked`; generate revision handoff.

### 4.4 Failure Recovery Flow
1. Coordinator classifies failure: missing-envelope, blocked, partial-return.
2. Operator chooses `retry|skip|abort`.
3. Retry re-dispatches with failure notes appended to context.
4. Skip advances index with decision note.
5. Abort marks workflow `failed` and records terminal decision.

### 4.5 Resume and Compaction Continuity Flow
1. Resume reads canonical workflow index state.
2. Compaction injection stores minimal workflow/session context.
3. Resume-from-injection reconstructs session ID and step position.

## 5) Required Clarifications Carried from PRD (Resolved for Implementation)

### 5.1 Success/Adoption Targets Beyond Contract Correctness

Decision:
- Adopt operational SLOs for a 30-day rolling window in addition to schema correctness.

SLO set:
- Workflow run completion rate >= 95% for built-in workflows.
- Approval-loop recovery rate >= 90% for rejected returns resolved without manual state edits.
- Resume success rate >= 99% for sessions with valid `workflow.md`.
- Rule transparency SLO: `sinfonia rules --json` returns parseable output in 100% of CI runs.

Justification:
- PRD currently measures correctness only; these SLOs make reliability and adoption testable.

### 5.2 Backward-Compatibility Policy Window

Decision:
- Contract stability window: two minor releases or 90 days (whichever is longer) for workflow IDs, handoff frontmatter keys, section names, and enforcement rule IDs.

Compatibility policy:
- Additive changes (new optional fields/sections): allowed within window.
- Breaking changes: require deprecation period, migration notes, and dual-parse support during window.
- Built-in workflow/persona route changes: blocked unless accompanied by migration + release note + regression tests.

Justification:
- Preserves self-hosting continuity and prevents fixture/test drift.

### 5.3 Enforcement Configurability Model

Decision:
- Phase 1 model: fixed defaults active at runtime.
- Optional policy profiles introduced as explicit config preset files in later phase, not ad hoc per-rule runtime toggles.

Rationale:
- Current registry is static and deterministic; profile layer can be added without destabilizing core hooks.

Profile contract (future-safe, not required for baseline implementation):
- `policy_profile_id: string`
- `extends?: string`
- `overrides: { [rule_id]: { enabled?: boolean; severity?: advisory|blocking|injection } }`

## 6) API and Module Contracts (Implementation-Facing)

### 6.1 Coordinator API Surface

Stable exported operations:
- `initPipeline(cwd, config, goal, sessionId?) -> PipelineSession`
- `dispatchStep(cwd, sessionId, stepIndex, workflowName, task, context, constraints?) -> DispatchResult`
- `processReturnEnvelope(cwd, sessionId, envelopePath, decision, reviewer, note?) -> ApprovalResult`
- `detectFailureType(envelopePath|null) -> FailureType`
- `handleFailure(...) -> ErrorHandlingResult`
- `resumePipeline(cwd, sessionId) -> ResumeResult`
- `resumeFromInjection(cwd, injection) -> ResumeResult`
- `getCompactionInjection(cwd, sessionId) -> string`

Preconditions:
- `workflowName` must be mapped.
- Envelope path must exist for approval processing.
- Workflow index path must be readable for resume/advance.

Postconditions:
- `initPipeline` always creates canonical index or throws.
- `processReturnEnvelope` records approval decision and returns orchestration cue.
- Rejection path may emit a revision envelope and block workflow.

### 6.2 Index Manager API Surface

Stable exported operations:
- `workflowIndexPath(cwd, sessionId) -> string`
- `createWorkflowIndex(options) -> WorkflowIndex`
- `readWorkflowIndex(path) -> WorkflowIndex`
- `updateWorkflowIndex(path, patch) -> WorkflowIndex`
- `addDecision(cwd, sessionId, decision) -> void`
- `addArtifact(cwd, sessionId, artifact) -> void`

Guarantees:
- Atomic write via temp-file + fsync + rename.
- Status transition validation before write.

### 6.3 Handoff Validation API Surface

Stable exported operation:
- `validateHandoffEnvelope(filePath) -> { errors[], warnings[] }`

Validation invariants:
- Zero errors is required for contract-safe progression.
- Warnings are non-fatal, but must be observable.

### 6.4 Enforcement Read API Surface

Stable exported operations:
- `listRules() -> EnforcementRule[]`
- `getRuleById(id) -> EnforcementRule|undefined`

Behavioral guarantee:
- `sinfonia rules --json` is informational and returns exit code `0`.

## 7) Implementation Units and Dependency Sequencing

### Unit A: Contract Normalization and Docs Lock
- Deliverable: updated reference docs and explicit compatibility statement.
- Depends on: approved decisions in section 5.
- Validation: docs review + schema fixtures unchanged.

### Unit B: Compatibility Guard Tests
- Deliverable: regression tests asserting routing map stability, required sections, and frontmatter keys.
- Depends on: Unit A contract lock.
- Validation: focused tests for `coordinator`, `handoff/validator`, and `cli/rules`.

### Unit C: Operational SLO Instrumentation Surface
- Deliverable: non-invasive metrics collection points (run outcome counters, resume success, approval outcomes).
- Depends on: Unit B to avoid contract drift.
- Validation: unit tests proving counters/events emitted for approve/reject/retry/abort paths.

### Unit D: Policy Profile Design Stub (No Runtime Toggle Yet)
- Deliverable: schema/spec and parser scaffold for profile files, disabled by default.
- Depends on: Unit A and Unit B.
- Validation: config parser tests; no change to default behavior.

Sequencing rationale:
- Contracts first, then regression safety, then observability, then extensibility; this minimizes risk of silent runtime drift.

## 8) Validation Strategy and FR Traceability

FR-to-validation mapping:
- FR01/FR02: `tests/cli/init.test.ts`, CLI command tests, idempotency checks.
- FR03/FR04: `tests/workflow/coordinator.test.ts`, `tests/self-hosting/acceptance.test.ts` (SH-1, SH-2, SH-4).
- FR05/FR06: `tests/workflow/index-manager.test.ts`, compaction/resume tests (SH-5).
- FR07: `tests/enforcement/*` and `tests/cli/rules*.test.ts` for rule inventory and JSON output.
- FR08: `tests/handoff/validator.test.ts`, persona validator tests, SH-2 and SH-8.
- FR09: end-to-end self-hosting acceptance coverage and workflow fixture validation.

Release gate criteria:
- Build passes (`npm run build`).
- Full tests pass (`npm test`).
- No regression in handoff schema validator error rules.
- No changes to built-in routing contract without migration note.

## 9) Risk Register

1. Contract drift across docs/types/tests.
- Impact: High; Likelihood: Medium.
- Mitigation: compatibility guard tests + docs lock in Unit A/B.

2. Non-fatal warning behavior masking persistent state issues.
- Impact: Medium; Likelihood: Medium.
- Mitigation: add explicit warning counters in Unit C and fail CI on threshold.

3. Enforcement profile introduction weakening deterministic defaults.
- Impact: High; Likelihood: Low (if sequenced).
- Mitigation: keep default fixed; profile feature behind explicit opt-in and schema validation.

4. Resume/compaction mismatch after schema evolution.
- Impact: High; Likelihood: Medium.
- Mitigation: dual-parse compatibility window and round-trip tests mandatory for breaking proposals.

## 10) Assumptions and Open Items

Assumptions:
- Existing module boundaries remain within single package (no service decomposition).
- Workflow IDs/persona IDs are governed contracts.
- Teams accept explicit approval gating overhead for auditability.

Open technical questions:
- None blocking implementation under this specification, provided Section 5 decisions are approved by maintainers.

## 11) Evidence Base

- `.sinfonia/handoffs/s-20260302-004/prd-final.md`
- `.sinfonia/handoffs/s-20260302-004/return-02-libretto.md`
- `docs/reference/types-and-contracts.md`
- `docs/architecture/component-model.md`
- `src/workflow/coordinator.ts`
- `src/workflow/index-manager.ts`
- `src/workflow/step-engine.ts`
- `src/handoff/types.ts`
- `src/handoff/writer.ts`
- `src/handoff/validator.ts`
- `src/handoff/approval.ts`
- `src/enforcement/registry.ts`
- `src/cli/rules.ts`
- `tests/self-hosting/acceptance.test.ts`
