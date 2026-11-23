# {{PROJECT_NAME}}

<!-- Teaching notes: every "Why" below is an HTML comment. Claude Code strips these before loading the file, so they cost no tokens. -->
<!-- TEMPLATE: run /agentic-init once to fill every {{...}} placeholder and every CUSTOMIZE section. Until then this file is incomplete. -->

## Overview
{{ONE_PARAGRAPH: what the product does, for whom, and the user roles}}
Read `docs/` for background, `docs/flows/` for behavior, `docs/design-brief.md` for UI direction, and `feature-index/index.yaml` to find the files behind a feature. Don't copy their content here.
<!-- Why: one source per fact. Duplicated docs drift, and Claude then trusts the stale copy. -->

## Stack
<!-- CUSTOMIZE: /agentic-init fills this from .claude/skills/agentic-init/profiles/<profile>.md -->
{{STACK_TABLE}}
<!-- Why: stops Claude from suggesting libraries or syntax that don't fit the project. -->

## Commands
<!-- CUSTOMIZE: real commands and the folder to run each from -->
{{COMMANDS}}
- Copy check (from the repo root): `npm run check-copy` (enforces the rules in `copy-rules.json`).
<!-- Why: Claude must run the real commands from the right folder. -->

## Working rules
- **Map first.** Before a risky change (auth, permissions, data model, money, anything shared between tenants), read the real code paths and report what you found before proposing a change.
- **Verify, don't assume.** Read the actual logs, data and code before naming a root cause.
- **Stop and report** when something is unclear. Do not guess and continue. When an instruction says to stop and report, stop there: do not apply a fix in the same turn, even an obvious one.
- **Never deploy and never push** without the owner's explicit approval in this session. CI must be green first.
- **No secrets in code.** Config and secrets come from `.env`; add every new variable to `.env.example` with a placeholder.
- Before navigating the codebase, read `feature-index/index.yaml` and open only the files listed for the feature at hand.
<!-- Why: each rule prevents a common and expensive agent mistake: guessing a root cause, pushing half-done work, or leaking a secret. -->

## Product rules (every app)
- **Fully responsive.** Every screen works at 375px wide with no horizontal scroll. Touch targets are at least 44px. Wide tables become cards or scroll inside their own container. E2E tests run on desktop and on a mobile device profile.
- **Language and direction.** {{LANGUAGE_RULE}} Use logical CSS properties only (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`, `text-align: start`), never left/right, so the layout works in both left-to-right and right-to-left languages without a rewrite.
- **All user-facing text in one place.** Every string shown to users lives in the strings file named in Conventions, never hard-coded in a component. {{I18N_RULE}}
{{COPY_RULE}}
- **Accessible (WCAG 2.1 AA{{A11Y_LOCAL_STANDARD}}).** Native semantic HTML first: real buttons and links, headings in order, landmarks (`header`, `nav`, `main`, `footer`). ARIA only where no native element fits. Every input has a visible label. Everything works with the keyboard alone, with a visible focus and a logical order. Text contrast is at least 4.5:1 (3:1 for large text and UI parts). Meaningful images and icons have a text alternative; decorative ones are hidden from screen readers. Errors and success messages are announced and errors are tied to their field. No information by color alone. Respect `prefers-reduced-motion`. Every screen works at 200% zoom. E2E checks every screen with axe.
<!-- Why: product rules that apply to every app. Accessibility is a legal requirement for digital services in many countries and is cheap only when built in from the first screen. Copy rules (if any) are enforced by a script, because a written rule alone does not stop a model from adding characters it likes. -->

## Conventions
<!-- CUSTOMIZE: patterns the code already follows (or will follow). Describe what is, not an ideal. -->
{{CONVENTIONS}}

## Security and privacy
<!-- CUSTOMIZE: /agentic-init fills the profile-specific list -->
{{SECURITY_RULES}}
- Never read, print or copy `.env`, key files or service-account files. A hook blocks this; do not work around it. The hook blocks only you: when a blocked file must be created or committed, give the owner the exact command and let them run it in their own terminal. Never suggest a bypass (there is no `git add --no-verify`). Env files that hold no secrets can be listed in `.claude/public-env-files`, with the owner's approval.
- Personal data (names, phone numbers, ID numbers, emails) never goes into logs, test fixtures, docs or commit messages. Tests use invented data.
<!-- Why: security rules are cheap to follow and expensive to fix after a leak. -->

## SDLC workflow
Work flows through skills, each with one job and one output file under `specs/features/`:
`/product` (spec) -> `/qa` phase 1 (E2E tests first) -> `/architect` (plan) -> `plan-reviewer` -> `/architect revise` -> `/dev` (implement) -> commit -> `code-reviewer` (+ `security-reviewer`) -> fix -> `/qa` (verify) -> `/handoff`.
- Start each skill in a fresh session (`/clear`), because every step reads the previous step's file. Two exceptions: plan review continues the plan session, and fixes continue the code-review session.
- Do not use Claude Code's built-in Plan mode. `/architect` writes the plan to a file.
- Each skill and agent sets its own model (`/architect`, `plan-reviewer` and `security-reviewer` on Opus, the rest on Sonnet). The setting lasts one turn, so keep the session default on Sonnet and run every planning turn through `/architect`, including answers and revisions.
- `plan-reviewer`: after `/architect` writes a plan, before it is approved. Returns approve or revise.
- `code-reviewer`: after the implementation is committed. Ask for it in plain words, naming the target: `run code-reviewer on last commit`. Targets: `last commit`, `commit <sha>`, `commit <name>`, `branch` (every commit since the branch left `main`) or `pr <number>`.
- `security-reviewer`: same targets as `code-reviewer`. Run it on any change that touches auth, permissions, rules or policies, personal data, payments, or tenant boundaries. When the change spans more than one commit, review `branch` or the PR, not `last commit`.
<!-- Why: agents are started by asking for them; an `@name` typed by hand is plain text. `last commit` sees one commit only, so a fix made in an earlier commit of the same change goes unreviewed. -->
- `/handoff`: a short structured report the owner forwards for an outside review.
<!-- Why: separate roles keep each step focused, and a reviewer with a fresh context catches what the author no longer sees. Keep process details in the skills and agents, not here. -->

## Docs
- After every commit, a post-commit hook asks headless Claude to update `docs/` and `feature-index/index.yaml` and commits the result as `docs: update for <sha>`. Review those commits.
- Your commit messages must not start with `docs:` or the hook skips them.
- `docs/design-brief.md` is owned by the human. Never edit it unless asked.

## Git and commits
- Work on a feature branch, never on `main`.
- Small commits, imperative subject line. One commit per SDLC step.
- Run lint and `npm run check-copy` before committing.
- Never commit unless asked; leave changes uncommitted until then. Review fixes go in their own commit.
- Never push, force-push, or touch `main` without explicit approval.

## Testing policy
- No backfill: do not write tests for existing code just to raise coverage.
- New and changed code gets unit and integration tests; user flows get E2E tests (desktop + mobile).
{{TEST_RULES}}
- Tests create their own uniquely named, invented data and never assume an empty database.
<!-- Why: tests tied to changes grow coverage where the risk is. -->
