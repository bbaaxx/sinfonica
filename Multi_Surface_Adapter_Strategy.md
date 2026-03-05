# Multi-Surface Adapter Strategy for Sinfonica

## Purpose

Define a scalable repository and release strategy for supporting multiple host surfaces (OpenCode, Pi, Claude, and future adapters) while keeping Sinfonica core orchestration surface-agnostic.

## Recommendation

Adopt a dedicated surface-adapter package model.

- Keep core orchestration in `src/`.
- Move host-specific integrations into dedicated adapter packages.
- Standardize adapter structure, contracts, tests, and release checks.

## Proposed Repository Layout

```text
packages/sinfonica/
  src/                            # surface-agnostic core
  tests/                          # core tests
  workflows/
  docs/
  surfaces/
    opencode/                     # opencode-sinfonica-plugin package
      package.json
      README.md
      src/
      tests/
    pi/                           # pi-sinfonica-extension package
      package.json
      README.md
      src/
      tests/
    claude/                       # future package
      package.json
      README.md
      src/
      tests/
```

## Packaging Rules

Each adapter package should:

- Be installable independently by the host surface.
- Expose a small public entrypoint (`index.ts`).
- Depend on Sinfonica CLI/contracts rather than duplicating workflow logic.
- Carry surface-specific docs and troubleshooting.
- Include focused tests for host runtime behavior.

## Core vs Adapter Boundaries

Core (`src/`) owns:

- Workflow definitions and execution model.
- Handoff contracts and validation.
- Enforcement model and canonical rule semantics.
- Shared utilities reusable across adapters.

Adapter packages own:

- Host event subscriptions and callbacks.
- Host tool/command registration.
- Host renderer/widget/message glue.
- Surface-specific install/distribution metadata.

## Migration Plan

### Phase A - Structure

1. Create `surfaces/` directory.
2. Move current Pi extension to `surfaces/pi/`.
3. Create `surfaces/opencode/` package and move OpenCode plugin/config generation concerns there where possible.

### Phase B - Contract hardening

1. Define a small shared adapter contract package (or `src/surfaces/contracts.ts`).
2. Normalize result payloads and error semantics across adapters.
3. Add compatibility tests for all adapters.

### Phase C - Release and docs

1. Add adapter-level release/readiness checks.
2. Add root matrix docs for supported surfaces.
3. Add contribution guide for adding a new surface adapter.

## Test Strategy

- Core tests remain under `tests/`.
- Adapter tests colocated under each `surfaces/<name>/tests/`.
- CI should run:
  - core build/tests,
  - each adapter build/tests,
  - optional install smoke checks per adapter.

## Versioning Strategy

Choose one:

- Single version stream (simple, synchronized releases).
- Independent adapter versioning (more flexible for host-specific cadence).

Suggested near-term default: single version stream until three or more adapters require separate cadence.

## Risks and Mitigations

- Risk: adapter drift from core contracts.
  - Mitigation: shared contract tests + contract fixtures.
- Risk: duplicated logic across adapters.
  - Mitigation: push reusable logic into core modules.
- Risk: release complexity.
  - Mitigation: standardized adapter checklist and CI matrix.

## Decision Summary

For long-term multi-surface growth, use dedicated adapter packages. Keep core orchestration centralized and surface glue isolated. This gives clearer ownership, safer evolution, and easier onboarding for future surfaces.
