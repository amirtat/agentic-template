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
Config comes from `.env` (copy `.env.example`). Local work needs Docker (Postgres), Java 21+ and `firebase-tools` (Auth, Functions and Hosting emulators).
- Database (root): `npm run db:up` and `npm run db:down` (Docker Compose, Postgres 16 on port 5432).
- Migrations (root): `npm run db:new -- <name>` creates a file; `npm run db:migrate` applies pending ones; `npm run db:reset` drops, recreates, migrates and loads `db/seed.sql`. Local database only.
- Emulators (root): `npm run emulators` (Auth, Functions, Hosting).
- App (root): `npm run dev` (Vite, port 5173; uses the emulators when `VITE_USE_EMULATORS=true`).
- Unit (root): `npm test` (Vitest).
- Database and RLS (root): `npm run test:db` (Vitest against the local Postgres, connected as the runtime role).
- API (in `functions/`): `npm test` (Vitest + supertest against the local Postgres and the Auth emulator).
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
- Every route except `/api/health` goes through the auth middleware: it verifies the Identity Platform ID token with the Admin SDK, then loads the user, role and status from the database on every request, so a disabled user is blocked at once.
- Tenant data is reached only through `withTenant(tenantId, async (client) => ...)`. It opens a transaction, runs `select set_config('app.tenant_id', $1, true)` (transaction-scoped, safe with pooling), runs the callback and commits. Route code never calls `pool.query` on tenant tables directly.
- Validate every input with zod on the server. Parameterized queries only, never string-built SQL.
- Return safe error messages with the right status; log details with `logger`, never personal data.
- Small connection pool per instance (`max` 5). The database password comes from Secret Manager (`defineSecret('DB_PASSWORD')`), never from code or committed config.
### Client
- One `src/services/*.js` file per data area, built on one `apiFetch` helper that adds the current ID token. Components never call `fetch` directly.
- The client has no database credentials and does not use Firestore or Storage directly.
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
- API tests: `functions/test/`, Vitest + supertest on the Express app, with tokens from the Auth emulator and the local Postgres.
- E2E: Playwright in `e2e/`, projects `desktop` and `mobile`, against the emulators and the local Postgres with seeded invented data (`db/seed.sql`). SAML and OIDC cannot be emulated: E2E signs in Auth emulator users inside the right tenant, and enterprise SSO is checked by hand against a test identity provider before release.

## Multi-tenant
- Identity Platform multi-tenancy: one identity tenant per customer. The `tenants` table maps `idp_tenant_id` to the internal `id`. The client sets `auth.tenantId` before sign-in, resolved from the tenant's sign-in URL.
- Every tenant-owned table has `tenant_id uuid not null references tenants(id)` with an index, and policies `using (tenant_id = current_setting('app.tenant_id', true)::uuid)` with the same `with check`. With no tenant set, the setting is null and no rows match (fail closed).
- Platform-level tables (the tenants list, platform admins) have no `tenant_id`, are reached only by platform-admin routes, and give no path into tenant data unless a spec says so.
- Adversarial tests: a user of tenant A gets zero rows from tenant B and cannot insert, update or delete there; a query with no tenant set returns zero rows; a token from tenant A cannot be used on a tenant B route.

## Multi-language
All user-facing text is keyed in `src/i18n/<lang>.json` and read through `t()` (react-i18next). The root sets `lang` and `dir` from the active language. A new string is added to every language file in the same commit.

## Baseline
- Scaffold (new project only): `npm create vite@latest . -- --template react`, then `npm i firebase react-router-dom`, `npm i -D vitest @playwright/test firebase-tools dbmate pg eslint eslint-config-prettier prettier`, and `firebase init` for Functions, Hosting and Emulators (Auth, Functions, Hosting). Do not enable Firestore. Ask the owner for the Firebase project id; use a placeholder until then.
- In `functions/`: `npm i express pg zod firebase-admin firebase-functions @google-cloud/cloud-sql-connector` and `npm i -D vitest supertest`.
- `docker-compose.yml` with `postgres:16`, and `db/init/01-roles.sql` that creates `app_owner` and `app_runtime` with local, invented passwords (development only; the same file runs in CI). The database name and both local connection URLs go in `.env.example`.
- dbmate settings in `package.json` scripts: migrations in `db/migrations`, `--no-dump-schema`, `DATABASE_URL` connecting as `app_owner`.
- First migration: a platform `tenants` table and one tenant-owned table (for example `tenant_settings`), both with RLS enabled and forced, policies and grants to `app_runtime`.
- `firebase.json`: Hosting rewrite `/api/**` to the `api` function in the chosen region, then the single-page fallback `**` to `/index.html`.
- Smoke tests: one Vitest unit test; one database test (RLS enabled and forced on every `public` table, and a cross-tenant read returns zero rows); one API test (`GET /api/health` returns 200, `GET /api/me` without a token returns 401); one E2E test.

## Owner setup
One-time steps in Google Cloud that `/agentic-init` cannot do. List them in the final report as a checklist for the owner:
1. Upgrade the Firebase project to Identity Platform; enable multi-tenancy if the app is multi-tenant.
2. Create the Cloud SQL for PostgreSQL 16 instance in the chosen region, the database, and the `app_owner` and `app_runtime` roles with strong passwords.
3. Store both passwords in Secret Manager and give the functions' service account access to the runtime one only.
4. Set up Workload Identity Federation for this GitHub repository and a deploy service account. Put the provider and the service account email in GitHub repository variables (they are not secrets).
5. Set a budget alert on the billing account.

## CI
- Add a `postgres:16` service container, run `db/init/01-roles.sql` with `psql`, then `npm run db:migrate`.
- Add `actions/setup-java` (Java 21) before tests so the emulators can run.
- Run lint, check-copy, unit, database, API and E2E tests.
- Deploy job (on `main` only, after tests): authenticate with `google-github-actions/auth` using Workload Identity Federation; start the Cloud SQL Auth Proxy; run `dbmate up` as `app_owner` with the password read from Secret Manager; then `firebase deploy --only hosting,functions`. Leave the job commented out until the owner finishes the Owner setup.
