-- Cloud SQL role setup for app_owner and app_runtime.
-- Copied by /agentic-init to db/cloud/roles.sql.
--
-- When: once, after the Cloud SQL instance and database exist, before the first deploy.
-- How:  Cloud SQL Studio, connected to the app database as `postgres`. Paste the whole file and Run.
-- Then: set both passwords from Secret Manager (see docs/deploy-setup.md), and run the check
--       query at the end again. Both app roles must show in_cloudsqlsuperuser = false.
--
-- The roles are created here, in SQL, on purpose. A user created with `gcloud sql users create`
-- joins cloudsqlsuperuser, and on Postgres 16 `postgres` may not be allowed to take that back.
-- No passwords in this file: they live only in Secret Manager.
-- Safe to run again. Also runs on the local Postgres (where cloudsqlsuperuser does not exist).

-- 1. Create the roles if missing (LOGIN, no password yet).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_owner') then
    create role app_owner login;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime login;
  end if;
end $$;

-- 2. No extra powers. On Cloud SQL some ALTERs may be refused; the check query shows the result.
do $$
declare r text;
begin
  foreach r in array array['app_owner', 'app_runtime'] loop
    begin
      execute format('alter role %I nosuperuser nobypassrls nocreatedb nocreaterole login', r);
    exception when insufficient_privilege then
      raise notice 'could not alter role %: %', r, sqlerrm;
    end;
  end loop;
end $$;

-- 3. Never members of cloudsqlsuperuser (only if that role exists, that is on Cloud SQL).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'cloudsqlsuperuser') then
    begin
      revoke cloudsqlsuperuser from app_owner;
      revoke cloudsqlsuperuser from app_runtime;
    exception when insufficient_privilege then
      raise notice 'could not revoke cloudsqlsuperuser: %', sqlerrm;
    end;
  end if;
end $$;

-- 4. Close the default doors, then open only what each role needs.
--    The database name is taken from the current connection, so the same file works locally.
do $$
begin
  execute format('revoke all on database %I from public', current_database());
  execute format('grant connect on database %I to app_owner, app_runtime', current_database());
end $$;

revoke all on schema public from public;
grant usage, create on schema public to app_owner;
grant usage on schema public to app_runtime;
-- Table grants for app_runtime come from the migrations (written by app_owner, who owns the tables).

-- 5. Emergency access: lets the admin user act on tables app_owner owns.
--    RLS still applies to it (tables use FORCE ROW LEVEL SECURITY).
do $$
begin
  if not exists (
    select 1 from pg_auth_members m
    join pg_roles g on g.oid = m.roleid and g.rolname = 'app_owner'
    join pg_roles u on u.oid = m.member and u.rolname = current_user
  ) then
    execute format('grant app_owner to %I', current_user);
  end if;
exception when insufficient_privilege or invalid_grant_operation then
  raise notice 'could not grant app_owner to %: %', current_user, sqlerrm;
end $$;

-- 6. Check. Expected: app_owner and app_runtime all false except rolcanlogin = true.
select r.rolname,
       r.rolsuper,
       r.rolbypassrls,
       r.rolcreaterole,
       r.rolcreatedb,
       r.rolcanlogin,
       exists (
         select 1 from pg_auth_members m
         join pg_roles g on g.oid = m.roleid and g.rolname = 'cloudsqlsuperuser'
         where m.member = r.oid
       ) as in_cloudsqlsuperuser
from pg_roles r
where r.rolname in ('app_owner', 'app_runtime', current_user)
order by r.rolname;
