# Evidence: C14 Legacy Reference Scan

- Session: `s-20260302-008`
- Check: `C14`
- Command: `rg -n "pi-sinfonica-extension/|legacy adapter path" docs/`
- Result: **pass**

## Output snapshot

- `docs/operations/p1-repository-migration-notes.md` contains historical deprecation context for `pi-sinfonica-extension/`.
- `docs/operations/p5-legacy-reference-audit.md` contains audit/deprecation documentation for this check.
- No active runtime guidance docs outside approved deprecation/audit references contain legacy canonical paths.

## Approved references

- `docs/operations/p1-repository-migration-notes.md`
- `docs/operations/p5-legacy-reference-audit.md`
