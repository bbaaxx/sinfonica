# P5 Legacy Reference Audit and Deprecation Notes

This audit tracks stale legacy references and approved deprecation handling for migration closure.

## C14 audit scope

- Scan pattern: `pi-sinfonica-extension/|legacy adapter path`
- Scan target: `docs/`

## Approved deprecation references

The following deprecation references are allowed because they are historical migration context, not active runtime guidance:

- `docs/operations/p1-repository-migration-notes.md`
  - Documents the original move from `pi-sinfonica-extension/` to `surfaces/pi/`.
- `docs/operations/p5-legacy-reference-audit.md`
  - Contains the `C14` scan pattern and deprecation findings for audit traceability.

## Audit result

- `pi-sinfonica-extension/` matches are restricted to approved deprecation references.
- No active docs outside approved deprecation references use the legacy canonical path.
- `legacy adapter path` literal has zero matches in active docs.

## Deprecation/cutover notes

- Canonical adapter location remains `surfaces/pi/` and `surfaces/opencode/`.
- Any newly discovered legacy path mention in active docs is a cutover-blocking defect until corrected.
