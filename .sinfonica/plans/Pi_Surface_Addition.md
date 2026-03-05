# Pi Surface Addition: Development Guide

**Status**: Proposed
**Target Surface**: `@mariozechner/pi-coding-agent` (pi CLI)
**Integration Pattern**: Surface-agnostic orchestration (mirrors opencode.json approach)

---

## Executive Summary

Add pi as a Sinfonica surface alongside OpenCode. The integration follows the same pattern: Sinfonica generates surface-specific artifacts during `sinfonica init`, and pi loads them as an extension/skills package. Sinfonica provides orchestration framework; pi provides execution environment and tool calling.

**Key Constraint**: Maintain symmetry with existing opencode integration. Both surfaces consume Sinfonica-generated assets and delegate orchestration to the CLI.

---

## Development Phases

This document is organized into phases that can be executed sequentially by maestro. Each phase produces handoff-ready artifacts.

### Phase 1: Pi Package Structure Generation

**Objective**: Extend `sinfonica init` to generate `.pi/package.json` and skill stubs.

**Tasks**:

1. **Modify `src/cli/init.ts`**
   - Add function to generate `.pi/package.json` mirroring `mergeOpenCodeConfig()` logic
   - Add function to generate skill directories under `.pi/skills/`
   - Ensure idempotent behavior (skip if exists, force mode overwrites)

2. **Create Skill Stubs**
   - Generate 4 skill directories: `create-prd`, `create-spec`, `dev-story`, `code-review`
   - Each skill contains `SKILL.md` following Agent Skills specification
   - Skills reference Sinfonica CLI commands: `sinfonica start <workflow>`

**Artifacts**:
- `src/cli/init.ts` (modified) - adds pi package generation
- Test file: `tests/cli/init-pi.test.ts` - validates generated artifacts

**Validation**:
- Run `sinfonica init` generates `.pi/package.json` with correct schema
- Run `sinfonica init` generates `.pi/skills/*/SKILL.md` files
- `sinfonica init --force` overwrites existing files
- `sinfonica init` preserves existing files without `--force`

**Handoff**: When complete, produce a return envelope with:
- Type: `return`
- Status: `approved`
- Evidence: List of generated files
- Artifacts: Paths to modified `init.ts` and new test file

---

### Phase 2: Extension Entry Point and Core Tools

**Objective**: Create pi extension that registers workflow control tools.

**Tasks**:

1. **Create Extension Skeleton**
   - File: `pi-sinfonica-extension/index.ts` (root-level new directory)
   - Extension factory function receiving `ExtensionAPI`
   - Package manifest: `pi-sinfonica-extension/package.json`

2. **Register Core Tools**
   - Tool: `sinfonica_start_workflow`
     - Parameters: `workflowType` (enum), `context` (optional string)
     - Execute: Calls `sinfonica start <workflow-type>`, reads `workflow.md`, returns handoff
   - Tool: `sinfonica_advance_step`
     - Parameters: `decision` (enum: approve/request-revision), `feedback` (optional)
     - Execute: Generates return envelope, writes to `.sinfonica/handoffs/`, calls `sinfonica advance`
   - Tool: `sinfonica_list_workflows`
     - Parameters: None
     - Execute: Lists available workflows from `workflows/` directory

3. **Register Slash Command**
   - Command: `/sinfonica`
     - Arguments: `status`, `advance`, `list`, `abort`
     - Handler: Interactive TUI for workflow management

**Artifacts**:
- `pi-sinfonica-extension/index.ts` - extension entry point
- `pi-sinfonica-extension/package.json` - npm package manifest
- `pi-sinfonica-extension/README.md` - installation and usage guide

**Validation**:
- Extension loads without errors in pi
- Tools appear in pi's system prompt
- `/sinfonica` command appears in command list
- Each tool executes and returns structured results

**Handoff**: When complete, produce a return envelope with:
- Type: `return`
- Status: `approved`
- Evidence: Extension loads successfully in pi, tools registered
- Artifacts: Paths to extension source files

---

### Phase 3: Handoff Envelope Reader/Writer

**Objective**: Implement utilities to parse and generate Sinfonica handoff envelopes.

**Tasks**:

1. **Create Handoff Parser**
   - File: `pi-sinfonica-extension/src/handoff-reader.ts`
   - Parse `dispatch.md` and `return.md` from `.sinfonica/handoffs/<sessionId>/`
   - Extract frontmatter (persona, sessionId, metadata) and content (payload)

2. **Create Handoff Writer**
   - File: `pi-sinfonica-extension/src/handoff-writer.ts`
   - Write `return.md` with decision and optional feedback
   - Validate envelope structure against Sinfonica contracts

3. **Create Workflow State Reader**
   - File: `pi-sinfonica-extension/src/workflow-state.ts`
   - Parse `.sinfonica/handoffs/<sessionId>/workflow.md`
   - Extract current step, total steps, status

