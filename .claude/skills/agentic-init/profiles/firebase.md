# Profile: firebase (React + Vite + Firebase)

## STACK_TABLE
| Layer | Technology |
|---|---|
| Runtime | Node.js 22 or later |
| Frontend | React, Vite, React Router; ES modules |
| Styling | Tailwind CSS with logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`), values from `src/styles/tokens.css` |
| Auth | Firebase Authentication (magic link or Google; no passwords stored by the app) |
| Data | Cloud Firestore; access enforced by `firestore.rules` |
| Files | Cloud Storage; access by `storage.rules` or signed URLs from a function |
| Server | Cloud Functions v2 (Node), in `functions/` |
| Abuse protection | App Check (reCAPTCHA Enterprise) on Firestore and callables |
| Testing | Vitest (unit), `@firebase/rules-unit-testing` on the Emulator Suite (rules), functions tests on the emulator (integration), Playwright (E2E) |
| Hosting | Firebase Hosting, deployed by CI |

## COMMANDS
Config comes from `.env` (copy `.env.example`). Local work runs against the Firebase Emulator Suite (needs Java 21+ and `firebase-tools`).
- App (root): `npm run dev` (Vite, port 5173, talks to the emulators when `VITE_USE_EMULATORS=true`).
- Emulators (root): `npm run emulators`.
- Unit (root): `npm test` (Vitest).
- Rules (root): `npm run test:rules` (starts the Firestore and Storage emulators and runs `tests/rules`).
- Functions (in `functions/`): `npm test` (runs against the emulators).
- E2E (root): `npm run test:e2e` (Playwright; its `webServer` starts the emulators and Vite; stop anything already on ports 5173, 8080, 9099, 5001 first).
- Lint (root and `functions/`): `npm run lint`.
- Deploy: CI only, on a green push to `main`. Never `firebase deploy` from a local build.

## CONVENTIONS
### Data
- Collections are camelCase plural; document ids are generated ids unless a natural key is required.
- Every collection has explicit rules. Default deny.
- Writes that must be atomic use a transaction or a batched write.
- Server-only fields (roles, status changes that need checks, counters) are written only by functions with the Admin SDK, and the rules block client writes to them.
### Functions
- Callables check `context.auth`, the caller's role, and App Check (`enforceAppCheck: true`).
- Validate every input on the server. Return typed errors (`HttpsError`) with a safe message; log details server-side with `logger`, never personal data.
- Region and runtime options in one shared config file.
### Client
- One `src/services/*.js` file per data area; components never call Firestore directly.
- Pages in `src/pages/`, shared UI in `src/components/`, one PascalCase component per file.
- All user-facing text in `src/i18n/<lang>.json` (the primary language's code, for example `en.json`), read through one `t()` helper.
- No hardcoded colors or sizes; values live in `src/styles/tokens.css`.

## SECURITY_RULES
- `firestore.rules` and `storage.rules` are the security boundary. Client checks are UX only.
- A user can never write their own role or any server-only field; rules tests prove it.
- The Admin SDK and service-account credentials exist only in `functions/` and CI secrets, never in the client bundle or the repo.
- Every rules change ships with adversarial rules tests (a user who must be denied is denied).

## TEST_RULES
- Unit tests: Vitest, next to the code as `*.test.js`, or in `tests/unit/`.
- Rules tests: `tests/rules/`, run on the emulator, one test file per collection touched.
- Functions tests: `functions/test/`, run on the emulator.
- E2E: Playwright in `e2e/`, projects `desktop` and `mobile`, against the emulators with seeded invented data.

## Multi-tenant
- Data lives under `tenants/{tenantId}/...`. A user's tenant comes from the server (a custom claim or a users doc written by a function), never from the URL alone.
- Rules check that `request.auth` belongs to the tenant in the path, for every read and write.
- Functions resolve the tenant on the server and ignore a tenant id sent by a regular user.
- Adversarial tests: a user of tenant A is denied every read and write in tenant B.

## Multi-language
All user-facing text is keyed in `src/i18n/<lang>.json` and read through `t()` (react-i18next). The root sets `lang` and `dir` from the active language. A new string is added to every language file in the same commit.

## Baseline
- Scaffold (new project only): `npm create vite@latest . -- --template react`, then `npm i firebase react-router-dom`, `npm i -D vitest @playwright/test @firebase/rules-unit-testing firebase-tools eslint eslint-config-prettier prettier`, and `firebase init` for Firestore, Functions, Storage, Hosting and Emulators (ask the owner for the Firebase project id; use a placeholder until then).
- `firestore.rules` and `storage.rules` start as deny-all.
- Smoke tests: one Vitest unit test, one rules test (an unauthenticated read is denied), one E2E test.

## CI
- Add `actions/setup-java` (Java 21) before tests so the emulators can run.
- Run lint, check-copy, unit, rules, functions and E2E tests.
- Deploy job (on `main` only, after tests): `firebase deploy` using a service-account secret. Leave it commented out until the owner adds the secret.
