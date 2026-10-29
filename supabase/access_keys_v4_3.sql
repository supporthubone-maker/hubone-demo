-- HubOne v4.3: run in the EXISTING Supabase project before deploying source.
-- Works from v4.1 or v4.2; preserves existing accounts, keys and sessions.
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
alter table public.hubone_access_keys
 add column if not exists label text not null default '' check (char_length(label)<=120),
 add column if not exists key_mode text not null default 'auto' check (key_mode in ('auto','custom'));
create table if not exists public.hubone_access_key_history (
 scope text not null,
 key_hash text not null check (key_hash ~ '^[a-f0-9]{64}$'),
 uid uuid not null,
 reserved_at timestamptz not null default now(),
 primary key (scope,key_hash)
);
alter table public.hubone_access_keys enable row level security;
alter table public.hubone_access_key_history enable row level security;
revoke all on public.hubone_access_keys,public.hubone_access_key_history from public,anon,authenticated;
grant all on public.hubone_access_keys,public.hubone_access_key_history to service_role;
-- Reserve current v4.2 keys. Older digests no longer stored in v4.2 cannot be recovered.
insert into public.hubone_access_key_history(scope,key_hash,uid,reserved_at)
 select scope,key_hash,uid,issued_at from public.hubone_access_keys
 on conflict(scope,key_hash) do nothing;

-- A reservation and its live key update commit together. History prevents a
-- previously assigned credential being reassigned after rotation or revocation.
create or replace function public.hubone_reserve_access_key()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if TG_OP='INSERT' then
  insert into public.hubone_access_key_history(scope,key_hash,uid) values(NEW.scope,NEW.key_hash,NEW.uid);
 elsif NEW.key_hash is distinct from OLD.key_hash or NEW.scope is distinct from OLD.scope then
  insert into public.hubone_access_key_history(scope,key_hash,uid) values(NEW.scope,NEW.key_hash,NEW.uid);
 end if;
 return NEW;
end; $$;
drop trigger if exists hubone_reserve_access_key on public.hubone_access_keys;
create trigger hubone_reserve_access_key after insert or update of key_hash,scope
 on public.hubone_access_keys for each row execute function public.hubone_reserve_access_key();
revoke all on function public.hubone_reserve_access_key() from public,anon,authenticated;
grant execute on function public.hubone_reserve_access_key() to service_role;
commit;