**Artifacts**:
- `pi-sinfonica-extension/src/handoff-reader.ts`
- `pi-sinfonica-extension/src/handoff-writer.ts`
- `pi-sinfonica-extension/src/workflow-state.ts`
- Tests for each module

**Validation**:
- `handoff-reader.ts` correctly parses existing dispatch envelopes
- `handoff-writer.ts` generates valid return envelopes that Sinfonica accepts
- `workflow-state.ts` extracts correct workflow state from `workflow.md`

**Handoff**: When complete, produce a return envelope with:
- Type: `return`
- Status: `approved`
- Evidence: Unit tests passing for envelope parsing
- Artifacts: Paths to handoff utility files

---

### Phase 4: Enforcement Bridge

**Objective**: Bridge Sinfonica enforcement rules to pi's tool call interception.

**Tasks**:

1. **Create Enforcement Loader**
   - File: `pi-sinfonica-extension/src/enforcement/loader.ts`
   - Load rules from `.sinfonica/enforcement/rules/`
   - Parse rule definitions (id, severity, patterns)

2. **Implement Rule Checker**
   - File: `pi-sinfonica-extension/src/enforcement/checker.ts`
   - Match tool calls against rule patterns
   - Return violation object with severity: `blocking`, `advisory`, `injection`

3. **Register Tool Call Interceptor**
   - File: `pi-sinfonica-extension/src/enforcement/index.ts`
   - Subscribe to `tool_call` event via `pi.on("tool_call", ...)`
   - Block tools on blocking violations
   - Inject context on injection rules
   - Notify user on advisory rules

**Artifacts**:
- `pi-sinfonica-extension/src/enforcement/loader.ts`
- `pi-sinfonica-extension/src/enforcement/checker.ts`
- `pi-sinfonica-extension/src/enforcement/index.ts`
- Tests for enforcement logic

**Validation**:
- Blocking rules prevent tool execution
- Injection rules add context before tool runs
- Advisory rules show notifications without blocking
- Rules reload on `/sinfonica reload`

**Handoff**: When complete, produce a return envelope with:
- Type: `return`
- Status: `approved`
- Evidence: Enforcement rules block/modify tool calls as expected
- Artifacts: Paths to enforcement module files

---

### Phase 5: Status Widget and Context Injection

**Objective**: Display active workflow status in pi's UI and inject context to LLM.

**Tasks**:

1. **Create Status Widget**
   - File: `pi-sinfonica-extension/src/widget/status.ts`
   - Read current workflow state on session start
   - Update widget on workflow changes (agent_end, tool_result events)
   - Display: workflow ID, current step, total steps, status

2. **Register Message Renderer**
   - Register renderer for custom message type: `sinfonica:status`
   - Render workflow status as TUI component (Box with Text)

3. **Implement Context Injection**
   - File: `pi-sinfonica-extension/src/context-injector.ts`
   - Subscribe to `before_agent_start` event
   - Inject workflow context as custom message when workflow is active
   - Include: current step, persona, artifacts generated so far

**Artifacts**:
- `pi-sinfonica-extension/src/widget/status.ts`
- `pi-sinfonica-extension/src/context-injector.ts`
- Tests for widget and injection logic

**Validation**:
- Status widget appears in pi's footer/area above editor
- Widget updates when workflow state changes
- Workflow context appears in LLM's system prompt when active
- Context injection works across compaction events

**Handoff**: When complete, produce a return envelope with:
- Type: `return`
- Status: `approved`
- Evidence: Widget displays correctly, context injected to LLM
- Artifacts: Paths to widget and context files

---

### Phase 6: Documentation and Packaging

**Objective**: Complete integration with documentation and publishable package.

**Tasks**:

1. **Write Extension README**
   - File: `pi-sinfonica-extension/README.md`
   - Installation instructions (`pi install git:<repo>` or local path)
   - Usage guide (starting workflows, advancing steps, viewing status)
   - Troubleshooting section

2. **Update Sinfonica README**
   - File: `README.md` (root)
   - Add section: "Pi Surface Integration"
   - Include quick start for pi users
   - Link to extension README

3. **Update AGENTS.md**
   - File: `AGENTS.md`
   - Add note about pi extension development location
   - Reference this development guide

4. **Prepare Package for Publishing**
   - Ensure `pi-sinfonica-extension/package.json` has correct exports
   - Verify build script compiles TypeScript
   - Test package installation in fresh environment

**Artifacts**:
- `pi-sinfonica-extension/README.md`
- `README.md` (modified)
- `AGENTS.md` (modified)

**Validation**:
- README provides clear installation and usage instructions
- Sinfonica README mentions pi integration
- Extension installs successfully from local path or git
- Full workflow (start → step execution → approval → completion) works end-to-end

