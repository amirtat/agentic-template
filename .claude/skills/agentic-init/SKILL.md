---
name: agentic-init
description: One-time setup of a new project created from the agentic template. Interviews the owner (product, roles, stack profile, tenancy, languages, deploy target), fills every placeholder in CLAUDE.md from a stack profile, and sets up the test baseline (lint, copy check, unit, integration, E2E desktop and mobile) and CI. Use right after creating a repo from the template, or when adopting the kit on an existing project.
disable-model-invocation: true
---

# Agentic init

Turns the template into this project's setup. Profiles live next to this file in `profiles/`: `static.md`, `firebase.md`, `supabase.md`, `firebase-postgres.md`.

## Steps

1. **Check state.** If `CLAUDE.md` no longer contains `{{PROJECT_NAME}}`, the project is already initialized: stop and say so. Note whether the repo already has application code (anything beyond the template files).
2. **Interview.** Ask in one message, with a suggested answer for each:
   1. Project name and one paragraph: what it does and for whom.
   2. User roles (for example: admin, viewer, end user).
   3. Stack profile: `static` (HTML, CSS, JS, no server or database; GitHub Pages or Netlify), `firebase` (React + Vite + Firebase), `supabase` (React + Vite + Supabase), or `firebase-postgres` (React + Vite + Firebase Hosting + Identity Platform + Cloud SQL Postgres with RLS; for B2B and multi-tenant apps with enterprise sign-in).
   4. Multi-tenant? If yes, what is a tenant (council, company, team)?
   5. Languages: the primary UI language (is it right-to-left, like Hebrew or Arabic?), and any more languages from day one.
   6. Deploy target and how deploys happen (CI on push to `main` is the default).
   7. Personal data handled (names, phone, ID numbers, documents)? This sets the security-reviewer scope.
   8. Install to the home screen (PWA)? Suggest yes for apps people open often on the phone, no for back-office tools.
   9. Who can reach the app: the general public, or only signed-in customers or employees? Public-facing apps may need an accessibility statement page.
   10. The country or region of most users. It sets the local accessibility law next to WCAG.
   11. Copy rules: characters to forbid in user-facing text, for example the em dash (models overuse it). Default: none.
   Wait for the answers. Do not guess.
3. **Read the chosen profile** in `profiles/`. If it has an "Extra questions" section, ask those now and wait for the answers. Then fill `CLAUDE.md`:
   - `{{PROJECT_NAME}}`, `{{ONE_PARAGRAPH...}}` from answers 1 and 2.
   - `{{STACK_TABLE}}`, `{{COMMANDS}}`, `{{CONVENTIONS}}`, `{{SECURITY_RULES}}`, `{{TEST_RULES}}` from the profile's sections of the same names.
   - `{{LANGUAGE_RULE}}`: "The primary language is <language> (`<html lang="<code>" dir="<ltr or rtl>">`)." For a right-to-left language add: "Check every screen in right-to-left; icons that show direction (arrows, back) are mirrored."
   - `{{I18N_RULE}}`: one language -> "Today the app is <language> only; keep strings keyed so a second language is a new file, not a refactor." Several languages -> the profile's "Multi-language" section.
   - `{{COPY_RULE}}`: no copy rules -> delete the placeholder line. Otherwise write each forbidden character to `copy-rules.json` (`{ "forbidden": [{ "char": "\u2014", "name": "em dash", "fix": "use a regular hyphen (-)" }] }`), and replace the line with: "- **Copy rules.** User-facing text never contains <the list, each with its fix>. `npm run check-copy` enforces this after every edit, in pre-commit and in CI."
   - `{{A11Y_LOCAL_STANDARD}}`: from answer 10: Israel -> ", Israeli Standard 5568"; European Union -> ", EN 301 549"; United States -> ", ADA and Section 508"; United Kingdom -> ", Equality Act 2010"; anywhere else -> nothing (WCAG alone).
   - Multi-tenant -> add the profile's "Multi-tenant" rules to Conventions and Security.
   - PWA -> read `pwa.md` next to this file and add its "Product rule" to Product rules.
   - Public-facing, where local law asks for one (for example Israel, and the public sector in the European Union and the United Kingdom) -> add to Product rules: "**Accessibility statement.** A page with the accessibility statement is linked from the footer of every page. Its content comes from the owner."
   Delete the `TEMPLATE:` comment at the top of `CLAUDE.md`. Leave no `{{` placeholder behind. Delete any profile text that does not apply.
