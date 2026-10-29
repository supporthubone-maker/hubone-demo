-- Run once (safe to rerun) in the EXISTING Staffing Supabase project.
-- Adds rule storage only. Does not alter accounts, keys, sessions or Google Sheets.
begin;
create table if not exists public.staffing_rule_libraries (
 scope text primary key,
 revision integer not null check (revision > 0),
 version text not null check (length(version)=64),
 tables jsonb not null check (jsonb_typeof(tables)='object'),
 updated_at timestamptz not null default now(),
 updated_by text not null
);
create table if not exists public.staffing_rule_versions (
 scope text not null,
 revision integer not null check (revision > 0),
 version text not null check (length(version)=64),
 tables jsonb not null check (jsonb_typeof(tables)='object'),
 updated_at timestamptz not null default now(),
 updated_by text not null,
 primary key(scope,revision)
);
alter table public.staffing_rule_libraries enable row level security;
alter table public.staffing_rule_versions enable row level security;
revoke all on public.staffing_rule_libraries,public.staffing_rule_versions from public,anon,authenticated;
revoke all on public.staffing_rule_libraries,public.staffing_rule_versions from service_role;
grant select,insert,update on public.staffing_rule_libraries to service_role;
grant select,insert on public.staffing_rule_versions to service_role;
create or replace function public.staffing_save_rule_library(p_scope text,p_expected_revision integer,p_version text,p_tables jsonb,p_actor text)
returns jsonb language plpgsql security invoker set search_path=public,pg_catalog as $$
declare current_revision integer; next_revision integer; saved_at timestamptz:=now();
begin
 if p_scope is null or p_expected_revision is null or p_version is null or p_tables is null or p_actor is null
    or p_scope!~'^[a-f0-9]{32}$' or p_expected_revision<0 or p_version!~'^[a-f0-9]{64}$'
    or jsonb_typeof(p_tables)<>'object' or octet_length(p_tables::text)>1500000 or length(p_actor)>120 then
  raise exception 'Invalid rule library input';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_scope,0));
 select revision into current_revision from public.staffing_rule_libraries where scope=p_scope;
 current_revision:=coalesce(current_revision,0);
 if current_revision<>p_expected_revision then
  return jsonb_build_object('ok',false,'conflict',true,'currentRevision',current_revision);
 end if;
 next_revision:=current_revision+1;
 insert into public.staffing_rule_versions(scope,revision,version,tables,updated_at,updated_by)
 values(p_scope,next_revision,p_version,p_tables,saved_at,p_actor);
 insert into public.staffing_rule_libraries(scope,revision,version,tables,updated_at,updated_by)
 values(p_scope,next_revision,p_version,p_tables,saved_at,p_actor)
 on conflict(scope) do update set revision=excluded.revision,version=excluded.version,tables=excluded.tables,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
 return jsonb_build_object('ok',true,'revision',next_revision,'version',p_version,'updatedAt',saved_at);
end; $$;
revoke all on function public.staffing_save_rule_library(text,integer,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.staffing_save_rule_library(text,integer,text,jsonb,text) to service_role;
commit;
notify pgrst, 'reload schema';