**Handoff**: When complete, produce a return envelope with:
- Type: `return`
- Status: `approved`
- Evidence: Documentation complete, extension works end-to-end
- Artifacts: Paths to documentation files, published package version

---

## Integration Contract

### Files Generated by Sinfonica

| Path | Purpose | Generation Time |
|------|---------|-----------------|
| `.pi/package.json` | Pi package manifest | `sinfonica init` |
| `.pi/skills/*/SKILL.md` | Agent Skills for workflows | `sinfonica init` |
| `.pi/extensions/index.ts` | Extension entry point (future) | `sinfonica init` |

### Files Provided by Extension Package

| Path | Purpose | Surface |
|------|---------|---------|
| `pi-sinfonica-extension/index.ts` | Extension entry point | pi |
| `pi-sinfonica-extension/src/tools/*` | Workflow control tools | pi |
| `pi-sinfonica-extension/src/enforcement/*` | Enforcement bridge | pi |
| `pi-sinfonica-extension/src/widget/*` | Status display | pi |

### CLI Commands Called by Extension

| Command | Purpose | Source |
|---------|---------|--------|
| `sinfonica start <workflow>` | Initialize workflow | Extension tool |
| `sinfonica advance` | Advance to next step | Extension tool |
| `sinfonica status` | Query workflow state | Extension tool |

### Event Subscriptions

| Event | Handler Purpose | Surface |
|-------|----------------|---------|
| `tool_call` | Enforcement rule checking | pi extension |
| `before_agent_start` | Context injection | pi extension |
| `agent_end` | Widget update | pi extension |
| `session_start` | Load enforcement rules and workflow state | pi extension |

---

## Quality Gates

Each phase must pass before proceeding to next:

1. **Code Quality**
   - TypeScript compiles without errors (`npm run build`)
   - Tests pass for modified/added code (`npm test`)
   - No new linting warnings

2. **Integration Tests**
   - Extension loads in pi without errors
   - Tools execute and return structured results
   - Workflow state persists across pi sessions

3. **Documentation**
   - Phase artifacts documented
   - README updated with changes
   - AGENTS.md notes development context

---

## Success Criteria

When all phases complete, the following must work:

1. **Installation**
   - User runs `sinfonica init`
   - User installs extension: `pi install git:/path/to/sinfonica/pi-sinfonica-extension`
   - Extension loads without errors in pi

2. **Workflow Execution**
   - User in pi prompts: "Create a PRD for X"
   - LLM calls `sinfonica_start_workflow`
   - Extension executes: `sinfonica start create-prd`
   - Sinfonica dispatches to libretto, generates artifacts
   - Extension parses handoff, displays status widget
   - LLM reviews, calls `sinfonica_advance_step(approve)`
   - Extension writes return envelope, advances workflow
   - Process repeats until workflow completes

3. **Enforcement**
   - Sinfonica rules block dangerous operations in pi
   - Advisory rules show notifications
   - Injection rules add context to LLM

4. **Status Display**
   - Active workflow visible in pi UI
   - Step progress updates in real-time
   - Workflow status (in-progress, blocked, complete) clear

---

## Handoff Instructions for Maestro

When working on a phase:

1. **Read the phase description** in this document
2. **Identify all tasks** under "Tasks" heading
3. **For each task**:
   - Understand the objective
   - Locate existing code to modify (if any)
   - Implement changes following Sinfonica patterns
   - Write/update tests
   - Verify with `npm run build` and `npm test`
4. **Produce return envelope**:
   - Include evidence of completion (test results, generated files)
   - List artifacts created/modified
   - Status: `approved` if all validation passes, `blocked` if blockers remain
   - If blocked, include revision handoff with specific feedback

**Revision Handoff Template** (if a phase cannot be completed):

```markdown
---
type: revision
persona: maestro
targetPhase: [phase number]
---

## Blockers

- [List specific blockers preventing completion]

## Required Clarifications

- [Questions that need answering before proceeding]

## Proposed Path Forward

- [Suggested approach to resolve blockers]
```

---

## Development Notes

- **Extension Loading**: Pi uses jiti for on-the-fly TypeScript compilation. No pre-build step required during development.
- **Tool Execution**: Extension tools should delegate to Sinfonica CLI; avoid reimplementing workflow logic.
- **State Management**: Sinfonica's `workflow.md` is canonical source of truth. Extension reads but does not modify directly.
- **Error Handling**: Wrap CLI calls in try-catch. Use `ctx.ui.notify()` for user-facing errors.
- **Testing**: Use pi's `--mode rpc` for automated testing if needed. Extension events work in RPC mode.

---

**Document Version**: 1.0
**Last Updated**: 2025-03-02
**Maintainer**: Sinfonica Development Team
