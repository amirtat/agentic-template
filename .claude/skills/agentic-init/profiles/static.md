# Profile: static (HTML, CSS, JS; no server, no database)

For forms, landing pages and small tools. Data, if any, leaves the page through a webhook (for example Make or n8n) or a third-party form service.

## STACK_TABLE
| Layer | Technology |
|---|---|
| Runtime | Node.js 22 or later (tooling only) |
| Pages | Plain HTML files in `site/`, ES module JavaScript in `site/js/`, no framework |
| Styling | Plain CSS with logical properties; values from `site/css/tokens.css` |
| Data out | `fetch` POST to a webhook URL from config; no database |
| Testing | Vitest (unit, for JS modules), Playwright (E2E) |
| Hosting | GitHub Pages or Netlify, deployed by CI |

## COMMANDS
- Dev server (root): `npm run dev` (serves `site/` on port 5173).
- Unit (root): `npm test` (Vitest).
- E2E (root): `npm run test:e2e` (Playwright; its `webServer` serves `site/`).
- Lint (root): `npm run lint`.
- Deploy: CI only, on a green push to `main`.

## CONVENTIONS
- One HTML file per page; shared header and footer markup is copied consistently or injected by one small script.
- JavaScript in ES modules, one module per concern (`form.js`, `validation.js`, `i18n.js`); no inline scripts except a tiny bootstrap.
- All user-facing text in `site/i18n/he.js` (an exported object). Elements carry `data-i18n="key"` and `i18n.js` fills them, so the HTML holds keys, not copy.
- Forms validate on the client for UX, show inline errors, disable the submit button while sending, and show a clear success state.
- Every form has a honeypot field (with a `name` browsers will not autofill) to stop simple bots.
- No hardcoded colors or sizes; values live in `site/css/tokens.css`.

## SECURITY_RULES
- Everything in `site/` is public. No API keys, tokens or secrets in any file. A webhook URL is not a secret, so the receiving side (Make, n8n) must validate input and rate-limit.
- Never log or store form contents in the browser (no `localStorage` for personal data).
- Personal data is sent only over HTTPS to the configured webhook.

## TEST_RULES
- Unit tests: Vitest in `tests/unit/` for validation and formatting logic.
- E2E: Playwright in `e2e/`, projects `desktop` and `mobile`. Webhook calls are intercepted with `page.route` and asserted; tests never send real submissions.

## Multi-tenant
Not applicable to this profile. If the owner answers yes, stop and suggest the firebase or supabase profile.

## Multi-language
`site/i18n/<lang>.js` per language; `i18n.js` picks the language from the URL or a toggle, fills `data-i18n` elements, and sets `lang` and `dir` on `<html>`. A new string is added to every language file in the same commit.

## Baseline
- Create `site/index.html` (with `lang="he" dir="rtl"` and a viewport meta tag), `site/css/tokens.css`, `site/css/main.css`, `site/js/i18n.js`, `site/i18n/he.js`.
- `npm i -D vitest @playwright/test eslint serve`; `dev` script: `serve site -l 5173`.
- Smoke tests: one Vitest unit test, one E2E test.

## CI
- Run lint, check-copy, unit and E2E tests.
- Deploy job (on `main` only, after tests): GitHub Pages (`actions/deploy-pages`) or Netlify (with a secret). Leave it commented out until the owner chooses.
