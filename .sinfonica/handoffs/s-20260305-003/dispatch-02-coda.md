---
handoff_id: s-20260305-003-003
session_id: s-20260305-003
sequence: 3
source_persona: maestro
target_persona: coda
handoff_type: dispatch
status: pending
created_at: 2026-03-05T19:00:00Z
word_count: 490
---

## Task

Implement the Pi-Native Orchestration Refactor across 6 phases (WS-API, WS2, WS1, WS3, WS4, WS5) per the corrected technical spec produced by the architect at `.sinfonica/handoffs/s-20260305-003/return-01-amadeus.md`.

## Context

The Sinfonica Pi surface extension at `surfaces/pi/` must be refactored from CLI-emulation fallback patterns to Pi-native extension capabilities. The architect has reviewed the plan against the actual Pi API and produced a corrected spec with 9 API mismatches to fix and 6 implementation phases.

**Key reference files:**
- `.sinfonica/handoffs/s-20260305-003/return-01-amadeus.md` — Corrected technical spec (READ THIS FIRST)
- `pi_integration_plan.md` — Original refactor plan (for objectives/acceptance criteria)
- `surfaces/pi/index.ts` — Current extension entry point
- `surfaces/pi/src/` — Current modules
- `surfaces/pi/tests/` — Existing test files

## Constraints

- Follow the architect's recommended execution order: WS-API → WS2 → WS1 → WS3 → WS4 → WS5
- Use TDD discipline: write/update tests before or alongside implementation for each phase
- Run focused tests after each phase (`npm test -- surfaces/pi/tests/`)
- Run full build + all tests at the end (`npm run build && npm test`)
- Follow repo conventions from `AGENTS.md` (ESM, strict TS, kebab-case files, etc.)
- Keep changes to `surfaces/pi/` only — do NOT modify Sinfonica core (`src/`)
- Create new `surfaces/pi/src/orchestration/` directory for WS1 modules
- Create new `surfaces/pi/tests/phase7-policy-gating.test.ts` for policy/evidence tests
- The `@sinclair/typebox` import: check if available in the Pi host environment or as a transitive dependency first. If not available, use the current plain JSON Schema pattern but add a TODO comment noting the migration need. Do not break the extension's ability to load.
- Similarly for `@mariozechner/pi-ai` StringEnum: check availability, fallback to plain enum array if needed.

## Artifacts

Expected deliverables:
1. Updated `surfaces/pi/index.ts` with corrected API types, TypeBox parameters (or documented fallback), evidence-gated advance
2. Updated `surfaces/pi/src/enforcement/index.ts` with return-value blocking pattern
3. Updated `surfaces/pi/src/context-injector.ts` with boolean display, delegation context
4. Updated `surfaces/pi/src/workflow-state.ts` with index overflow guard
5. Updated `surfaces/pi/src/widget/status.ts` with boolean display, persistent status
6. New `surfaces/pi/src/orchestration/policy.ts` — phase-aware policy decisions
7. New `surfaces/pi/src/orchestration/phase-tools.ts` — phase-to-tool mapping
8. New `surfaces/pi/src/orchestration/evidence.ts` — step evidence validation
9. New `surfaces/pi/tests/phase7-policy-gating.test.ts` — policy gating tests
10. Updated existing test files for new API patterns
11. All tests passing, build succeeding
