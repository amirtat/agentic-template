# Profile: supabase (React + Vite + Supabase)

## STACK_TABLE
| Layer | Technology |
|---|---|
| Runtime | Node.js 22 or later |
| Frontend | React, Vite, React Router; ES modules |
| Styling | Tailwind CSS with logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`), values from `src/styles/tokens.css` |
| Auth | Supabase Auth (magic link or OAuth) |
| Data | Postgres on Supabase; access enforced by Row Level Security policies |
| Schema | SQL migrations in `supabase/migrations/` (Supabase CLI) |
| Server | Edge Functions (Deno) in `supabase/functions/`, or SQL functions |
| Files | Supabase Storage with bucket policies |
| Testing | Vitest (unit), pgTAP through `supabase test db` (RLS and SQL), Playwright (E2E) |
| Hosting | Netlify or Vercel for the client, deployed by CI |

## COMMANDS
Config comes from `.env` (copy `.env.example`). Local work runs against a local Supabase stack (needs Docker and the Supabase CLI).
- Local stack (root): `npx supabase start` (prints the local URL and anon key) and `npx supabase stop`.
- App (root): `npm run dev` (Vite, port 5173).
- New migration (root): `npx supabase migration new <name>`, then `npx supabase db reset` to apply all migrations and the seed.
- Unit (root): `npm test` (Vitest).
- Database and RLS (root): `npx supabase test db` (pgTAP tests in `supabase/tests/`).
- E2E (root): `npm run test:e2e` (Playwright against the local stack; run `supabase start` first).
- Lint (root): `npm run lint`.
- Deploy: CI only, on a green push to `main` (migrations with `supabase db push`, then the client).

## CONVENTIONS
### Database
- Tables are snake_case plural, columns snake_case, ids `uuid` default `gen_random_uuid()`, with `created_at` and `updated_at`.
- Every schema change is a new migration file. Never edit an applied migration or change the schema in the dashboard.
- RLS is enabled on every table in the same migration that creates it, with explicit policies per operation.
- Multi-step writes go through a SQL function (one transaction), called with `rpc`.
### Edge Functions
- Verify the JWT, the caller's role, and validate every input. Return a safe error message with the right status; log details without personal data.
### Client
- One `src/services/*.js` file per data area, built on one shared Supabase client; components never call Supabase directly.
- Pages in `src/pages/`, shared UI in `src/components/`, one PascalCase component per file.
- All user-facing text in `src/i18n/<lang>.json` (the primary language's code, for example `en.json`), read through one `t()` helper.
- No hardcoded colors or sizes; values live in `src/styles/tokens.css`.

## SECURITY_RULES
- RLS policies are the security boundary. Client checks are UX only.
- The `service_role` key never appears in client code or in any `VITE_` variable. Only the anon key goes to the client.
- `security definer` functions set `search_path` explicitly and check the caller themselves.
- Every policy change ships with pgTAP tests that prove a user who must be denied is denied.

## TEST_RULES
- Unit tests: Vitest, next to the code as `*.test.js`, or in `tests/unit/`.
- Database tests: pgTAP in `supabase/tests/`, one file per table or function touched.
- E2E: Playwright in `e2e/`, projects `desktop` and `mobile`, against the local stack with seeded invented data (`supabase/seed.sql`).

## Multi-tenant
- Every tenant-owned table has `tenant_id uuid not null` with a foreign key and an index.
- Policies compare `tenant_id` with the tenant in the user's JWT claims (set by an auth hook or a server function), never with a value the client sends.
- pgTAP tests: a user of tenant A gets zero rows from tenant B and cannot insert, update or delete there.

## Multi-language
All user-facing text is keyed in `src/i18n/<lang>.json` and read through `t()` (react-i18next). The root sets `lang` and `dir` from the active language. A new string is added to every language file in the same commit.

## Baseline
- Scaffold (new project only): `npm create vite@latest <temp-folder> -- --template react` (outside the repo, then merged in; see the init steps), then `npm i @supabase/supabase-js react-router-dom`, `npm i -D vitest @playwright/test supabase eslint eslint-config-prettier prettier`, and `npx supabase init`.
- First migration: an empty `profiles` table linked to `auth.users`, with RLS enabled and a "user reads own row" policy.
- Smoke tests: one Vitest unit test, one pgTAP test (RLS is enabled on every public table), one E2E test.

## CI
- Add `supabase/setup-cli` and run `supabase start` before database and E2E tests.
- Run lint, check-copy, unit, `supabase test db` and E2E tests.
- Deploy job (on `main` only, after tests): `supabase db push` and the client deploy, using secrets. Leave it commented out until the owner adds them.
