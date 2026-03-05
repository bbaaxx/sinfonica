# Execution Prep Package - Multi-Surface Adapter Migration

Session: `s-20260302-007`  
Baseline plan: `.sinfonica/handoffs/s-20260302-007/plan-02-libretto-revision.md`  
Approval source: `.sinfonica/handoffs/s-20260302-007/review-04-rondo-rereview.md`

## 1) Scope and Outcome Lock

### Confirmed Constraints

- Planning/output packaging only; no implementation changes in this artifact.
- Gate/check identifiers remain unchanged: `P0.0`, `C1..C16`, `G1..G5`.
- Phase sequence remains strict: `P0 -> P1 -> P2 -> P3 -> P4 -> P5`.
- Progression is pass/fail only; no phase entry without prior gate evidence.

### Confirmed Outcomes

- Execution team can start `P0` immediately using a deterministic day-0 checklist.
- Every phase has entry criteria, run steps, evidence outputs, and rollback ownership.
- Decision points `D-01..D-04` are operationalized with a reusable log template.

### Assumptions (Not Yet Confirmed)

- Approvers and implementers are available within the due windows defined for `D-01..D-04`.
- Evidence artifacts can be stored in the session handoff directory during execution.

## 2) Day-0 Kickoff Checklist (Go/No-Go Preparation)

Use this checklist before any structural migration work.

| Item | Action | Owner | Output Artifact | Pass Condition |
| --- | --- | --- | --- | --- |
| K0-1 | Open execution channel and assign named owners for program, implementation, QA/review, rollback by phase | Program owner | Kickoff note in session directory | All owners explicitly named |
| K0-2 | Instantiate decision log entries for `D-01..D-04` using template in Section 5 | Program owner | Decision log file/update | Four decision records created |
| K0-3 | Record due times and escalation rule for unresolved decisions | Program owner | Decision log update | Due times + fallback paths present |
| K0-4 | Capture baseline commands and attach outputs: `npm run build`, `npm test` | Implementation owner | Evidence refs `E-P0-CMD-BUILD`, `E-P0-CMD-TEST` | Both commands exit `0` and outputs archived |
| K0-5 | Produce host-file inventory with disposition (`move`, `wrap`, `retain`) | Implementation owner | `E-P0-INVENTORY` manifest | All host-specific files mapped |
| K0-6 | Publish freeze scope for high-churn integration files | Program + implementation owner | `E-P0-FREEZE` note | Freeze scope/timeline acknowledged |
| K0-7 | Run `Gate P0.0` go/no-go review | Program + QA/review owner | `E-P0-GONOGO` decision note | `D-01..D-04` all approved |

No-Go rule: if any decision `D-01..D-04` is unresolved at due time, halt at `P0` and open planning remediation.

## 3) Phase Runbook (P0 -> P5)

### P0 - Mandatory Preconditions and Freeze

- Entry criteria: kickoff checklist item `K0-1` complete.
- Execute: complete `K0-2` through `K0-7` and validate `AC-P0-1..AC-P0-3`.
- Required checks: baseline build/test evidence and complete inventory mapping.
- Exit criteria: `Gate P0.0 = Go`; all precondition artifacts archived.
- Rollback trigger/owner: missing or unapproved decision at due time; owner = Program owner.

### P1 - Repository Structure Migration

- Entry criteria: `P0` accepted and `Gate P0.0 = Go`.
- Execute:
  1. Create topology: `surfaces/`, `surfaces/pi/`, `surfaces/opencode/`.
  2. Move Pi package from `pi-sinfonica-extension/` to `surfaces/pi/`.
  3. Create installable `surfaces/opencode/` skeleton.
  4. Add approved compatibility wrappers/forwarders.
- Gate checks: `C1`, `C2`, `C3`, `C4`.
- Exit criteria: `AC-P1-1..AC-P1-3` satisfied and evidence bundle `G1` complete.
- Rollback trigger/owner: any of `C1..C4` fails after one fix attempt or unresolved 60 min; owner = Implementation owner.

### P2 - Core vs Adapter Boundary Enforcement

- Entry criteria: `P1` accepted, `G1` pass.
- Execute:
  1. Finalize boundary matrix ownership per path.
  2. Relocate OpenCode host concerns to `surfaces/opencode/`.
  3. Validate adapter-only access through approved core contracts/APIs.
- Gate checks: `C5`, `C6`, `C7`.
- Exit criteria: `AC-P2-1..AC-P2-3` satisfied and evidence bundle `G2` complete.
- Rollback trigger/owner: any of `C5..C7` fails after one fix attempt or unresolved 90 min; owner = Implementation owner.

### P3 - Contract Hardening and Compatibility

- Entry criteria: `P2` accepted, `G2` pass.
- Execute:
  1. Finalize shared contract location per approved `D-03` artifact.
  2. Normalize result/error schemas for both adapters.
  3. Run compatibility tests with positive and negative (drift) controls.
- Gate checks: `C8`, `C9`, `C10`.
- Exit criteria: `AC-P3-1..AC-P3-3` satisfied and evidence bundle `G3` complete.
- Rollback trigger/owner: any of `C8..C10` unresolved within 120 min or after one failed fix cycle; owner = Implementation owner.

### P4 - Release Gates and Validation Matrix