4. **Scaffold the baseline** as the profile's "Baseline" section describes. If the repo has no application code, scaffold the minimal app with the official tool named in the profile; show the command and ask before running it. Always:
   - **Never scaffold over the template.** The repo already has `package.json`, `.gitignore` and `README.md`, and a scaffolder like `npm create vite` overwrites them. Run it in a temporary folder outside the repo, copy in the app files, and merge `package.json` (keep the template's scripts, add the scaffold's dependencies and scripts) and `.gitignore` (keep every template line, add the scaffold's). Keep the template's `README.md`. Delete the temporary folder.
   - **Placeholder Firebase project id:** `demo-<project-name>`. The emulators treat any id that starts with `demo-` as offline and never reach a real project. Every command that starts the emulators (npm scripts, Playwright `webServer`, CI) passes `--project demo-<project-name>` explicitly; `.firebaserc` names the deploy target only, so it can later switch to the real project without moving tests to the cloud.
   - **Migration files** are created with the profile's "new migration" command, so the timestamp in the name is the real current time. Never type a migration file name by hand.
   - **Tailwind** (profiles that list it): Tailwind 4 with `npm i -D tailwindcss @tailwindcss/vite`, the `tailwindcss()` plugin in `vite.config.js`, and `@import "tailwindcss";` at the top of `src/index.css`. No `tailwind.config.js` and no PostCSS config; theme values come from the tokens file.
   - `package.json` keeps `"postinstall": "git config core.hooksPath .githooks || true"` and the `check-copy` script, and gains `lint`, `format` (`prettier --write .`), `test`, `test:e2e` scripts.
   - Prettier is installed (the `format-on-edit` hook formats each file Claude edits with it) with a `.prettierrc` of `{ "singleQuote": true, "printWidth": 100 }` and a `.prettierignore` that skips `dist`, `coverage`, `docs`, `specs` and lock files. ESLint uses `eslint-config-prettier` so the two never fight.
   - `playwright.config` has two projects, `desktop` and `mobile` (a phone device profile), and a `webServer` that starts the app.
   - The strings file and the tokens file exist at the paths the profile names, and the root HTML has the primary language's `lang` and `dir`.
   - Accessibility checks: `npm i -D @axe-core/playwright`, and a helper `e2e/a11y.js` exporting `expectNoA11yViolations(page)`. It runs axe with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and fails on any `serious` or `critical` violation, listing each rule id, target and help URL.
   - One smoke test per level: unit, integration (if the profile has a server or rules), E2E (loads the home page on desktop and mobile, checks the main heading, no horizontal scroll, and `expectNoA11yViolations`).
   - PWA -> everything in the "Baseline" and "Tests" sections of `pwa.md`.
   - `.env.example` lists every variable the profile needs, with placeholders. Never write real values.
   - **Tests read `.env` locally the same way CI provides it.** Every Vitest config or workspace project whose tests read `process.env` sets `env: loadEnv('test', process.cwd(), '')` (from `vite`; the empty prefix loads every variable, not only `VITE_`). Tests that need a variable check it before connecting and fail with `Missing <VAR>. Copy .env.example to .env (cp .env.example .env)`.
     <!-- Why: Vitest loads only VITE_ variables from .env by default. CI sets the rest in ci.yml, so the suite passes there and fails on every developer machine. -->
   - `.github/workflows/ci.yml`: adjust the steps as the profile's "CI" section says.
   - `scripts/check-copy.mjs`: set `SCAN_PATHS` to the profile's source folders.
5. **Verify.** Run `npm install` (this also installs the git hooks), then lint, `npm run check-copy`, unit, integration and E2E. Fix setup problems. Report exact results; anything that cannot run here (for example an emulator that is not installed) is reported with the reason and the command to run it.
6. **Report** what was filled and scaffolded, the check results, and the next steps:
   1. Review the changes, then commit on a branch: `chore: initialize agentic setup`. If the profile has a server, rules or policies, run `security-reviewer` on `branch` before merging.
   2. Run `/design-brief`.
   3. Existing code only: run `/bootstrap-docs`.
   4. First feature: `/product <feature>`.
   5. If the profile has an "Owner setup" section: list its steps as a checklist for the owner.
   6. If the profile commits a non-secret env file (for example `functions/.env.<project-id>`), add its exact path to `.claude/public-env-files` so the secret-file hook lets you write it.
   6. PWA: the "Owner notes" from `pwa.md` (real icons to supply, how users install). Public-facing: the owner writes the accessibility statement text.

## Do not

- Commit, push or deploy.
- Write secrets or real personal data anywhere.
- Install a different test framework than the profile names.
- Backfill tests for existing code. One smoke test per level is the baseline.
