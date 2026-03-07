# Pi Integration Manual Testing Guide

This guide provides step-by-step manual acceptance tests for the Sinfonica Pi surface extension integration. Execute these scenarios against a real Pi runtime to validate the Pi-native orchestration refactor.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Configuration](#configuration)
3. [Test Scenarios](#test-scenarios)
   - [Scenario 1: Tool Call Policy Enforcement](#scenario-1-tool-call-policy-enforcement)
   - [Scenario 2: Evidence-Gated Advance](#scenario-2-evidence-gated-advance)
   - [Scenario 3: Per-Workflow Phase Maps](#scenario-3-per-workflow-phase-maps)
   - [Scenario 4: Command Surface](#scenario-4-command-surface)
   - [Scenario 5: Hot Reload](#scenario-5-hot-reload)
   - [Scenario 6: Invalid Configuration Handling](#scenario-6-invalid-configuration-handling)
   - [Scenario 7: Full Workflow Execution](#scenario-7-full-workflow-execution)
4. [Acceptance Criteria Checklist](#acceptance-criteria-checklist)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Environment Setup

1. **Pi Runtime**: Ensure Pi is running with the Sinfonica extension loaded
2. **Repository**: Clone `sinfonica` repository at the correct commit
3. **Dependencies**: Run `npm install` in `packages/sinfonica/`
4. **Build**: Run `npm run build` to compile TypeScript

### Verify Extension Loaded

In Pi, check that the following tools are available:
- `sinfonica_start_workflow`
- `sinfonica_advance_step`
- `sinfonica_list_workflows`

And the `/sinfonica` command is registered.

---

## Configuration

### Enforcement Modes

The Pi extension supports three enforcement modes configured via:

**Option 1: Environment Variable**
```bash
export SINFONICA_PI_ENFORCEMENT=block  # or warn, disabled
```

**Option 2: Config File** (`.sinfonica/config.json`)
```json
{
  "pi_native_enforcement": "block"
}
```

| Mode | Behavior |
|------|----------|
| `disabled` | No policy enforcement (legacy behavior) |
| `warn` | Log warnings but allow blocked actions |
| `block` | Hard block with `{ block: true, reason }` response |

### Per-Workflow Phase Maps

Add to `workflows/<workflow-id>/workflow.md` frontmatter:

```yaml
---
phase_tool_map:
  planning:
    allowed: [Read, Glob, Grep, WebFetch, Write]
    blocked: [Bash]
  implementation:
    allowed: ["*"]
    blocked: []
---
```

---

## Test Scenarios

### Scenario 1: Tool Call Policy Enforcement

**Purpose**: Verify that tool calls are blocked when not allowed in the current workflow phase.

**Steps**:

1. Set enforcement mode to `block`:
   ```bash
   export SINFONICA_PI_ENFORCEMENT=block
   ```

2. Start a workflow:
   ```
   Use sinfonica_start_workflow with workflowType="create-spec" and context="Test spec for user authentication"
   ```

3. In the first step (planning phase), attempt to use a blocked tool:
   ```
   Write a file called test.txt with content "hello"
   ```

4. **Expected Result**: Tool call should be blocked with message like:
   ```
   Tool "Write" is not allowed during planning phase (step 1/4: 1-analyze-prd). Complete the current step before using this tool.
   ```

5. Verify that allowed tools work:
   ```
   Read the README.md file
   ```
   **Expected**: Tool executes successfully.

6. Verify `sinfonica_*` tools are always allowed:
   ```
   Use sinfononica_list_workflows
   ```
   **Expected**: Tool executes regardless of phase.

**Pass Criteria**:
- [ ] Write/Edit/Bash blocked during planning phase
- [ ] Read/Glob/Grep allowed during planning phase
- [ ] `sinfonica_*` tools always allowed
- [ ] Clear, actionable error message when blocked

---

### Scenario 2: Evidence-Gated Advance

**Purpose**: Verify that workflow steps cannot be advanced without execution evidence.

**Steps**:

1. Set enforcement mode to `block`:
   ```bash
   export SINFONICA_PI_ENFORCEMENT=block
   ```

2. Start a fresh workflow:
   ```
   Use sinfononica_start_workflow with workflowType="create-prd"
   ```

3. Without performing any real work, attempt to advance:
   ```
   Use sinfononica_advance_step with decision="approve"
   ```

4. **Expected Result**: Advance should be blocked with message like:
   ```
   Cannot advance: no execution evidence for step 1 (gather-context). Complete the step first.
   ```

5. Perform some allowed work (e.g., read files, gather context):
   ```
   Read the package.json file
   ```

6. Attempt to advance again - should still require evidence that work was done.

7. **Workaround for Testing**: In a real scenario, the persona would produce artifacts. For manual testing, you can verify the evidence check is working by observing the rejection.

**Pass Criteria**:
- [ ] Advance blocked without execution evidence
- [ ] Clear message indicating missing evidence
- [ ] `request-revision` decision allowed even without evidence (intended behavior)

---

### Scenario 3: Per-Workflow Phase Maps

**Purpose**: Verify custom phase tool maps are loaded and enforced.

**Setup**: Create a custom workflow with a phase map override.

1. Create a test workflow definition:
   ```bash
   mkdir -p .sinfonica/workflows/test-docs
   cat > .sinfonica/workflows/test-docs/workflow.md << 'EOF'
   ---
   persona: libretto
   description: "Docs workflow with Write in planning"
   phase_tool_map:
     planning:
       allowed: [Read, Glob, Grep, Write]
       blocked: [Bash]
   ---
   # Workflow: test-docs
   ## Steps
   1. gather-context
   2. write-docs
   3. approval
   EOF
   ```

2. Set enforcement to `block`:
   ```bash
   export SINFONICA_PI_ENFORCEMENT=block
   ```

3. Start the custom workflow:
   ```
   Use sinfononica_start_workflow with workflowType="test-docs"
   ```

4. In planning phase (step 1), attempt to write a file:
   ```
   Write a file called draft.md with content "# Draft"
   ```

5. **Expected Result**: Write should be **allowed** (custom map permits it).

6. Bash should still be blocked:
   ```
   Run bash command: echo "hello"
   ```
   **Expected**: Blocked with policy message.

7. Test partial override - phases not specified should use defaults:
   - In implementation phase, all tools should be allowed
   - In review phase, Write/Edit should be blocked (default behavior)

**Pass Criteria**:
- [ ] Custom `phase_tool_map` loaded from workflow.md
- [ ] Write allowed in planning (custom override)
- [ ] Bash still blocked in planning (custom override)
- [ ] Unspecified phases inherit default behavior
- [ ] Invalid phase keys fall back to defaults with warning

---

### Scenario 4: Command Surface

**Purpose**: Verify `/sinfonica` commands work correctly.

**Steps**:

1. **Test `/sinfonica status`**:
   ```
   /sinfonica status
   ```
   **Expected**: Shows current workflow state or "ready (no active workflow)"
   - Should display: workflowId, step, total steps, status
   - Should update status widget

2. **Test `/sinfonica list`**:
   ```
   /sinfonica list
   ```
   **Expected**: Lists available workflows from `.sinfonica/workflows/` and `workflows/`

3. **Test `/sinfonica advance`** (with active workflow):
   ```
   /sinfonica advance
   ```
   **Expected**: 
   - Prompts for confirmation
   - Checks evidence before allowing approve
   - Shows warning if insufficient evidence

4. **Test `/sinfonica advance request-revision`**:
   ```
   /sinfonica advance request-revision Feedback: need more detail
   ```
   **Expected**: Records request-revision decision (allowed without evidence)

5. **Test `/sinfonica abort`**:
   ```
   /sinfonica abort
   ```
   **Expected**: Marks workflow as failed, confirms action

**Pass Criteria**:
- [ ] `/sinfonica status` displays correct workflow state
- [ ] `/sinfonica list` shows available workflows
- [ ] `/sinfonica advance` gates on evidence
- [ ] `/sinfonica abort` transitions state correctly
- [ ] No crashes or unhandled errors

---

### Scenario 5: Hot Reload

**Purpose**: Verify `/sinfonica reload` clears caches and picks up config changes.

**Steps**:

1. Create a workflow with restrictive phase map:
   ```bash
   cat > .sinfonica/workflows/reload-test/workflow.md << 'EOF'
   ---
   phase_tool_map:
     planning:
       allowed: [Read]
       blocked: [Write, Bash]
   ---
   # Workflow: reload-test
   ## Steps
   1. plan
   2. execute
   EOF
   ```

2. Start the workflow:
   ```
   Use sinfononica_start_workflow with workflowType="reload-test"
   ```

3. Attempt Write in planning - should be blocked:
   ```
   Write a file test.txt with content "test"
   ```
   **Expected**: Blocked

4. Update the workflow definition to allow Write:
   ```bash
   cat > .sinfonica/workflows/reload-test/workflow.md << 'EOF'
   ---
   phase_tool_map:
     planning:
       allowed: [Read, Write]
       blocked: [Bash]
   ---
   # Workflow: reload-test
   ## Steps
   1. plan
   2. execute
   EOF
   ```

5. **Before reload**, attempt Write again - should still be blocked (cached).

6. Trigger reload:
   ```
   /sinfonica reload
   ```
   **Expected**: Message includes "Phase map cache cleared"

7. **After reload**, attempt Write again:
   ```
   Write a file test.txt with content "test"
   ```
   **Expected**: Now allowed (cache was cleared, new config loaded)

**Pass Criteria**:
- [ ] Phase map cached on first load
- [ ] `/sinfonica reload` clears phase map cache
- [ ] Updated config takes effect after reload
- [ ] Notification confirms cache cleared

---

### Scenario 6: Invalid Configuration Handling

**Purpose**: Verify graceful handling of invalid phase map configurations.

**Test 6a: Unknown Phase Key**

1. Create workflow with invalid phase:
   ```yaml
   phase_tool_map:
     plan:  # Invalid - should be "planning"
       allowed: [Read]
       blocked: []
   ```

2. Start workflow and attempt tool call.

3. **Expected**: Falls back to default map with warning:
   ```
   [sinfonica:pi:phase-map][PTM-001] Invalid phase "plan" in workflow "..." at ...
   Valid phases: planning, implementation, review, approval.
   Falling back to DEFAULT_PHASE_TOOL_MAP.
   ```

**Test 6b: Missing Array Fields**

1. Create workflow with malformed config:
   ```yaml
   phase_tool_map:
     planning:
       allowed: [Read]
       # missing "blocked" array
   ```

2. Start workflow and attempt tool call.

3. **Expected**: Falls back to defaults with PTM-002 error.

**Test 6c: Invalid Pattern Syntax**

1. Create workflow with bad wildcard:
   ```yaml
   phase_tool_map:
     planning:
       allowed: [Re*d]  # Invalid wildcard syntax
       blocked: []
   ```

2. Start workflow and attempt tool call.

3. **Expected**: Falls back to defaults with PTM-004 error.

**Pass Criteria**:
- [ ] Invalid configs don't crash the extension
- [ ] Fallback to default map preserves functionality
- [ ] Warning messages include error code (PTM-xxx)
- [ ] Warning messages are actionable with fix hints
- [ ] Warnings not spammed (deduped per session/workflow)

---

### Scenario 7: Full Workflow Execution

**Purpose**: End-to-end validation of complete workflow lifecycle.

**Steps**:

1. Start a `create-prd` workflow:
   ```
   Use sinfononica_start_workflow with workflowType="create-prd" and context="Add dark mode toggle to the settings page"
   ```

2. Verify initial state:
   ```
   /sinfonica status
   ```
   **Expected**: Step 1/4, status in-progress, workflowId=create-prd

3. Complete the workflow through proper delegation (this requires actual persona work):
   - The LLM should be guided through each step
   - Each step should produce artifacts
   - Advance should only succeed with evidence

4. Verify final state:
   ```
   /sinfonica status
   ```
   **Expected**: Workflow complete, artifacts in handoffs directory

5. Check handoffs directory for artifacts:
   ```bash
   ls -la .sinfonica/handoffs/s-*/
   ```

**Pass Criteria**:
- [ ] Workflow starts with correct initial state
- [ ] Steps cannot be skipped without evidence
- [ ] Final state shows complete
- [ ] Artifacts exist in handoffs directory
- [ ] Persona is correctly identified (not "unknown")

---

## Acceptance Criteria Checklist

After completing all scenarios, verify these core acceptance criteria:

### AC-1: No Blind Auto-Advance
- [ ] Cannot advance step without execution evidence
- [ ] Advance blocked with actionable message

### AC-2: No Same-Thread Drift
- [ ] Implementation tools blocked during non-implementation phases
- [ ] Policy enforced in `block` mode
- [ ] Warning shown in `warn` mode

### AC-3: Persona Integrity
- [ ] Context shows resolved persona for active step
- [ ] No "unknown" persona where resolvable

### AC-4: Artifact Integrity
- [ ] Completed workflow has recorded outputs/evidence
- [ ] Artifacts traceable in handoffs directory

### AC-5: State Integrity
- [ ] No `current_step > total_steps` scenarios
- [ ] Terminal states are consistent
- [ ] No index overflow

### AC-6: UX Integrity
- [ ] `/sinfonica` commands are stable and non-crashing
- [ ] Status widget updates correctly
- [ ] Notifications are clear and actionable

### AC-7: Per-Workflow Phase Maps
- [ ] Custom phase maps loaded from workflow.md
- [ ] Partial overrides merge correctly with defaults
- [ ] Hot reload picks up config changes
- [ ] Invalid configs fall back gracefully with warnings

---

## Troubleshooting

### Extension Not Loading

**Symptoms**: Tools not available, commands not recognized

**Checks**:
1. Verify `npm run build` completed successfully
2. Check Pi's extension loading logs
3. Ensure `surfaces/pi/index.ts` exports default function

### Tools Not Being Blocked

**Symptoms**: Write/Edit allowed during planning phase

**Checks**:
1. Verify `SINFONICA_PI_ENFORCEMENT=block` is set
2. Check `.sinfonica/config.json` for `pi_native_enforcement`
3. Verify workflow has started (not just planned)
4. Check console for policy evaluation logs

### Phase Map Not Loading

**Symptoms**: Custom config ignored

**Checks**:
1. Verify workflow.md has valid YAML frontmatter (between `---` markers)
2. Check indentation is correct (2 spaces)
3. Verify file path is correct (`.sinfonica/workflows/<id>/workflow.md` or `workflows/<id>/workflow.md`)
4. Try `/sinfonica reload` to clear cache

### Evidence Gate Not Working

**Symptoms**: Advance allowed without evidence

**Checks**:
1. Verify enforcement mode is `block` or `warn`
2. Check that a workflow session is active
3. Verify `sinfonica_advance_step` tool is being used (not CLI fallback)
4. Check return envelope for `blocked: true` in details

### Cache Not Clearing

**Symptoms**: Old config still in effect after edit

**Checks**:
1. Run `/sinfonica reload` explicitly
2. Verify reload handler is registered
3. Check for "Phase map cache cleared" in notification
4. Restart Pi session if needed

### Tool Validation Errors

**Symptoms**: "Invalid workflow type" or "Invalid decision" errors

**Cause**: The LLM may append extra text to tool parameters (e.g., `"dev-story} DONE 🎉"`) instead of sending just the value.

**Solution**: 
- The extension now validates inputs and returns clear error messages
- Error message will show: `Invalid workflow type "X". Valid types are: create-prd, create-spec, dev-story, code-review.`
- If this happens, try rephrasing your request or starting a fresh conversation
- This is an LLM behavior issue, not a bug in the extension

**Example Error**:
```
Invalid workflow type "dev-story} DONE 🎉 The dev-story workflow has been started successfully.".
Valid types are: create-prd, create-spec, dev-story, code-review.
```

**Workaround**: Start a new conversation turn or explicitly state: "Call sinfonica_start_workflow with workflowType set to exactly 'dev-story' with no additional text."

---

## Test Results Template

Use this template to record your test results:

```markdown
## Test Execution: [Date]

### Environment
- Pi Version: 
- Sinfonica Commit: 
- Enforcement Mode: 
- OS: 

### Results

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Tool Call Policy | PASS/FAIL | |
| 2. Evidence-Gated Advance | PASS/FAIL | |
| 3. Per-Workflow Phase Maps | PASS/FAIL | |
| 4. Command Surface | PASS/FAIL | |
| 5. Hot Reload | PASS/FAIL | |
| 6. Invalid Config Handling | PASS/FAIL | |
| 7. Full Workflow | PASS/FAIL | |

### Acceptance Criteria

| Criteria | Met | Notes |
|----------|-----|-------|
| AC-1: No Blind Auto-Advance | Y/N | |
| AC-2: No Same-Thread Drift | Y/N | |
| AC-3: Persona Integrity | Y/N | |
| AC-4: Artifact Integrity | Y/N | |
| AC-5: State Integrity | Y/N | |
| AC-6: UX Integrity | Y/N | |
| AC-7: Per-Workflow Phase Maps | Y/N | |

### Issues Found

1. [Description]
2. [Description]

### Recommendations

- [Recommendation 1]
- [Recommendation 2]
```

---

## References

- `pi_integration_plan.md` — Original refactor plan
- `surfaces/pi/src/orchestration/policy.ts` — Policy evaluation logic
- `surfaces/pi/src/orchestration/phase-tools.ts` — Phase map loading and caching
- `surfaces/pi/src/orchestration/evidence.ts` — Evidence validation
- `.sinfonica/handoffs/s-20260306-001/spec-per-workflow-phase-maps.md` — Phase maps technical spec
