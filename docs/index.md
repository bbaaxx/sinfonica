# Sinfonica Documentation

**Status:** Draft
**Last Updated:** 2026-02-26
**Scope:** Central index for all package documentation

This index is the score for the Sinfonica docs set: start here to find concept guides, architecture references, and operational playbooks.

## Start Here

- [Sinfonica Quick Prime](SINFONICA_QUICK_PRIME.md)
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
  - [Sinfonica Retrospective PRD (Published Copy)](prd/sinfonica-retrospective-prd.md)
- Operations
  - [Testing and Validation](operations/testing-and-validation.md)
  - [Troubleshooting](operations/troubleshooting.md)
  - [Release Checklist](operations/release-checklist.md)
  - [P4 Release Validation Matrix](operations/p4-release-validation-matrix.md)
  - [P5 Support Matrix](operations/p5-support-matrix.md)
  - [P5 New Adapter Onboarding Guide](operations/p5-new-adapter-onboarding.md)
  - [P5 Legacy Reference Audit and Deprecation Notes](operations/p5-legacy-reference-audit.md)
  - [P5 Cutover Checklist](operations/p5-cutover-checklist.md)
- Decisions (ADR)
  - [ADR Index](adr/README.md)
  - [ADR-0001: Framework Scope and Local-First Boundary](adr/ADR-0001-framework-scope-and-local-first.md)
  - [ADR-0002: Workflow Index as Canonical Session State](adr/ADR-0002-workflow-index-as-canonical-state.md)
  - [ADR-0003: Typed Handoff Envelope Contract](adr/ADR-0003-typed-handoff-envelope-contract.md)
  - [ADR-0004: Runtime Enforcement Rule Model](adr/ADR-0004-runtime-enforcement-rule-model.md)
  - [ADR Template](adr/ADR-0001-template.md)

## Source Evidence

- `packages/sinfonica/src/`
- `packages/sinfonica/tests/`
- `specs/SPEC-06-sinfonica-documentation-agent-primer.md`
- `specs/SPEC-07-sinfonica-documentation-artifact-map.md`
