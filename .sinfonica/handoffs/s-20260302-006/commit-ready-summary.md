# Commit-Ready Summary (Grouped by Phase)

## Recommended inclusion (product changes)

### Phase 1 - Pi scaffold generation

- `src/cli/init.ts`
- `tests/cli/init-pi.test.ts`

### Phase 2 - Extension scaffold and core tools

- `pi-sinfonica-extension/index.ts`
- `pi-sinfonica-extension/package.json`
- `pi-sinfonica-extension/README.md`
- `tests/pi-extension/phase2-extension.test.ts`

### Phase 3 - Handoff/state utilities

- `pi-sinfonica-extension/src/handoff-reader.ts`
- `pi-sinfonica-extension/src/handoff-writer.ts`
- `pi-sinfonica-extension/src/workflow-state.ts`
- `tests/pi-extension/phase3-handoff-utils.test.ts`

### Phase 4 - Enforcement bridge

- `pi-sinfonica-extension/src/enforcement/loader.ts`
- `pi-sinfonica-extension/src/enforcement/checker.ts`
- `pi-sinfonica-extension/src/enforcement/index.ts`
- `tests/pi-extension/phase4-enforcement.test.ts`

### Phase 5 - Status + context injection

- `pi-sinfonica-extension/src/widget/status.ts`
- `pi-sinfonica-extension/src/context-injector.ts`
- `tests/pi-extension/phase5-status-context.test.ts`

### Phase 6 - Docs + packaging

- `README.md`
- `AGENTS.md`
- `tests/pi-extension/phase6-docs-packaging.test.ts`

## Verify before commit

- `npm run build`
- `npm test`

## Files to exclude from product commit (session/working artifacts)

- `.sinfonica/handoffs/s-20260302-006/*` (workflow orchestration logs and envelopes)
- `tmp/` (temporary workspace)

## Needs explicit user decision

- `package.json`
  - Currently modified in working tree.
  - This file is not listed in approved Phase 6 artifacts from the return envelope.
  - Recommend reviewing and deciding whether to include or defer.

## Suggested commit split (if you want multiple commits)

1. `feat(cli): generate Pi init package and skill stubs`
2. `feat(pi-extension): add workflow tools and slash command`
3. `feat(pi-extension): add handoff/state utilities and enforcement bridge`
4. `feat(pi-extension): add status widget and context injection`
5. `docs(pi): add integration docs and packaging validation coverage`
