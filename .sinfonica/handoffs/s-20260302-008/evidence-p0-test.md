# Evidence `E-P0-CMD-TEST`

- Command: `npm test`
- Working directory: `packages/sinfonica`
- Executor: `@sinfonica-coda`
- Timestamp (UTC): `2026-03-03T05:41:50Z`
- Exit status: `0`
- Raw output log: `.sinfonica/handoffs/s-20260302-008/evidence-p0-test.log`

## Key Output

```text
Test Files  55 passed (55)
Tests  535 passed (535)
Duration  2.17s (transform 904ms, collect 2.71s, tests 14.74s)
```

## Notes

- The run includes expected stderr emitted by negative-path tests (missing workflow.md, validation-failure fixtures, memory warning paths).
- Despite stderr fixture output, the test command exits successfully and all suites pass.
