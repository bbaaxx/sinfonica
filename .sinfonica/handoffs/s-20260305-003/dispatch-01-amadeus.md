---
handoff_id: s-20260305-003-001
session_id: s-20260305-003
sequence: 1
source_persona: maestro
target_persona: amadeus
handoff_type: dispatch
status: pending
created_at: 2026-03-05T00:00:00Z
word_count: 450
---

## Task

Evaluate the Pi-Native Orchestration Refactor Plan (`pi_integration_plan.md`) against the actual Pi extension API capabilities. Produce a corrected/annotated technical specification that the implementation agent (Coda) can execute directly.

## Context

The Sinfonica Pi surface extension at `surfaces/pi/` needs to be refactored from CLI-emulation fallback patterns to Pi-native extension capabilities. The plan document proposes 5 workstreams (WS1-WS5). Before implementation, we need an architect review to validate feasibility and correct API mismatches.

**Key files to review:**
- `pi_integration_plan.md` — the proposed refactor plan
- `surfaces/pi/index.ts` — current extension entry point (623 lines)
- `surfaces/pi/src/` — current modules (enforcement/, context-injector, workflow-state, handoff-writer, handoff-reader, handoff-validator, adapter-contract, widget/status)

**Critical API gaps already identified from Pi docs:**

1. **Blocking pattern:** Current code uses `event.block(reason)` / `event.preventDefault(reason)` callback pattern. Pi actually uses return value `{ block: true, reason: string }` from `tool_call` handlers.
2. **Display enum:** Current code uses `display: "hidden" | "inline" | "bubble"`. Pi uses `display: boolean` (true/false).
3. **Optional chaining on pi.on:** Current code uses `pi.on?.()`. Pi API has `pi.on()` as non-optional.
4. **Parameter schemas:** Current code uses plain JSON Schema objects. Pi uses `@sinclair/typebox` with `Type.Object()` and `StringEnum` from `@mariozechner/pi-ai`.
5. **Tool control:** Plan proposes `pi.setActiveTools()` for phase-gating. This IS supported by the Pi API.
6. **State persistence:** Pi supports `pi.appendEntry()` for cross-session state and tool result `details` for branch-safe state. Not currently used.
7. **`promptSnippet` / `promptGuidelines`:** Pi supports per-tool system prompt customization. Could enhance workflow discipline messaging.
8. **`ctx.ui` interactions:** Pi supports `ctx.ui.confirm()`, `ctx.ui.select()`, `ctx.ui.setStatus()`, `ctx.ui.setWidget()`. Could replace notification-only patterns.
9. **Delivery modes:** `pi.sendMessage()` supports `steer`/`followUp`/`nextTurn` delivery. Current code uses `sendMessage?.()` without delivery options.

## Constraints

- Do not propose changes to Sinfonica core (`src/`) — only the Pi surface (`surfaces/pi/`).
- Preserve existing test file structure where possible; propose new test file for new modules.
- Keep the extension loadable by jiti (no build step required for the extension itself).
- The extension currently uses direct imports from `../../src/` for Sinfonica internals — this pattern should be preserved.
- Must remain compatible with the existing `ExtensionAPI` type contract OR document required type migration.

## Artifacts

- Corrected technical spec with per-workstream implementation notes
- API migration table (current pattern → correct Pi-native pattern)
- Risk assessment for each workstream
- Recommended implementation order
