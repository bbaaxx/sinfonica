# Dispatch Envelope: Stage 01 -> @sinfonia-coda

## Session
- Session ID: `s-20260302-001`
- Stage: `01 - Implementation`
- Requested by: Developer via Maestro (`SP`)

## Task
Create a single onboarding/primer document for future agents:

- File path: `docs/SINFONIA_QUICK_PRIME.md`
- Purpose: Quickly prime any future agent on the peculiar nature of this repository and how to work safely/effectively in it.
- Critical context to include: Maestro is orchestrator persona, and the code that powers Maestro is maintained in this same repository.

## Constraints
1. Document must be **200 lines or fewer**.
2. Place file at root of docs folder exactly as: `docs/SINFONIA_QUICK_PRIME.md`.
3. Keep it concise, practical, and agent-oriented.
4. When deeper detail is needed, reference relevant documents under `docs/` instead of duplicating long explanations.
5. Preserve existing repo conventions and do not introduce unrelated edits.

## Expected Output
1. New file `docs/SINFONIA_QUICK_PRIME.md` created.
2. Content covers:
   - What Sinfonia is in this repo
   - How orchestration and subagents are expected to run
   - Where core source files/tests/docs live
   - Required quality gates and safety rules
   - Pointers to deeper docs in `docs/`
3. Return envelope summarizing:
   - What was written
   - Line count confirmation (<= 200)
   - Any assumptions or open questions

## Validation Checklist
- [ ] File exists at `docs/SINFONIA_QUICK_PRIME.md`
- [ ] Line count <= 200
- [ ] References additional docs for depth
- [ ] No unrelated file modifications
