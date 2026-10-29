-- HubOne v4.2: run ONCE in SQL Editor of the EXISTING Supabase project.
-- Safe to re-run. Keeps auth.users, old sessions and all Google Sheets unchanged.
begin;
create table if not exists public.hubone_access_keys (
 scope text not null,
 uid uuid not null,
 key_hash text not null unique check (key_hash ~ '^[a-f0-9]{64}$'),
 enabled boolean not null default true,
 revision bigint not null check (revision > 0),
 issued_at timestamptz not null default now(),
 issued_by uuid not null,
 primary key (scope, uid)
);
alter table public.hubone_access_keys enable row level security;
revoke all on public.hubone_access_keys from public, anon, authenticated;
grant all on public.hubone_access_keys to service_role;
commit;
