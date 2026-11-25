# Profile: firebase-postgres (React + Vite + Firebase Hosting + Identity Platform + Cloud SQL Postgres)

For B2B and multi-tenant apps that need relational data with Row Level Security and enterprise sign-in (SAML or OIDC per customer, for example Microsoft Entra), while staying on Google Cloud and Firebase Hosting. The client never talks to the database: every read and write goes through the API.

## Extra questions
Ask these together with the main interview when this profile is chosen:
1. Sign-in methods: email link, Microsoft, Google, enterprise SSO (SAML or OIDC per tenant)? Which from day one?
2. Is a tenant also an identity tenant (one Identity Platform tenant per customer company)? Default: yes when the app is multi-tenant.
3. Will tenant users be synced from an external directory (for example Microsoft Graph), imported from a file, or managed in the app?
4. Google Cloud region. Default: `europe-west1` for everything (functions, Cloud SQL, secrets).

## STACK_TABLE
| Layer | Technology |
|---|---|
| Runtime | Node.js 22 or later |
| Frontend | React, Vite, React Router; ES modules |
| Styling | Tailwind CSS with logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`), values from `src/styles/tokens.css` |
| Auth | Google Cloud Identity Platform through the Firebase Auth SDK: email link, Microsoft or Google, and SAML or OIDC per tenant. No passwords stored by the app |
| API | Cloud Functions v2 (Node) in `functions/`: one Express app exported as `api`, served at `/api/**` through a Hosting rewrite |
| Data | Cloud SQL for PostgreSQL 16; reached only by the API; tenant isolation enforced by Row Level Security |
| Schema | Plain SQL migrations in `db/migrations/`, run by dbmate |
| DB access | `pg` with parameterized queries; `@google-cloud/cloud-sql-connector` in production, plain TCP to local Docker Postgres in development and tests |
| Secrets | Secret Manager, read by functions through `defineSecret` |
| Files | Cloud Storage through short-lived signed URLs from the API; the client has no direct Storage access |
| Testing | Vitest (unit), Vitest on local Docker Postgres (database and RLS), Vitest + supertest on the API with Auth emulator tokens (integration), Playwright (E2E) |
| Hosting | Firebase Hosting, deployed by CI with Workload Identity Federation (no service-account keys) |

## COMMANDS
Config comes from `.env`. First time on a machine: `cp .env.example .env`, then `npm run db:up`. Local work needs Docker (Postgres), Java 21+ and `firebase-tools` (Auth, Functions and Hosting emulators). On macOS, if `docker` is not found after installing Docker Desktop, add `$HOME/.docker/bin` to `PATH` in `~/.zshrc`.
- Database (root): `npm run db:up` and `npm run db:down` (Docker Compose, Postgres 16 on port 5432).
- Migrations (root): `npm run db:new -- <name>` creates a file; `npm run db:migrate` applies pending ones; `npm run db:reset` drops, recreates, migrates and loads `db/seed.sql`. Local database only.
- Emulators (root): `npm run emulators` (Auth, Functions, Hosting), always with `--project demo-<project-name>`; `.firebaserc` is the deploy target only. Secrets the function declares come from `functions/.secret.local` (git-ignored, local invented values, for example `DB_PASSWORD=`); without it the emulator tries the real Secret Manager and fails.
- App (root): `npm run dev` (Vite, port 5173; uses the emulators when `VITE_USE_EMULATORS=true`).
- Unit (root): `npm test` (Vitest). The root Vitest config excludes `tests/db/`, `functions/` and `e2e/`, so each level runs only through its own command.
- Database and RLS (root): `npm run test:db` (Vitest against the local Postgres, connected as the runtime role).
- API (root): `npm run test:api`, which runs `firebase emulators:exec --only auth --project demo-<project-name> "npm --prefix functions test"` (Vitest + supertest against the local Postgres and the Auth emulator).
- E2E (root): `npm run test:e2e` (Playwright; its `webServer` starts the emulators and Vite; run `npm run db:up` first and stop anything already on ports 5173, 5001, 9099, 5432).
- Lint (root and `functions/`): `npm run lint`.
- Deploy: CI only, on a green push to `main`. Migrations against Cloud SQL run only in the CI deploy job. Never run migrations, `psql`, the Cloud SQL Auth Proxy or `firebase deploy` against the cloud from a local machine.

## CONVENTIONS
### Database
- Tables are snake_case plural, columns snake_case, ids `uuid` default `gen_random_uuid()`, every table has `created_at` and `updated_at` (`timestamptz`).
- Every schema change is a new dbmate file with `-- migrate:up` and `-- migrate:down` sections. Never edit an applied migration and never change the schema by hand.
- In the same migration that creates a table: `enable row level security`, `force row level security`, explicit policies per operation, and the `grant`s the runtime role needs. Nothing else is granted.
- Two database roles. `app_owner` owns the schema and runs migrations. `app_runtime` is what the API connects as: it owns no table, has no `BYPASSRLS`, and is never `postgres` or a member of `cloudsqlsuperuser`.
- Emails and user principal names are stored and compared in lower case.
- Multi-step writes run in one transaction.
### API
- One Express app exported as `api` (`onRequest`, region and runtime options in `functions/src/config.js`). Routes in `functions/src/routes/`, one file per area.
- Every route except `/api/health` goes through the auth middleware. `/api/health` carries a comment that it is public on purpose and returns no data.
- The auth middleware, in this order, with these statuses:
  1. No token, or the Admin SDK rejects it: 401.
  2. The token has no `firebase.tenant`: 403.
  3. The tenant is unknown or not active: 403.
  4. Once a users table exists: the user, role and status are loaded from the database on every request, so a disabled user is blocked at once. Unknown or disabled user: 403.
  5. A database error in any of these steps: 500 with a generic message, logged without the token or personal data. Never turned into a 401.
  <!-- Why: a catch-all that answers 401 hides a database outage as "signed out" and leaves nothing in the logs. -->
- Request size: a `requireBodyLimit(maxBytes)` middleware that checks `Buffer.byteLength(req.rawBody)`, falling back to the `Content-Length` header when `rawBody` is missing (supertest), and answers 413. Mount it app-wide at 100 KB; a route that needs more (an upload) is mounted before it with its own limit. `express.json()` stays, with a permissive limit (1 MB), so it never rejects first.
  <!-- Why: in Cloud Functions the framework parses the body before Express runs, so `express.json({ limit })` never fires in production. Only `rawBody` is reliable. -->
- File uploads: JSON `{ data: "<base64>" }`, not multipart. The server decodes, checks the magic bytes (never the client's type or file name) and the decoded size, then writes to Cloud Storage. Under the Functions emulator (`FUNCTIONS_EMULATOR === 'true'`) it returns a stub URL and skips Storage. The bucket name comes from `functions/.env.<project-id>`. Reads go through a signed URL generated per request (one hour), never stored in the database.
  <!-- Why: multer and busboy fail in Cloud Functions ("Unexpected end of form") because the body was already read. Base64 costs a third more bytes and works everywhere. -->
- Async middleware calls `next()` outside its promise chain (or passes errors with `next(err)`), so an error thrown later in the request is not reported as an auth failure.
- Tenant data is reached only through `withTenant(tenantId, async (client) => ...)`. It opens a transaction, runs `select set_config('app.tenant_id', $1, true)` (transaction-scoped, safe with pooling), runs the callback and commits. Route code never calls `pool.query` on tenant tables directly.
- Validate every input with zod on the server. Parameterized queries only, never string-built SQL.
- Return safe error messages with the right status; log details with `logger`, never personal data.
- Small connection pool per instance (`max` 5). The database password comes from Secret Manager (`defineSecret('DB_PASSWORD')`, declared in the function's `secrets`), never from code or committed config.
- `functions/src/db.js` picks the connection, failing closed:
  1. `CLOUD_SQL_INSTANCE` set: the Cloud SQL connector (`@google-cloud/cloud-sql-connector`, public IP, password auth), user and database from `DB_USER` and `DB_NAME`, password from `DB_PASSWORD` at request time, not at module load. If `DB_USER` or `DB_NAME` is missing, throw an error that names it.
  2. Otherwise `DATABASE_URL_RUNTIME` set: a plain `pg` Pool (local Docker and CI).
  3. Neither: throw a clear error.
  `getPool()` is async and memoizes one promise, so concurrent requests share one pool; on failure the promise is reset so the next request retries.
- The function runs as its own service account (`app-api@<project-id>.iam.gserviceaccount.com`), set in `onRequest` options, never as the default compute account.
- Non-secret cloud settings (`CLOUD_SQL_INSTANCE`, `DB_USER`, `DB_NAME`) live in `functions/.env.<project-id>`, which is committed (with a `!functions/.env.<project-id>` exception in `.gitignore`). Never create `functions/.env`: `firebase deploy` uploads it to every project.
### Client
- One `src/services/*.js` file per data area, built on one `apiFetch` helper that adds the current ID token. Components never call `fetch` directly.
- The client has no database credentials and does not use Firestore or Storage directly.
- `authDomain` in the Firebase config is the domain the app is served from (`<project-id>.web.app`, later the custom domain), never `<project-id>.firebaseapp.com`. Firebase Hosting serves the sign-in handler on every domain it hosts.
  <!-- Why: Safari on iPhone partitions storage between domains, so a Google popup on firebaseapp.com fails with "missing initial state" while desktop works. -->
- A button that is unavailable while a request runs is `disabled` and keeps its accessible name (the spinner is `aria-hidden`); a second click never sends a second request.
- Pages in `src/pages/`, shared UI in `src/components/`, one PascalCase component per file.
- All user-facing text in `src/i18n/<lang>.json` (the primary language's code, for example `en.json`), read through one `t()` helper.
- No hardcoded colors or sizes; values live in `src/styles/tokens.css`.

## SECURITY_RULES
- Two layers, both required: the API checks authentication and role on every route, and RLS enforces the tenant boundary in the database even if a route forgets a filter. Client checks are UX only.
- The tenant comes from the verified token (`decoded.firebase.tenant`, signed by Identity Platform), mapped to the internal tenant on the server. Never from the body, the URL, a header or local storage.
- A valid sign-in alone grants nothing: the user must exist and be active in that tenant's user table. Enterprise SSO users are matched by the identity provider's stable id (for Microsoft Entra, the object id), with the lower-cased principal name as fallback.
- A test asserts that every table in `public` has RLS enabled and forced, and that `app_runtime` owns none of them.
- `security definer` functions are avoided; any that exist set `search_path` explicitly and check the caller themselves.
- Firestore and Storage security rules stay deny-all.
- No service-account keys anywhere: CI deploys with Workload Identity Federation, functions run as their own service account, and the database password lives only in Secret Manager.
- Every policy or route-permission change ships with adversarial tests (the wrong role and the wrong tenant are denied).

## TEST_RULES
- Unit tests: Vitest, next to the code as `*.test.js`, or in `tests/unit/`.
- Database tests: `tests/db/`, Vitest against the local Postgres, connected as `app_runtime`. One file per table or policy touched, always including a cross-tenant denial case.
- API tests: `functions/test/`, Vitest + supertest on the Express app, with real ID tokens from the Auth emulator and the local Postgres, so RLS runs for real. Mock the database or the Admin SDK only for a path that cannot be produced otherwise (for example a database outage), and say so in the test name.
  <!-- Why: an API test against a mocked database proves the code, not the policy. The tenant boundary lives in the policy. -->
- Every route has at least one allowed test (the right role in the right tenant gets 200) next to its denied tests. A route that only has denied tests would pass even if it always refused.
- A middleware that every route of a kind must use (the auth middleware on every route but `/api/health`; `checkViewOnly` on every tenant write) has a guard test in `functions/test/` that walks the Express router stack, including mounted routers, and fails naming the first route without it. The test proves it can fail with a throwaway app built inside the test, and fails loudly on a route path it cannot resolve.
  <!-- Why: "remember to mount it" is forgotten on the third feature. A guard test turns the rule into a red CI run. -->
- E2E: Playwright in `e2e/`, projects `desktop` and `mobile`, against the emulators and the local Postgres with seeded invented data (`db/seed.sql`). SAML and OIDC cannot be emulated: E2E signs in Auth emulator users inside the right tenant, and enterprise SSO is checked by hand against a test identity provider before release.
- E2E sign-in happens once per run: a `setup` project signs in and saves `storageState({ path: 'e2e/.auth/<role>.json', indexedDB: true })` (Firebase Auth keeps its session in IndexedDB); the other projects depend on it and load that state. Tests of the sign-in flow itself opt out with `test.use({ storageState: { cookies: [], origins: [] } })`. `e2e/.auth/` is git-ignored. Workers are capped at 2, since all tests share one emulator. Never raise timeouts to hide contention.
  <!-- Why: signing in through the emulator popup in every beforeEach made 1 to 5 tests time out per run, different ones each time. -->
- When a screen renders both a desktop table and mobile cards and CSS hides one, locators are scoped to the visible container (`testInfo.project.name` picks it). A check that something is hidden must look in the container that would show it; otherwise it passes even when the feature is broken.

## Multi-tenant
- Identity Platform multi-tenancy: one identity tenant per customer. The `tenants` table maps `idp_tenant_id` to the internal `id`. The client sets `auth.tenantId` before sign-in, resolved from the tenant's sign-in URL.
- Every tenant-owned table has `tenant_id uuid not null references tenants(id)` with an index, and policies `using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)` with the same `with check`. With no tenant set, the setting is null or an empty string, `nullif` turns both into null, and no rows match (fail closed).
  <!-- Why: on a pooled connection a transaction-scoped setting reverts to '' (not null) after its first use, and ''::uuid throws instead of matching nothing. -->
- The `tenants` table has `active boolean not null default true`. `app_runtime` may only `select`, and a policy limits it to active tenants. Only `app_owner` (migrations) and platform-admin routes change tenants.
- Platform-level tables (the tenants list, platform admins) have no `tenant_id`, are reached only by platform-admin routes, and give no path into tenant data unless a spec says so.
- Platform admins (the app owner's staff who create and configure tenants), when a spec needs them:
  - Their own sign-in at project level (no tenant), their own middleware (`requirePlatformAuth`) and their own router under `/api/platform`, never mounted through the tenant auth middleware. Checks in order: valid token (else 401); no `firebase.tenant`, `email_verified` true, sign-in provider in an allowlist, lower-cased email in `platform_admins` (else 403); database error 500.
  - `withPlatform(fn)`, a sibling of `withTenant`, sets `app.context = 'platform'` (transaction-scoped) and never sets `app.tenant_id`. Policies that let `app_runtime` insert or update `tenants`, or read `platform_admins`, require that context.
  - `platform_admins` has no write grant for `app_runtime`: the first admin is added by hand in Cloud SQL Studio after the first deploy (`docs/deploy-setup.md`), never through the API.
  - Creating a tenant also creates its Identity Platform tenant, in this order: duplicate check, create the identity tenant (sign-in methods off until configured), then insert the row and its audit entry in one transaction. If the insert fails, delete the identity tenant; if that fails too, log its id as an orphan.
  - Tenants are never deleted through the API. A `status` (`active`, `view_only`, `inactive`) replaces deletion. A `checkViewOnly` middleware goes on every tenant write route, enforced by a guard test (see TEST_RULES).
  - An `audit_log` table (who, action, target, before and after) written in the same transaction as the change; `app_runtime` gets `insert` and `select` only.
- Adversarial tests: a user of tenant A gets zero rows from tenant B and cannot insert, update or delete there; a query with no tenant set returns zero rows; a token from tenant A cannot be used on a tenant B route; `app_runtime` cannot see an inactive tenant, and its token gets 403.

## Multi-language
All user-facing text is keyed in `src/i18n/<lang>.json` and read through `t()` (react-i18next). The root sets `lang` and `dir` from the active language. A new string is added to every language file in the same commit.

## Baseline
- Scaffold (new project only): `npm create vite@latest <temp-folder> -- --template react` (outside the repo, then merged in; see the init steps), then `npm i firebase react-router-dom`, `npm i -D vitest @playwright/test firebase-tools dbmate pg eslint eslint-config-prettier prettier` (`firebase-tools` pinned in the root `devDependencies`; scripts and CI run it as `npx firebase-tools`, never `npx firebase`, which resolves to the client SDK and has no executable), and `firebase init` for Functions, Hosting and Emulators (Auth, Functions, Hosting). Do not enable Firestore. Ask the owner for the Firebase project id; until then use `demo-<project-name>`.
- In `functions/`: `npm i express pg zod firebase-admin firebase-functions @google-cloud/cloud-sql-connector` and `npm i -D vitest supertest`. `functions/package.json` has `"main"` pointing at the real entry file (for example `src/index.js`); Firebase does not find it otherwise, and Vitest never notices.
- `db/cloud/roles.sql` from `profiles/firebase-postgres-roles.sql`, and `docs/deploy-setup.md` from `profiles/firebase-postgres-deploy.md` with the project id, project number, region, GitHub repository and developer email filled in (placeholders where still unknown).
- `functions/.env.<project-id>` once the real project id is known (until then nothing: emulators run on the `demo-` id and do not load it).
- `docker-compose.yml` with `postgres:16`, and `db/init/01-roles.sql` that creates `app_owner` and `app_runtime` with local, invented passwords (development only; the same file runs in CI). The database name and both local connection URLs go in `.env.example`.
- dbmate settings in `package.json` scripts: migrations in `db/migrations`, `--no-dump-schema`, `DATABASE_URL` connecting as `app_owner`.
- First migration (created with `npm run db:new -- init`): a platform `tenants` table (with `active`) and one tenant-owned table (for example `tenant_settings`), both with RLS enabled and forced, policies and grants to `app_runtime` as in the Multi-tenant rules.
- `firestore.rules` and `storage.rules` that deny all reads and writes, linked from `firebase.json`. They stay deny-all even though the app does not use Firestore or Storage from the client.
- The auth middleware as described in Conventions. There is no users table yet, so it stops after the tenant check. Write both of these in a "Known gaps" section of `docs/architecture.md`: the user lookup arrives with the first users feature; and tokens are not checked for revocation (`verifyIdToken(token, true)`), which is acceptable once the per-request user status check exists.
- `firebase.json`: Hosting rewrite `/api/**` to the `api` function in the chosen region, then the single-page fallback `**` to `/index.html`.
- `vite.config.js` proxies `/api` to the Functions emulator (`http://127.0.0.1:5001/demo-<project-name>/<region>/api`), so the dev server and E2E reach the API at the same path as production.
- `playwright.config.js` loads `.env` and stops with a clear message if `DATABASE_URL_RUNTIME` or `functions/.secret.local` is missing. Its `webServer` list starts the emulators (`--project demo-<project-name>`) and Vite; `PLAYWRIGHT_SKIP_EMULATORS=1` skips the emulators when they already run. Projects: `setup` (signs in once, see TEST_RULES), then `desktop` and `mobile`, which depend on it.
- Smoke tests:
  - Unit: one Vitest test.
  - Database: RLS enabled and forced on every `public` table, and `app_runtime` owns none; cross-tenant select, insert, update and delete are denied; no tenant set returns zero rows; an inactive tenant is invisible to `app_runtime`.
  - API: `GET /api/health` returns 200; `GET /api/me` returns 401 without a token, 403 for a token with no tenant, 403 for an unknown or inactive tenant, 200 for an active tenant, and 500 (not 401) when the database fails.
  - E2E: one test.
  - Functions load: `npx firebase-tools emulators:exec --only functions --project demo-<project-name> "curl -sf <emulator-url>/api/health"` returns 200. It proves Firebase can load the function, which Vitest never checks.

## Owner setup
The Google Cloud and GitHub steps `/agentic-init` cannot do are in `docs/deploy-setup.md` (copied from `profiles/firebase-postgres-deploy.md`). In the final report, point the owner to it and list its steps as a checklist. Every step in it was needed on a real first deploy, including the temporary roles and the organization-policy cases, so do not shorten it.

## CI
- Add a `postgres:16` service container, run `db/init/01-roles.sql` with `psql`, then `npm run db:migrate`, then load `db/seed.sql` exactly as `npm run db:reset` does locally (same role, `app_owner`, never the `postgres` superuser, so RLS still applies).
  <!-- Why: without the seed, E2E signs in a user the database does not know; the API answers 403 and the test times out with no clue. -->
- After each E2E step, `actions/upload-artifact` with `if: failure()` for `test-results/` and `playwright-report/`, 7-day retention, so a CI-only failure comes with the page state.
- Add `actions/setup-java` (Java 21) before tests so the emulators can run.
- Run lint, check-copy, unit (`npm test`), database (`npm run test:db`), API (`npm run test:api`) and E2E tests, each as its own step.
- A functions-load step in the main job: the emulator smoke test from Baseline.
- GitHub Variables, the same names everywhere (`docs/deploy-setup.md`, `ci.yml`, `.env.example`): `FIREBASE_PROJECT_ID`, `GCP_REGION`, `CLOUD_SQL_INSTANCE`, `WIF_PROVIDER`, `DEPLOY_SERVICE_ACCOUNT`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`. No GitHub Secrets are needed. In `.env.example` they appear only as a comment, never as `NAME=`: an empty line there would override the local values above it.
- Deploy job (push to `main` only, `needs` every test job, `concurrency` without cancel-in-progress, permissions `contents: read` and `id-token: write`):
  1. `google-github-actions/auth` with `vars.WIF_PROVIDER` and `vars.DEPLOY_SERVICE_ACCOUNT`. No keys.
  2. The Cloud SQL Auth Proxy at a pinned version on `127.0.0.1:5432`.
  3. Migrations: read `DB_OWNER_PASSWORD` with `gcloud secrets versions access`, `echo "::add-mask::..."` before any use, and run `dbmate up` as `app_owner` with `sslmode=disable` (the proxy encrypts). The password stays inside that step.
  4. Build with `VITE_USE_EMULATORS=false` and the `vars.VITE_*`.
  5. `npx firebase-tools deploy --only hosting,functions --project ${{ vars.FIREBASE_PROJECT_ID }} --non-interactive`.
  6. Health check that fails the job on anything but 200: `curl -fsS --retry 5 --retry-delay 10 https://<project-id>.web.app/api/health`. A check that passes on 403 hides a function nobody can call.
- Preview job (pull requests from the same repository only, permissions `contents: read`, `id-token: write`, `pull-requests: write`): same auth and build, `npx firebase-tools hosting:channel:deploy pr-<number> --expires 7d --json`, read the channel URL from the JSON, and post or update one PR comment with it (for example `gh pr comment --edit-last` falling back to a new comment, with `GH_TOKEN: ${{ github.token }}`). Hosting only: no functions, no migrations. The preview's `/api` calls reach the live function.
- Leave both jobs commented out until `docs/deploy-setup.md` is done. The pull request that enables them runs the preview first; merging it is the first deploy.
