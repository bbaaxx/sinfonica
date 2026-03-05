# P2 Core-vs-Adapter Boundary Enforcement Notes

This note records Phase 2 boundary ownership and allowlist evidence for OpenCode host concerns.

Machine-readable matrix: `docs/operations/p2-boundary-matrix.json`.

## Boundary outcomes

- OpenCode-specific config-merge and workflow-stub rendering moved from core CLI modules into adapter-owned modules under `surfaces/opencode/src/`.
- Core CLI modules remain orchestration entrypoints and call adapter-owned helpers.
- Existing core host references that are enforcement or extension-point contracts remain allowlisted.

## Boundary ownership matrix (P2 touched paths)

| Path | Owner | Classification | Rationale |
| --- | --- | --- | --- |
| `src/cli/init.ts` | `core` | bridge/entrypoint | Core init flow; delegates OpenCode config shaping to adapter helper. |
| `src/cli/generate-stubs.ts` | `core` | bridge/entrypoint | Core init flow; delegates OpenCode stub templates to adapter helper. |
| `tsconfig.json` | `core` | build boundary | Compiles adapter source consumed by core bridge modules. |
| `surfaces/opencode/src/config.ts` | `adapter:opencode` | host-specific config | Owns OpenCode schema merge/tool mapping behavior. |
| `surfaces/opencode/src/workflow-stubs.ts` | `adapter:opencode` | host-specific templates | Owns OpenCode command/skill stub template definitions. |
| `surfaces/opencode/tests/config.test.ts` | `adapter:opencode` | adapter test | Verifies OpenCode config helper behavior. |
| `surfaces/opencode/tests/workflow-stubs.test.ts` | `adapter:opencode` | adapter test | Verifies OpenCode workflow stub templates. |

## C5 allowlist for core host-keyword scan

When scanning core `src/**/*.ts` for host keywords (`.opencode/`, `opencode.json`, `@opencode/plugin`, `.pi/`, `\bpi\b`, `\bopencode\b`), matches are allowlisted only in these core extension-point files:

- `src/cli/init.ts`
- `src/cli/generate-stubs.ts`
- `src/persona/stub-generator.ts`
- `src/persona/types.ts`
- `src/workflow/create-spec-contracts.ts`
- `src/enforcement/registry.ts`
- `src/enforcement/utils.ts`
- `src/enforcement/rules/enf-002-secrets.ts`

Any new core path outside this allowlist containing those host keywords should fail P2 boundary review.
