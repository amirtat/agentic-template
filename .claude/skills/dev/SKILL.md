---
name: dev
description: Implements an approved plan from specs/features/<timestamp>-<name>.plan.md, with unit and integration tests for new and changed code only, then runs lint, the copy check and the tests. Use after /architect wrote the plan and the user approved it. Does not commit.
model: sonnet
---

# Dev: approved plan to code

Input: an approved plan written by `/architect`.

## Steps

1. **Find the approved plan** at `specs/features/<timestamp>-<name>.plan.md`. If the user did not name one, list the plans and ask which. If there is no plan, stop and send the user to `/architect`.
2. **Confirm approval.** Implement only a plan the user approved in so many words. A request to run this skill on a named plan counts as approval of that plan.
3. **Read the plan, its spec and `CLAUDE.md`** before starting. The user may have revised the plan. Where the plan and the spec now disagree, ask.
   <!-- Why: the approved plan is the contract, not your memory of the draft. -->
4. **Implement** exactly the approved plan, following `CLAUDE.md` (working rules, product rules, conventions, security) and `product/design-brief.md`.
   - Use the labels and messages from the spec's UI contract verbatim, through the strings file, never hard-coded.
   - Every screen you add or change works at 375px wide. Use logical CSS properties only.
   - Follow the "Accessible" product rule: native elements, labels, keyboard use, visible focus, announced messages.
   - Follow the copy rules in `CLAUDE.md` (if any) in every user-facing text.
   If you must deviate from the plan, stop and say so before doing it.
5. **Write tests for new and changed code only.**
   - **Unit tests:** every new or changed unit of logic gets a unit test covering success, failure and edge cases.
   - **Integration tests:** every new or changed server endpoint, function, rule or policy gets tests for success, validation, auth and role, and not-found cases. Access rules get adversarial tests: a user who must be denied is denied.
   - Use the framework, location and command that `CLAUDE.md` lists; do not pick or install a different one. If `CLAUDE.md` lists none for an area, do not add one: say so and list that code as untested in the report.
   <!-- Why: integration tests alone hide which unit broke. Using the project's own framework keeps the suite runnable by everyone. -->
6. **Run lint, `npm run check-copy`, and the unit and integration tests** with the commands in `CLAUDE.md`. Fix failures in code you wrote. If a failure is pre-existing or outside the change, report it instead of fixing it.
   <!-- Why: "done" is only meaningful if the checks ran and you can show the result. -->
7. **Visual check** (when screens changed): with the app running, take a few Playwright screenshots of the changed screens (for example the main screen of each, at 1440px and 390px, in the primary language), compare each with the mockup in `product/reference/` and the design brief, and fix clear mistakes (layout, spacing, alignment, direction, colors). One round; keep the screenshots in `test-results/visual/` (git-ignored) and list them in the report so the owner sees the screens before a deploy.
   <!-- Why: tests pass on a screen nobody looked at. The first platform screens shipped green and looked amateur. -->
8. **Report**: files changed (from `git diff --stat`, never from memory), data changes, each new or changed unit and endpoint with the test that covers it (name anything left untested and why), the lint, copy-check and test results (exact pass/fail counts, including anything that did not run and why), and any deviation from the plan. Leave changes uncommitted.

## Do not

- Write application code or tests without an approved plan, or change the plan. If the plan is wrong, stop and send the user back to `/architect`.
- Treat silence or a general "ok" about something else as approval. Ask.
- Write E2E tests. Those belong to `/qa`.
- Write tests for existing code you did not change.
- Edit an applied migration, change schema by hand, or hardcode config values or secrets.
- Edit the spec. If it is wrong or incomplete, say so and send the user back through `/product`.
- Edit `docs/` or `feature-index/`. The post-commit hook maintains them.
- Commit, push or deploy.
