---
handoff_id: h-20260305-021750-coda-dispatch-01
session_id: s-20260305-001
sequence: 1
source_persona: maestro
target_persona: coda
handoff_type: dispatch
status: pending
created_at: 2026-03-05T02:17:50Z
---

## Task

Remove the cross-import from `surfaces/pi/src/handoff-writer.ts` to make the Pi adapter fully self-contained.

## Context

- **Issue:** `surfaces/pi/src/handoff-writer.ts:4` imports from `../../../src/handoff/validator.js`, breaking adapter self-containment.
- **Usage:** The file uses `validateHandoffEnvelope` and `HandoffValidationResult` to validate generated return envelopes.
- **Root validator:** `src/handoff/validator.ts` has dependencies on `PERSONA_PROFILES` and `readHandoffEnvelope` from the root package.

## Scope

1. Analyze what validation rules are actually needed for the Pi adapter's return envelope generation.
2. Create a local, self-contained validator in `surfaces/pi/src/handoff-validator.ts` (or similar) that:
   - Exports `validateHandoffEnvelope` and `HandoffValidationResult`
   - Contains only the validation logic needed for return envelopes
   - Has NO imports from outside `surfaces/pi/`
3. Update `surfaces/pi/src/handoff-writer.ts` to import from the new local validator.
4. Add/update tests to verify self-containment.

## Constraints

- Do NOT modify the root `src/handoff/validator.ts`
- The Pi adapter must pass `npm run check:smoke:install:pi` after changes
- All existing tests must continue to pass
- Follow TDD: write/update tests first, then implement

## Expected Outputs

- Return envelope at `.sinfonica/handoffs/s-20260305-001/return-01-coda-c1.md`
- New/modified files in `surfaces/pi/src/`
- New/modified tests in `surfaces/pi/tests/`
- Confirmation that `npm test` and `npm run check:smoke:install:pi` pass
