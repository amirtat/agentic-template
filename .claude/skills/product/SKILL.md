---
name: product
description: Turns a feature request into a written spec (summary, user stories, numbered acceptance criteria, UI contract including mobile, out of scope, open questions) saved in specs/features/. Use when the user describes a new feature or change and wants requirements before any planning or code. Writes no code and no tests.
---

# Product: feature request to spec

Input: a feature request from the user. Output: one spec file at
`specs/features/<YYYYMMDD-HHmm>-<kebab-case-name>.md`.

## Steps

0. **Start the feature branch.** Run `git branch --show-current` and `git status --porcelain`.
   - On `main` with a clean working tree: `git pull --ff-only`, then `git checkout -b feat/<kebab-case-name>` (the same name as the spec file).
   - On `main` with uncommitted changes, or if the pull fails: stop and report. Do not stash, reset or merge.
   - Already on another branch: ask whether this feature continues there or starts fresh from `main`.
   <!-- Why: `main` on this machine does not update itself after a merge on GitHub. A branch cut from a stale `main` lacks the last merged work and conflicts later. -->
1. **Read the ground truth.** `CLAUDE.md`, `docs/README.md`, `feature-index/index.yaml`, the relevant `docs/flows/*.md`, and `docs/design-brief.md`.
   <!-- Why: the flows describe current behavior and the brief sets copy and states. A spec written without them contradicts the app or invents UI. -->
2. **Check the real code** (routes, pages, components, API endpoints or functions, the strings file) wherever the spec will name a route, label, heading or message. Use the feature index to find them.
   <!-- Why: docs drift. The UI contract is what E2E tests will assert, so a label copied from a doc instead of the code produces tests that fail for the wrong reason. -->
3. **Ask before guessing.** If the request is ambiguous, or a needed fact is not in the docs or code, ask the user. Batch the questions into one message. Do not write the spec until the blocking ones are answered.
   <!-- Why: a guessed answer becomes an acceptance criterion, then code, then tests. Cheapest to fix here. -->
   Anything non-blocking goes in "Open questions" instead.
4. **Get the timestamp** from the shell (`date +%Y%m%d-%H%M`). Do not guess it. Name the feature in kebab-case, e.g. `specs/features/20261117-0930-export-results-csv.md`.
   <!-- Why: dev and qa derive their own file names from this one. A wrong or inconsistent name breaks that link. -->
5. **Write the spec** with exactly these sections, in this order:
   - **Summary**: what and why, two or three sentences.
   - **User stories**: `As a <role>, I want ... so that ...`, using the roles in `docs/architecture.md`. Include at least one edge-case story.
   - **Acceptance criteria**: numbered (`AC1`, `AC2`, ...). Each one is observable and testable: a specific input or action and a specific result, including the status or error where the server is involved. Cover failure and permission cases, not only the happy path. Include at least one criterion for the mobile layout of any screen the feature adds or changes, and one for completing any new form or dialog with the keyboard alone.
     <!-- Why: dev and qa cite these numbers. Vague criteria ("works well") cannot be tested, so they get skipped. -->
   - **UI contract**: only what E2E tests need, no styling:
     - Routes, and which role can access each (and what other roles see or where they are redirected).
     - Visible labels, headings, button text and messages, written exactly as they must appear, in the app's primary language, and following the copy rules in `CLAUDE.md` (if any).
     - Key states: empty, error, success (and loading if the test must wait on it).
     - Mobile (375px wide): what changes from desktop, for example a table shown as cards or a menu behind a button. Anything not listed stays the same.
     - Accessibility: the accessible name of every control the tests use (what `getByRole` finds), where focus goes when a dialog or form opens and closes, what is announced on success and error, and the text alternative of every meaningful image or icon. Everything else follows the "Accessible" rule in `CLAUDE.md`.
     - Assumed test data: the records, users, roles and statuses the tests start from. Invented data only, never real personal data.
     - A `data-testid` only where no role or label can identify the element. Name it here.
     <!-- Why: qa writes tests from this section before the feature exists. Anything not listed is something the test author has to guess. -->
   - **Out of scope**: what this feature deliberately does not do, including nearby known limitations from `docs/architecture.md` that you are not fixing.
   - **Open questions**: unresolved, non-blocking decisions, each with a suggested default.
6. **Check against the docs.** Labels follow the tone and state patterns in `docs/design-brief.md`. Nothing contradicts a flow doc unless the spec says the behavior is changing.
7. **Report** the file path and list the open questions.

<!-- CUSTOMIZE: the spec sections and the AC numbering scheme. If you change step 5, keep a testable-criteria section and a UI contract so downstream steps still have something to work from. -->

## Do not

- Write or edit application code, tests, or any file other than the spec.
- Invent routes, labels, roles, endpoints or data. Take them from the code and docs, or ask.
- Put implementation details (files, tables, libraries) in the spec. That is the plan's job.
- Leave a blocking question unanswered by choosing for the user.
- Commit.
