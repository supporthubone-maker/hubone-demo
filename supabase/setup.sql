-- HubOne Vercel v1. Run ONCE in the existing Supabase project's SQL Editor.
-- Re-runnable. Does not change auth.users or any business Google Sheets data.
begin;
create table if not exists public.hubone_sessions (
 token_hash text primary key,
 payload text not null,
 expires_at timestamptz not null,
 last_seen timestamptz not null default now()
);
create table if not exists public.hubone_limits (
 key text primary key,
 window_start timestamptz not null,
 count integer not null
);
create table if not exists public.hubone_locks (
 key text primary key,
 owner uuid not null,
 expires_at timestamptz not null
);
alter table public.hubone_sessions enable row level security;
alter table public.hubone_limits enable row level security;
alter table public.hubone_locks enable row level security;
revoke all on public.hubone_sessions, public.hubone_limits, public.hubone_locks from public, anon, authenticated;
grant all on public.hubone_sessions, public.hubone_limits, public.hubone_locks to service_role;

create or replace function public.hubone_rate_limit(p_key text,p_limit integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
 if p_limit < 1 or p_limit > 1000 or p_seconds < 1 or p_seconds > 3600 or length(p_key)>256 then raise exception 'Invalid limits'; end if;
 insert into public.hubone_limits as t(key,window_start,count) values(p_key,clock_timestamp(),1)
 on conflict(key) do update set
 count = case when t.window_start + make_interval(secs=>p_seconds) <= clock_timestamp() then 1 else t.count+1 end,
 window_start = case when t.window_start + make_interval(secs=>p_seconds) <= clock_timestamp() then clock_timestamp() else t.window_start end
 returning count into n;
 -- Opportunistic cleanup; fixed windows only, no passwords or raw IPs.
 if random()<0.01 then
  delete from public.hubone_limits where window_start < clock_timestamp()-interval '1 day';
  delete from public.hubone_sessions where expires_at < clock_timestamp();
 end if;
 return n <= p_limit;
end; $$;

create or replace function public.hubone_acquire_lock(p_key text,p_owner uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare acquired uuid;
begin
 insert into public.hubone_locks as t(key,owner,expires_at) values(p_key,p_owner,clock_timestamp()+interval '120 seconds')
 on conflict(key) do update set owner=excluded.owner, expires_at=excluded.expires_at
 where t.expires_at < clock_timestamp()
 returning owner into acquired;
 return acquired is not null and acquired=p_owner;
end; $$;

create or replace function public.hubone_release_lock(p_key text,p_owner uuid)
returns void language sql security invoker set search_path = '' as $$
 delete from public.hubone_locks where key=p_key and owner=p_owner;
$$;
revoke all on function public.hubone_rate_limit(text,integer,integer) from public, anon, authenticated;
revoke all on function public.hubone_acquire_lock(text,uuid) from public, anon, authenticated;
revoke all on function public.hubone_release_lock(text,uuid) from public, anon, authenticated;
grant execute on function public.hubone_rate_limit(text,integer,integer) to service_role;
grant execute on function public.hubone_acquire_lock(text,uuid) to service_role;
grant execute on function public.hubone_release_lock(text,uuid) to service_role;
commit;

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