- Entry criteria: `P3` accepted, `G3` pass.
- Execute:
  1. Add matrix checks for `core`, `surfaces/pi`, `surfaces/opencode`.
  2. Verify failure isolation behavior.
  3. Run adapter install smoke checks and capture timestamped logs.
- Gate checks: `C11`, `C12`, `C13`.
- Exit criteria: `AC-P4-1..AC-P4-3` satisfied and evidence bundle `G4` complete.
- Rollback trigger/owner: `C11` fails twice consecutively for same lane, or `C12` not demonstrated in one iteration; owner = Program owner with implementation support.

### P5 - Documentation, Onboarding, and Cutover

- Entry criteria: `P4` accepted, `G4` pass.
- Execute:
  1. Publish support matrix and onboarding guide.
  2. Decommission/deprecate stale legacy references.
  3. Complete cutover checklist and obtain QA/review sign-off.
- Gate checks: `C14`, `C15`, `C16`.
- Exit criteria: `AC-P5-1..AC-P5-3` satisfied and evidence bundle `G5` complete.
- Rollback trigger/owner: stale canonical refs found or dry run fails without same-day correction; owner = QA/review owner.

## 4) Evidence Capture References

Use the following reference IDs in handoff notes and gate approvals.

| Reference ID | Phase/Gate Link | Required Content | Suggested Artifact Name |
| --- | --- | --- | --- |
| E-P0-CMD-BUILD | `P0`, supports baseline checks | Full `npm run build` output, timestamp, executor | `evidence-p0-build.md` |
| E-P0-CMD-TEST | `P0`, supports baseline checks | Full `npm test` output, timestamp, executor | `evidence-p0-test.md` |
| E-P0-INVENTORY | `P0` | Host-path inventory with owner/disposition | `evidence-p0-inventory.csv` |
| E-P0-FREEZE | `P0` | Freeze scope, timeframe, acknowledged owners | `evidence-p0-freeze.md` |
| E-P0-GONOGO | `P0.0` | Go/no-go decision summary with `D-01..D-04` status | `evidence-p0-gonogo.md` |
| E-G1 | `G1` (`C1..C4`) | Command outputs + move manifest + shim allowlist refs | `evidence-g1-structural.md` |
| E-G2 | `G2` (`C5..C7`) | Boundary scan outputs + ownership matrix | `evidence-g2-boundary.md` |
| E-G3 | `G3` (`C8..C10`) | Contract test outputs + assertion map + drift control proof | `evidence-g3-contract.md` |
| E-G4 | `G4` (`C11..C13`) | Matrix status logs + failure isolation proof + smoke checks | `evidence-g4-release.md` |
| E-G5 | `G5` (`C14..C16`) | Doc scan output + onboarding dry-run completion + cutover checklist | `evidence-g5-adoption.md` |

Evidence discipline rule: every gate approval must cite at least one concrete evidence reference per check ID.

## 5) Decision Log Template (`D-01..D-04`)

Create one record per decision using this template.

```markdown
### Decision Record: D-0X
- Topic:
- Owner:
- Due Time:
- Status: proposed | approved | blocked
- Decision Artifact Path:
- Accepted Option:
- Alternatives Considered:
- Fallback Path if Unresolved:
- Dependencies Impacted (`P1..P5`):
- Approval Sign-off (name/date):
- Notes:
```

Required decision set for kickoff:

- `D-01`: workspace/package topology under `surfaces/`.
- `D-02`: canonical Pi baseline source.
- `D-03`: OpenCode contract/glue centralization boundary.
- `D-04`: versioning policy during migration.

## 6) Kickoff Options With Tradeoffs

Choose one option and record selection in kickoff note before `P0` execution.

### Option A - Conservative (Risk-Minimizing)

- Order: complete all `D-01..D-04` approvals first, then run full `P0` evidence capture, then start `P1`.
- Risk profile: lowest execution risk; highest schedule duration.
- Tradeoffs: strongest auditability and rollback readiness, but longer time-to-first-move.
- Best fit: teams with limited migration availability or high compliance scrutiny.

### Option B - Balanced (Default)

- Order: run baseline evidence capture (`K0-4..K0-6`) in parallel while decision artifacts are being finalized; `P1` starts only after `Gate P0.0 = Go`.
- Risk profile: moderate risk; moderate schedule duration.
- Tradeoffs: reduces idle time without violating precondition gate discipline.
- Best fit: standard delivery context with stable owner coverage.

### Option C - Accelerated (Time-Optimized)

- Order: pre-stage `P1` move manifests and wrapper plans during `P0`, execute immediately after final `D-01..D-04` approval.
- Risk profile: highest coordination risk; shortest path to `P1` execution.
- Tradeoffs: fastest kickoff, but higher rework probability if late decision changes occur.
- Best fit: high-capacity team with rapid reviewer turnaround and strong rollback execution.

Recommendation: use **Option B (Balanced)** as default unless business constraints require Option C.

## 7) Readiness Assessment for Implementation Handoff

- Readiness status: **ready with gate discipline**.
- Preconditions for green start: complete `D-01..D-04` approvals and archive `E-P0-*` artifacts.
- Known blocker class: unresolved precondition decisions only; no additional planning blockers identified.
