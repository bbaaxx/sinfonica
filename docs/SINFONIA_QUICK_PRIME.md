# Sinfonia Quick Prime

Audience: Any agent about to work in this repository.

## 1) What Sinfonia is here

Sinfonia in this package is the orchestration framework itself, not just generated project assets.

- `maestro` is the orchestrator persona that plans, delegates, and integrates work.
- Six personas are available: `maestro` (orchestrator), `libretto`, `amadeus`, `coda`, `rondo` (workflow specialists), and `metronome` (QA/test planning); see `agents/`.
- Sinfonia can run as an MCP server, exposing workflow and handoff tools to MCP-compatible hosts; see `src/mcp/` and `README.md`.
- The code that powers `maestro` and the other personas lives in this same repo under `src/` and `workflows/`.
- Changes here can affect both framework behavior and how future agent sessions run.

Start with:

- `README.md`
- `docs/index.md`
- `AGENTS.md`

## 2) Mental model for execution

Think in workflow state + handoff envelopes:

- A workflow is defined under `workflows/<workflow-id>/`.
- Runtime state is persisted in session `workflow.md` files (managed by workflow index code).
- Delegation happens via typed handoff envelopes (`dispatch`, `return`, `revision`, `direct`).
- `maestro` dispatches work to specialist personas; specialists return structured completion envelopes.

High-value source files:

- Orchestration: `src/workflow/coordinator.ts`, `src/workflow/step-engine.ts`
- State persistence: `src/workflow/index-manager.ts`
- Handoffs: `src/handoff/types.ts`, `src/handoff/writer.ts`, `src/handoff/reader.ts`, `src/handoff/validator.ts`
- Enforcement: `src/enforcement/registry.ts`, `src/enforcement/rules/`
- Persona loading/delegation: `src/persona/loader.ts`, `src/persona/delegation.ts`
- CLI surface: `src/cli/program.ts`, `src/cli/init.ts`, `src/cli/validate.ts`, `src/cli/rules.ts`
- Additional modules (not listed above): `src/mcp/` (MCP server integration), `src/memory/` (session memory), `src/config/` (configuration loading), `src/validators/` (input validation).

## 3) Where things live

- Runtime/framework code: `src/`
- Tests: `tests/`
- Built-in workflow definitions: `workflows/`
- Persona definitions: `agents/`
- Branding/images: `assets/`
- Tool configuration: `opencode.json` (OpenCode agent integration)
- Package docs: `docs/`
- Session/runtime artifacts during execution: `.sinfonia/`

## 4) How to work safely as an agent

Default operating rules:

1. Make minimal, focused edits for the approved scope.
2. Preserve unrelated local changes; never revert user work you did not create.
3. Keep contracts stable (workflow IDs, rule IDs, envelope keys) unless change is explicitly requested.
4. Prefer typed, explicit changes over implicit behavior.
5. Update tests and docs when behavior/contracts change.

Git and command safety:

- Avoid destructive git commands (`reset --hard`, force operations) unless explicitly requested.
- Do not commit or push unless explicitly asked.
- Run commands from `packages/sinfonia/`.

## 5) Required quality gates

Baseline commands (from package root):

```bash
npm run build
npm test
```

Focused iteration examples:

```bash
npm test -- tests/workflow
npm test -- tests/cli
npm test -- tests/self-hosting
```

If behavior changed, do not hand off with failing build/tests.

## 6) Peculiar repo context (do not miss)

- This repository is self-hosting: agent personas, orchestration logic, and validation/enforcement live together.
- You are often editing the same machinery that governs your own run constraints.
- Small contract changes can cascade into workflow execution, handoff parsing, or enforcement behavior.

Practical implication: verify with targeted tests early, then full build + tests before final handoff.

## 7) Read these for depth (instead of guessing)

- Architecture map: `docs/architecture/component-model.md`
- System view: `docs/architecture/system-architecture.md`
- Workflow catalog: `docs/workflows/workflow-catalog.md`
- State transitions: `docs/workflows/state-and-transitions.md`
- Error/recovery semantics: `docs/workflows/error-and-recovery.md`
- Contracts: `docs/reference/types-and-contracts.md`
- CLI details: `docs/reference/cli-reference.md`
- Contribution expectations: `docs/guides/contributor-guide.md`
- Validation routine: `docs/operations/testing-and-validation.md`
- Troubleshooting: `docs/operations/troubleshooting.md`
- ADR decisions: `docs/adr/README.md`

## 8) Quick pre-handoff checklist

- Scope implemented exactly as requested.
- Relevant tests added/updated for behavior changes.
- `npm run build` and `npm test` pass (or blocker is explicit).
- Docs updated if contracts/commands/behavior changed.
- Handoff/return note includes artifacts, validation evidence, and blockers/assumptions.
