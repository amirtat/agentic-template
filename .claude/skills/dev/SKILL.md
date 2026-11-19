---
name: dev
description: Implements a feature from a spec in specs/features/ in two phases. First writes an implementation plan next to the spec and stops for approval, then, once approved, implements the code plus unit and integration tests for new and changed code only. Use when a spec exists and the user wants it planned or built. Does not commit.
---

# Dev: spec to plan to implementation

Input: a spec at `specs/features/<timestamp>-<name>.md`. If the user did not name one, list `specs/features/` and ask which.
Decide the phase from the request: `plan` or `implement`.

## Phase 1: plan

1. **Read** the spec in full, then `CLAUDE.md`, `docs/README.md`, `docs/architecture.md`, the relevant `docs/flows/*.md`, `docs/design-brief.md` and `feature-index/index.yaml`. Read the code you expect to change (the feature index lists it).
   <!-- Why: the plan must follow the project's layering and conventions. Those live in CLAUDE.md and docs/, not in this skill. -->
2. **Map first** if the change touches auth, permissions, rules or policies, the data model, money, or tenant boundaries: describe the current code path in the plan's Approach before proposing a change.
3. **Ask** if the spec leaves a blocking question (data model, auth, error paths). Do not choose silently.
4. **Write the plan** to `specs/features/<timestamp>-<name>.plan.md`, reusing the spec's exact timestamp and name.
   <!-- Why: the shared prefix is how spec, plan and test report stay linked. -->
   Sections:
   - **Approach**: a short summary and any tradeoff worth the reviewer's attention (performance, security, hard to reverse, deviation from CLAUDE.md).
   - **Coverage**: a table mapping every acceptance criterion and every UI contract item (including the mobile and accessibility items) to the change that satisfies it.
     <!-- Why: a criterion without a row is a criterion that gets forgotten. -->
   - **Files to change**: path and one-line purpose each, grouped by area.
   - **Data changes**: new collections, tables, fields, indexes, migrations, rules or policies, and how each is reversed. Write "none" if none.
   - **Strings**: every new user-facing string and its key in the strings file.
   - **Tests to add**: per file, per level (unit, integration), naming the criteria each covers. New and changed code only.
   - **Risks and assumptions.**
5. **Stop.** Tell the user the plan path and wait. Do not touch application code or tests.
   <!-- Why: reviewing a plan costs minutes; reviewing a wrong implementation costs hours. The user may edit the plan file or reply with changes. -->

## Phase 2: implement (only after explicit approval)

6. **Re-read the plan file** before starting. The user may have revised it. Where the plan and the spec now disagree, ask.
   <!-- Why: the approved plan is the contract, not your memory of the draft. -->
7. **Implement** exactly the approved plan, following `CLAUDE.md` (working rules, product rules, conventions, security) and `docs/design-brief.md`.
   - Use the labels and messages from the spec's UI contract verbatim, through the strings file, never hard-coded.
   - Every screen you add or change works at 375px wide. Use logical CSS properties only.
   - Follow the "Accessible" product rule: native elements, labels, keyboard use, visible focus, announced messages.
   - Follow the copy rules in `CLAUDE.md` (if any) in every user-facing text.
   If you must deviate from the plan, stop and say so before doing it.
8. **Write tests for new and changed code only.**
   - **Unit tests:** every new or changed unit of logic gets a unit test covering success, failure and edge cases.
   - **Integration tests:** every new or changed server endpoint, function, rule or policy gets tests for success, validation, auth and role, and not-found cases. Access rules get adversarial tests: a user who must be denied is denied.
   - Use the framework, location and command that `CLAUDE.md` lists; do not pick or install a different one. If `CLAUDE.md` lists none for an area, do not add one: say so and list that code as untested in the report.
   <!-- Why: integration tests alone hide which unit broke. Using the project's own framework keeps the suite runnable by everyone. -->
9. **Run lint, `npm run check-copy`, and the unit and integration tests** with the commands in `CLAUDE.md`. Fix failures in code you wrote. If a failure is pre-existing or outside the change, report it instead of fixing it.
   <!-- Why: "done" is only meaningful if the checks ran and you can show the result. -->
10. **Report**: files changed, data changes, each new or changed unit and endpoint with the test that covers it (name anything left untested and why), the lint, copy-check and test results (exact pass/fail counts, including anything that did not run and why), and any deviation from the plan. Leave changes uncommitted.

## Do not

- Write application code or tests before the plan is approved.
- Treat silence or a general "ok" about something else as approval. Ask.
- Write E2E tests. Those belong to `/qa`.
- Write tests for existing code you did not change.
- Edit an applied migration, change schema by hand, or hardcode config values or secrets.
- Edit the spec. If it is wrong or incomplete, say so and send the user back through `/product`.
- Edit `docs/` or `feature-index/`. The post-commit hook maintains them.
- Commit, push or deploy.
