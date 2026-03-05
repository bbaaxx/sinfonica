# Release Notes Draft - Pi Surface Integration

## Highlights

- Added Pi as a first-class Sinfonica surface with generated `.pi` skills and a dedicated extension package.
- Introduced a new `pi-sinfonica-extension` package with workflow control tools and `/sinfonica` command routing.
- Implemented handoff envelope utilities, enforcement bridging, workflow status surfacing, and pre-agent context injection.
- Completed integration docs and package readiness checks for local-path installation and dry-run packaging.

## What's New

### `sinfonica init` now scaffolds Pi assets

- Generates `.pi/package.json`.
- Generates four skill stubs:
  - `.pi/skills/create-prd/SKILL.md`
  - `.pi/skills/create-spec/SKILL.md`
  - `.pi/skills/dev-story/SKILL.md`
  - `.pi/skills/code-review/SKILL.md`
- Supports preserve-by-default and overwrite-on-`--force` semantics.

### New `pi-sinfonica-extension` package

- Core tools:
  - `sinfonica_start_workflow`
  - `sinfonica_advance_step`
  - `sinfonica_list_workflows`
- Slash command:
  - `/sinfonica status|advance|list|abort|reload`
- CLI delegation behavior:
  - `sinfonica start <workflow>`
  - `sinfonica advance --decision <approve|request-revision>`
  - `sinfonica status`
  - `sinfonica abort`

### Handoff and workflow utilities

- Added parser utilities for dispatch/return envelopes (frontmatter + legacy bullet metadata compatibility).
- Added return envelope writer with contract validation.
- Added workflow state reader for `workflow.md` (`currentStep`, `totalSteps`, `status`).

### Enforcement integration in Pi

- Loads rules from `.sinfonica/enforcement/rules/`.
- Classifies violations as `blocking`, `advisory`, or `injection`.
- Intercepts `tool_call` to block, notify, or inject context.
- Supports rule refresh via `/sinfonica reload`.

### Status and context features

- Publishes `sinfonica:status` updates from active workflow session state.
- Injects `sinfonica:context` before agent start with workflow step, persona, and artifacts summary.

## Documentation and packaging

- Added Pi integration guidance to root `README.md`.
- Expanded `pi-sinfonica-extension/README.md` with installation, usage loop, and troubleshooting.
- Updated `AGENTS.md` with Pi extension context.
- Updated extension package metadata for packaging/install readiness and validated with local install + `npm pack --dry-run`.

## Validation Summary

- Focused phase tests passed for all six phases.
- `npm run build` passed.
- Full test suite passed (`npm test`).
