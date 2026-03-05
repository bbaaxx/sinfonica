# Evidence `E-P0-INVENTORY`

Host-file inventory with provisional migration disposition (`move`, `wrap`, `retain`) for P0 planning.

| Source Path | Target Owner | Disposition | Target Path / Handling | Notes |
| --- | --- | --- | --- | --- |
| `pi-sinfonica-extension/package.json` | `surfaces/pi` | move | `surfaces/pi/package.json` | Canonical Pi package manifest. |
| `pi-sinfonica-extension/README.md` | `surfaces/pi` | move | `surfaces/pi/README.md` | Surface docs move with package. |
| `pi-sinfonica-extension/index.ts` | `surfaces/pi` | move | `surfaces/pi/index.ts` | Pi entrypoint remains adapter-owned. |
| `pi-sinfonica-extension/src/handoff-reader.ts` | `surfaces/pi` | move | `surfaces/pi/src/handoff-reader.ts` | Host bridge utility. |
| `pi-sinfonica-extension/src/handoff-writer.ts` | `surfaces/pi` | move | `surfaces/pi/src/handoff-writer.ts` | Host bridge utility. |
| `pi-sinfonica-extension/src/workflow-state.ts` | `surfaces/pi` | move | `surfaces/pi/src/workflow-state.ts` | Pi workflow state glue. |
| `pi-sinfonica-extension/src/enforcement/loader.ts` | `surfaces/pi` | move | `surfaces/pi/src/enforcement/loader.ts` | Pi enforcement integration. |
| `pi-sinfonica-extension/src/enforcement/checker.ts` | `surfaces/pi` | move | `surfaces/pi/src/enforcement/checker.ts` | Pi enforcement integration. |
| `pi-sinfonica-extension/src/enforcement/index.ts` | `surfaces/pi` | move | `surfaces/pi/src/enforcement/index.ts` | Pi enforcement exports. |
| `pi-sinfonica-extension/src/widget/status.ts` | `surfaces/pi` | move | `surfaces/pi/src/widget/status.ts` | Pi widget rendering glue. |
| `pi-sinfonica-extension/src/context-injector.ts` | `surfaces/pi` | move | `surfaces/pi/src/context-injector.ts` | Pi host context injection. |
| `tests/pi-extension/phase2-extension.test.ts` | `surfaces/pi` | move | `surfaces/pi/tests/phase2-extension.test.ts` | Adapter-focused tests should co-locate. |
| `tests/pi-extension/phase3-handoff-utils.test.ts` | `surfaces/pi` | move | `surfaces/pi/tests/phase3-handoff-utils.test.ts` | Adapter-focused tests should co-locate. |
| `tests/pi-extension/phase4-enforcement.test.ts` | `surfaces/pi` | move | `surfaces/pi/tests/phase4-enforcement.test.ts` | Adapter-focused tests should co-locate. |
| `tests/pi-extension/phase5-status-context.test.ts` | `surfaces/pi` | move | `surfaces/pi/tests/phase5-status-context.test.ts` | Adapter-focused tests should co-locate. |
| `tests/pi-extension/phase6-docs-packaging.test.ts` | `surfaces/pi` | move | `surfaces/pi/tests/phase6-docs-packaging.test.ts` | Adapter-focused tests should co-locate. |
| `src/cli/init.ts` (OpenCode config writer paths) | `surfaces/opencode` | wrap | Keep core CLI orchestration entrypoints; wrap through `surfaces/opencode` adapter module(s). | Core CLI contract remains stable for users. |
| `src/cli/generate-stubs.ts` (OpenCode command/skill emit) | `surfaces/opencode` | wrap | Preserve CLI command surface, route template details to adapter package. | Reduces host glue in core. |
| `src/persona/stub-generator.ts` | `surfaces/opencode` | wrap | Keep persona abstraction in core; move host formatting/glue into adapter-owned helpers. | Requires `D-03` boundary approval. |
| `src/workflow/create-spec-contracts.ts` (`.opencode` skill path) | `core` | retain | Keep as core contract constant until adapter contracts finalized in `P3`. | Revisit after contract hardening. |
| `.opencode/plugins/sinfonica-enforcement.ts` | `surfaces/opencode` | wrap | Keep generated plugin for compatibility; source generation logic moves adapter-side. | Compatibility shim needed during P1/P2. |
| `.opencode/opencode.jsonc` | `surfaces/opencode` | retain | Keep generated host config in current location; generate from adapter package APIs. | Runtime config path remains host-required. |

## Canonical Baseline Confirmation (`D-02`)

- `pi-sinfonica-extension/` inventory is complete for package root and source modules.
- Baseline source confirmation: `pi-sinfonica-extension/` is the canonical Pi migration source.
