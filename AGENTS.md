# AGENTS.md

Operational guide for coding agents working in `packages/sinfonia`.

## Prime context before editing

Before making changes in this repository, read `docs/SINFONIA_QUICK_PRIME.md` to understand the intent and operational context of the codebase.

## Quick context

- Stack: TypeScript + Node.js CLI package
- Module system: ESM (`"type": "module"`)
- TS config: `strict: true`, `module: NodeNext`, output to `dist/`
- Test runner: Vitest (`tests/**/*.test.ts`)
- Package manager: npm (`package-lock.json`)

## Required commands

Run from `packages/sinfonia/`.

### Install

```bash
npm install
```

### Build

```bash
npm run build
```

### Full tests

```bash
npm test
```

## Single-test execution (important)

### Run one test file

```bash
npm test -- tests/workflow/coordinator.test.ts
```

### Run one test by name

```bash
npm test -- tests/workflow/coordinator.test.ts -t "approve -> advances pipeline"
```

### Run a focused directory

```bash
npm test -- tests/cli
npm test -- tests/workflow
npm test -- tests/self-hosting
```

### Direct Vitest equivalent (optional)

```bash
npx vitest run tests/workflow/coordinator.test.ts -t "approve -> advances pipeline"
```

## Lint/format status

- No `lint` script is defined in `package.json`.
- No root ESLint/Prettier/Biome config was found in this package.
- Use `npm run build` + `npm test` as the practical quality gates.

Optional type-check without emit:

```bash
npx tsc -p tsconfig.json --noEmit
```

## Agent workflow expectations

1. Make minimal, focused edits.
2. Keep behavior unchanged unless explicitly required.
3. Update tests when behavior changes.
4. Run focused tests while iterating.
5. Run full build + tests before final handoff.
6. Update docs when contracts/commands/behavior shift.

## Code style guidelines

There is no enforced formatter config; match local file conventions first.

### Imports

- Use `node:` prefixes for built-ins (`node:fs/promises`, `node:path`).
- Group imports as: built-ins, external, internal.
- Separate groups with one blank line.
- In TS NodeNext files, use `.js` extensions for local imports.
- Use type-only imports (`import type` or inline `type`) for pure types.

### Exports and modules

- Prefer named exports for functions, constants, and types.
- Avoid introducing default exports unless a file already uses that pattern.
- Keep shared domain types near the domain module (`types.ts` where applicable).

### Typing

- Preserve strict typing; avoid `any`.
- Prefer explicit return types for exported functions.
- Use narrow unions for states/status fields.
- In `catch`, use `unknown` and narrow safely.
- Reuse existing types instead of creating duplicate shapes.

### Naming

- Files: kebab-case (`step-engine.ts`, `enf-001-tdd.ts`).
- Tests: mirror feature/module path and use `.test.ts`.
- Variables/functions: `camelCase`.
- Types/interfaces: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE` for immutable global constants.
- Keep rule IDs/workflow IDs stable once introduced.

### Formatting and structure

- Match existing quote style in the touched file (repo currently has mixed styles).
- Keep functions small and cohesive.
- Prefer early returns over nested branching.
- Add comments only for non-obvious intent.
- Keep markdown/frontmatter formatting stable when editing artifacts.

### Error handling

- Throw for invalid caller input at module boundaries.
- Handle expected missing files (`ENOENT`) explicitly.
- For non-critical side effects, degrade gracefully and use `console.warn`.
- Preserve current resilience behavior in coordinator/enforcement code paths.
- Keep error messages actionable and specific.

### Filesystem and CLI patterns

- Use async fs APIs from `node:fs/promises`.
- Build paths via `join`/`dirname`, not string concatenation.
- Preserve idempotent behavior in initialization/scaffolding flows.
- Do not silently rename config/frontmatter contract keys.

## Testing guidelines

- Use Vitest primitives: `describe`, `it`, `expect`, `vi`.
- Cover success, validation failure, and recovery/fallback paths.
- Prefer behavior-oriented test names.
- Use temp directories for fs side effects.
- Clean up created temp artifacts in `afterEach`.

## Cursor/Copilot instructions status

No additional agent-instruction files were found at creation time:

- `.cursorrules` - not present
- `.cursor/rules/` - not present
- `.github/copilot-instructions.md` - not present

If any are added later, treat them as higher-priority instructions and update this file.
