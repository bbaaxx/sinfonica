# P3 Contract Hardening and Compatibility Notes

This note records the shared adapter contract hardening slice for P3.

## Shared contract artifact

- Canonical contract path: `src/surfaces/adapter-contract.ts`.
- Adapter consumption:
  - `surfaces/pi/index.ts`
  - `surfaces/opencode/src/adapter-contract.ts`

## Normalized operation classes

Required operation classes are normalized with explicit payload and error semantics:

- `workflow.start`
  - payload keys: `workflowType`, `context`
- `step.advance`
  - payload keys: `decision`, `feedback`
- `status.reporting`
  - payload keys: `workflows`, `count`

Error semantics are normalized through `error: { message } | null` and `ok` parity.

## Compatibility and drift controls

- Contract compatibility tests:
  - `surfaces/pi/tests/phase3-adapter-contract.test.ts`
  - `surfaces/opencode/tests/adapter-contract.test.ts`
  - `tests/surfaces/adapter-contract-compatibility.test.ts`
- Drift negative control (`C10`) is encoded in
  `tests/surfaces/adapter-contract-compatibility.test.ts` by asserting that a fixture missing
  `payload.workflowType` fails validation.
