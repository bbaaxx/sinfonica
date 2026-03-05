# pi-sinfonica-extension

Pi extension package for Sinfonica workflow orchestration.

## Installation

Install from git:

```bash
pi install git:https://github.com/bbaaxx/sinfonica/tree/main/packages/sinfonica/surfaces/pi
```

Install from a local checkout:

```bash
pi install /absolute/path/to/sinfonica/surfaces/pi
```

Prerequisites:

- `sinfonica` CLI is installed and available on `PATH`
- project repository contains `workflows/` and `.sinfonica/` runtime data

## Usage

The extension registers workflow tools and a `/sinfonica` command surface:

- Tools: `sinfonica_start_workflow`, `sinfonica_advance_step`, `sinfonica_list_workflows`
- Slash command: `/sinfonica status|advance|list|abort|reload`

Typical loop:

1. Start a workflow with `sinfonica_start_workflow` (for example `create-prd`).
2. Review generated artifacts and workflow status.
3. Advance with `sinfonica_advance_step` (`approve` or `request-revision`).
4. Repeat until workflow completion.

The extension also publishes:

- `sinfonica:status` updates from active workflow state
- `sinfonica:context` injection before agent execution when a workflow is active

## Troubleshooting

- `sinfonica` command not found: confirm CLI install and that your shell `PATH` includes the binary location.
- No workflows listed: ensure `workflows/` exists in the active repository and contains workflow directories.
- No active status/context: confirm `.sinfonica/handoffs/<session-id>/workflow.md` exists and status is `in-progress`.
- Rules not applied: run `/sinfonica reload` after modifying `.sinfonica/enforcement/rules/`.
