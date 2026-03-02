# Sinfonia Documentation

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Central index for all package documentation

This index is the score for the Sinfonia docs set: start here to find concept guides, architecture references, and operational playbooks.

## Start Here

- [Sinfonia Quick Prime](SINFONIA_QUICK_PRIME.md)
- [Style Guide](style-guide.md)
- [Getting Started](guides/getting-started.md)
- [CLI Reference](reference/cli-reference.md)

## Sections

- Overview
  - [Product Overview](overview/product-overview.md)
  - [Use Cases](overview/use-cases.md)
  - [Glossary](overview/glossary.md)
- Architecture
  - [System Architecture](architecture/system-architecture.md)
  - [Component Model](architecture/component-model.md)
  - [Design Principles](architecture/design-principles.md)
- Workflows
  - [Workflow Catalog](workflows/workflow-catalog.md)
  - [State and Transitions](workflows/state-and-transitions.md)
  - [Error and Recovery](workflows/error-and-recovery.md)
- Reference
  - [CLI Reference](reference/cli-reference.md)
  - [Configuration Reference](reference/configuration-reference.md)
  - [Types and Contracts](reference/types-and-contracts.md)
- Guides
  - [Getting Started](guides/getting-started.md)
  - [Contributor Guide](guides/contributor-guide.md)
  - [Migration Guide](guides/migration-guide.md)
- Product Requirements
  - [Sinfonia Retrospective PRD (Published Copy)](prd/sinfonia-retrospective-prd.md)
- Operations
  - [Testing and Validation](operations/testing-and-validation.md)
  - [Troubleshooting](operations/troubleshooting.md)
  - [Release Checklist](operations/release-checklist.md)
- Decisions (ADR)
  - [ADR Index](adr/README.md)
  - [ADR-0001: Framework Scope and Local-First Boundary](adr/ADR-0001-framework-scope-and-local-first.md)
  - [ADR-0002: Workflow Index as Canonical Session State](adr/ADR-0002-workflow-index-as-canonical-state.md)
  - [ADR-0003: Typed Handoff Envelope Contract](adr/ADR-0003-typed-handoff-envelope-contract.md)
  - [ADR-0004: Runtime Enforcement Rule Model](adr/ADR-0004-runtime-enforcement-rule-model.md)
  - [ADR Template](adr/ADR-0001-template.md)

## Source Evidence

- `packages/sinfonia/src/`
- `packages/sinfonia/tests/`
- `specs/SPEC-06-sinfonia-documentation-agent-primer.md`
- `specs/SPEC-07-sinfonia-documentation-artifact-map.md`
