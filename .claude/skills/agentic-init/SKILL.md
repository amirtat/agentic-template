---
name: agentic-init
description: One-time setup of a new project created from the agentic template. Interviews the owner (product, roles, stack profile, tenancy, languages, deploy target), fills every placeholder in CLAUDE.md from a stack profile, and sets up the test baseline (lint, copy check, unit, integration, E2E desktop and mobile) and CI. Use right after creating a repo from the template, or when adopting the kit on an existing project.
disable-model-invocation: true
---

# Agentic init

Turns the template into this project's setup. Profiles live next to this file in `profiles/`: `static.md`, `firebase.md`, `supabase.md`.

## Steps

1. **Check state.** If `CLAUDE.md` no longer contains `{{PROJECT_NAME}}`, the project is already initialized: stop and say so. Note whether the repo already has application code (anything beyond the template files).
2. **Interview.** Ask in one message, with a suggested answer for each:
   1. Project name and one paragraph: what it does and for whom.
   2. User roles (for example: admin, viewer, end user).
   3. Stack profile: `static` (HTML, CSS, JS, no server or database; GitHub Pages or Netlify), `firebase` (React + Vite + Firebase), or `supabase` (React + Vite + Supabase).
   4. Multi-tenant? If yes, what is a tenant (council, company, team)?
   5. Languages: Hebrew only, or several from day one (which)?
   6. Deploy target and how deploys happen (CI on push to `main` is the default).
   7. Personal data handled (names, phone, ID numbers, documents)? This sets the security-reviewer scope.
   Wait for the answers. Do not guess.
3. **Read the chosen profile** in `profiles/` and fill `CLAUDE.md`:
   - `{{PROJECT_NAME}}`, `{{ONE_PARAGRAPH...}}` from answers 1 and 2.
   - `{{STACK_TABLE}}`, `{{COMMANDS}}`, `{{CONVENTIONS}}`, `{{SECURITY_RULES}}`, `{{TEST_RULES}}` from the profile's sections of the same names.
   - `{{I18N_RULE}}`: Hebrew only -> "Today the app is Hebrew only; keep strings keyed so a second language is a new file, not a refactor." Several languages -> the profile's "Multi-language" section.
   - Multi-tenant -> add the profile's "Multi-tenant" rules to Conventions and Security.
   Delete the `TEMPLATE:` comment at the top of `CLAUDE.md`. Leave no `{{` placeholder behind. Delete any profile text that does not apply.
4. **Scaffold the baseline** as the profile's "Baseline" section describes. If the repo has no application code, scaffold the minimal app with the official tool named in the profile; show the command and ask before running it. Always:
   - `package.json` keeps `"postinstall": "git config core.hooksPath .githooks || true"` and the `check-copy` script, and gains `lint`, `format` (`prettier --write .`), `test`, `test:e2e` scripts.
   - Prettier is installed (the `format-on-edit` hook formats each file Claude edits with it) with a `.prettierrc` of `{ "singleQuote": true, "printWidth": 100 }` and a `.prettierignore` that skips `dist`, `coverage`, `docs`, `specs` and lock files. ESLint uses `eslint-config-prettier` so the two never fight.
   - `playwright.config` has two projects, `desktop` and `mobile` (a phone device profile), and a `webServer` that starts the app.
   - The strings file and the tokens file exist at the paths the profile names, and the root HTML has `lang="he" dir="rtl"` (or the first language's values).
   - One smoke test per level: unit, integration (if the profile has a server or rules), E2E (loads the home page on desktop and mobile, checks the main heading and no horizontal scroll).
   - `.env.example` lists every variable the profile needs, with placeholders. Never write real values.
   - `.github/workflows/ci.yml`: adjust the steps as the profile's "CI" section says.
   - `scripts/check-copy.mjs`: set `SCAN_PATHS` to the profile's source folders.
5. **Verify.** Run `npm install` (this also installs the git hooks), then lint, `npm run check-copy`, unit, integration and E2E. Fix setup problems. Report exact results; anything that cannot run here (for example an emulator that is not installed) is reported with the reason and the command to run it.
6. **Report** what was filled and scaffolded, the check results, and the next steps:
   1. Review the changes, then commit on a branch: `chore: initialize agentic setup`.
   2. Run `/design-brief`.
   3. Existing code only: run `/bootstrap-docs`.
   4. First feature: `/product <feature>`.

## Do not

- Commit, push or deploy.
- Write secrets or real personal data anywhere.
- Install a different test framework than the profile names.
- Backfill tests for existing code. One smoke test per level is the baseline.
