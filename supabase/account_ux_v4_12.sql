-- staffing v4.12. Run once in the EXISTING Supabase project, after access_keys_v4_3.sql.
-- Safe to rerun. Preserves existing keys, auth users, sessions and Google Sheets.
begin;
alter table public.hubone_access_keys add column if not exists key_ciphertext text;
comment on column public.hubone_access_keys.key_ciphertext is 'AES-256-GCM envelope, encrypted by app SESSION_ENCRYPTION_KEY; never plaintext. Legacy keys remain null.';
create table if not exists public.hubone_account_profiles (
 scope text not null,
 uid uuid not null,
 avatar text not null default '' check (length(avatar) <= 44000),
 updated_at timestamptz not null default now(),
 primary key(scope,uid)
);
alter table public.hubone_account_profiles enable row level security;
revoke all on public.hubone_account_profiles from public,anon,authenticated;
grant all on public.hubone_account_profiles to service_role;
-- Access key table remains server-only, including the encrypted envelope column.
revoke all on public.hubone_access_keys from public,anon,authenticated;
grant all on public.hubone_access_keys to service_role;
commit;
notify pgrst, 'reload schema';
