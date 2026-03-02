# Dispatch Envelope

- Session: `s-20260302-004`
- Workflow: `dev-story`
- Stage: `05-implementation`
- Delegate: `@sinfonia-coda`
- Date: `2026-03-02`

## Objective

Implement the approved technical specification for the Sinfonia orchestration baseline using test-driven, contract-safe increments.

## Inputs

- PRD (canonical): `.sinfonia/handoffs/s-20260302-004/prd-final.md`
- PRD return: `.sinfonia/handoffs/s-20260302-004/return-02-libretto.md`
- Spec (canonical): `.sinfonia/handoffs/s-20260302-004/spec-final.md`
- Spec return: `.sinfonia/handoffs/s-20260302-004/return-04-amadeus.md`

## Implementation Scope (Initial Pass)

Follow sequencing from spec Section 7:

1. Unit A: Contract normalization/docs lock.
2. Unit B: Compatibility guard tests.
3. Unit C: Operational SLO instrumentation surface.
4. Unit D: Policy profile design stub (disabled by default).

## Constraints

- Preserve stable workflow ID, persona route, handoff key, and rule ID contracts.
- Implement with focused, minimal edits and matching repository conventions.
- Update/add tests for all behavior changes.
- Run focused tests during iteration, then `npm run build` and `npm test` before return.
- If any scope cannot be completed, return explicit blockers and partial completion evidence.

## Expected Outputs

1. Code/test/doc artifacts committed in working tree (no git commit unless requested separately).
2. Return envelope summarizing:
   - completed units and artifact paths,
   - validation evidence (commands + outcomes),
   - residual risks/open items,
   - approve/revise recommendation for review stage.

## Acceptance Criteria

- Implemented changes align to approved spec contracts and sequencing rationale.
- Compatibility guard tests protect core routing and envelope contract stability.
- No regression in baseline build/test gates.
- Return envelope includes explicit approve/revise recommendation.

## Execution Instruction

`@sinfonia-coda` please read and execute this dispatch envelope and write your return envelope in this same session directory.
