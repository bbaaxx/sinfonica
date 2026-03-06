# Workflow: Per-Workflow Phase Maps

## Meta
- workflow_id: per-workflow-phase-maps
- workflow_status: complete
- current_step_index: 4
- total_steps: 4
- created: 2026-03-06
- completed: 2026-03-06
- persona: maestro

## Goal
Allow custom Sinfonica workflows to define their own phase-to-tool mappings, replacing the hardcoded `DEFAULT_PHASE_TOOL_MAP` with workflow-specific configuration.

## Context
- Current state: `DEFAULT_PHASE_TOOL_MAP` in `surfaces/pi/src/orchestration/phase-tools.ts` applies to all workflows
- Problem: Different workflows may need different tool restrictions per phase
- Solution: Load phase maps from workflow definitions or config

## Stages

1. **Requirements Analysis** (Libretto)
   - Status: completed
   - Define what per-workflow phase maps look like
   - Determine config format and loading mechanism

2. **Technical Spec** (Amadeus)
   - Status: completed
   - Design API changes to phase-tools.ts and policy.ts
   - Define workflow definition schema extension

3. **Implementation** (Coda)
   - Status: completed
   - Implement phase map loading
   - Update policy resolution to use workflow-specific maps
   - Add tests

4. **Review** (Rondo)
   - Status: completed
   - Code review and acceptance testing
   - Verdict: APPROVE (0 blocking, 1 advisory, 1 nit - addressed)

## Decisions
- Use `workflow.md` frontmatter key `phase_tool_map` for per-workflow policy configuration.
- Support partial overrides: unspecified phases inherit from `DEFAULT_PHASE_TOOL_MAP`.
- Include hot-reload behavior via `/sinfonica reload` cache invalidation.

## Artifacts
- `.sinfonica/handoffs/s-20260306-001/prd-per-workflow-phase-maps.md` (Libretto PRD)
- `.sinfonica/handoffs/s-20260306-001/return-01-libretto.md` (Libretto return envelope)
- `.sinfonica/handoffs/s-20260306-001/spec-per-workflow-phase-maps.md` (Amadeus technical spec)
- `.sinfonica/handoffs/s-20260306-001/return-02-amadeus.md` (Amadeus return envelope)
- `.sinfonica/handoffs/s-20260306-001/return-03-coda.md` (Coda return envelope)
- `.sinfonica/handoffs/s-20260306-001/return-04-rondo.md` (Rondo return envelope - APPROVE)
