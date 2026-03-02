# Configuration Reference

**Status:** Draft
**Last Updated:** 2026-03-02
**Scope:** Configuration fields, defaults, and constraints

Back to index: [Documentation Index](../index.md)

## Purpose

Define supported configuration keys, value constraints, and precedence rules used by Sinfonia runtime.

## Audience

Implementers and maintainers.

## Main Content

## Resolution precedence

Configuration is merged in this order (lowest to highest priority):

1. Internal defaults
2. Project config file (`.sinfonia/config.yaml`)
3. Environment variables (`SINFONIA_*`)
4. CLI flags

Sinfonia tracks value origins internally (`sourceByKey`) for diagnostics.

## Supported keys

### `orchestrator`

- Type: string
- Allowed values:
  - `maestro`
  - `libretto`
  - `amadeus`
  - `coda`
  - `rondo`
  - `metronome`
- Purpose: choose the primary orchestration persona profile.

### `default_skill_level`

- Type: string
- Allowed values:
  - `beginner`
  - `intermediate`
  - `expert`
- Purpose: configure baseline guidance depth.

### `enforcement`

- Type: string
- Allowed values:
  - `low`
  - `medium`
  - `high`
- Purpose: configure enforcement strictness policy.

## File format

Primary config file:

- `.sinfonia/config.yaml`

Expected format:

- simple key/value YAML entries parsed by the config loader
- unknown keys are rejected by schema validation

Example:

```yaml
orchestrator: maestro
default_skill_level: intermediate
enforcement: high
```

## Environment variable mapping

Any variable prefixed with `SINFONIA_` can override known keys after normalization.

Practical guidance:

- Use env overrides for CI or ephemeral sessions.
- Prefer config file values for stable team defaults.

## Validation behavior

- Unknown keys: validation error
- Invalid type/value: validation error
- Valid merged config: accepted and passed to runtime modules

## Constraints and Non-Goals

- This reference covers framework config keys currently validated by `schema.ts`.
- It does not define every downstream tool-specific environment variable.
- Future config expansions require schema and docs updates together.

## Policy profile stub (disabled by default)

Sinfonia includes a parser scaffold for enforcement policy profile files (`src/enforcement/policy-profile.ts`) to lock the future contract shape without runtime toggles.

- Runtime application is disabled by default (`POLICY_PROFILE_RUNTIME_ENABLED = false`).
- Profile contract shape:
  - `policy_profile_id: string`
  - `extends?: string`
  - `overrides.<RULE_ID>.enabled?: boolean`
  - `overrides.<RULE_ID>.severity?: blocking|advisory|injection`
- Parser validation rejects unknown override keys.

## References and Evidence

- `packages/sinfonia/src/`
- `packages/sinfonia/opencode.json`
- `packages/sinfonia/src/config/loader.ts`
- `packages/sinfonia/src/config/schema.ts`
- `packages/sinfonia/src/cli/init.ts`
- `packages/sinfonia/tests/cli/init.test.ts`
