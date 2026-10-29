-- Run once in the existing Supabase project, after mapping_rules_v4_14.sql.
begin;
create table if not exists public.staffing_mapping_runs (
 scope text not null, id uuid not null, actor_uid uuid not null, actor_name text not null,
 payload_hash text not null, metadata jsonb not null, headers jsonb not null,
 chunk_count integer not null check(chunk_count between 1 and 1000),
 status text not null default 'uploading' check(status in ('uploading','accepted')),
 created_at timestamptz not null default now(), accepted_at timestamptz,
 primary key(scope,id)
);
create table if not exists public.staffing_mapping_chunks (
 scope text not null, run_id uuid not null, chunk_index integer not null,
 payload text not null check(octet_length(payload)<=1000000),
 primary key(scope,run_id,chunk_index),
 foreign key(scope,run_id) references public.staffing_mapping_runs(scope,id)
);
create index if not exists staffing_mapping_runs_log on public.staffing_mapping_runs(scope,status,accepted_at desc);
alter table public.staffing_mapping_runs enable row level security;
alter table public.staffing_mapping_chunks enable row level security;
revoke all on public.staffing_mapping_runs,public.staffing_mapping_chunks from public,anon,authenticated,service_role;
grant select,insert,update on public.staffing_mapping_runs,public.staffing_mapping_chunks to service_role;
create or replace function public.staffing_begin_mapping_run(p_scope text,p_id uuid,p_actor uuid,p_actor_name text,p_hash text,p_metadata jsonb,p_headers jsonb,p_chunks integer)
returns jsonb language plpgsql security invoker set search_path=public,pg_catalog as $$
declare r public.staffing_mapping_runs;
begin
 if p_chunks<1 or p_chunks>1000 or jsonb_typeof(p_metadata)<>'object' or jsonb_typeof(p_headers)<>'array' then raise exception 'Invalid mapping run'; end if;
 insert into public.staffing_mapping_runs(scope,id,actor_uid,actor_name,payload_hash,metadata,headers,chunk_count)
 values(p_scope,p_id,p_actor,p_actor_name,p_hash,p_metadata,p_headers,p_chunks) on conflict do nothing;
 select * into r from public.staffing_mapping_runs where scope=p_scope and id=p_id for update;
 if r.actor_uid<>p_actor or r.payload_hash<>p_hash then return jsonb_build_object('ok',false,'conflict',true); end if;
 return jsonb_build_object('ok',true,'accepted',r.status='accepted','id',r.id);
end;$$;
create or replace function public.staffing_commit_mapping_run(p_scope text,p_id uuid,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path=public,pg_catalog as $$
declare r public.staffing_mapping_runs; n integer;
begin
 select * into r from public.staffing_mapping_runs where scope=p_scope and id=p_id for update;
 if not found or r.actor_uid<>p_actor then raise exception 'Invalid mapping run'; end if;
 if r.status='accepted' then return jsonb_build_object('ok',true,'id',r.id,'acceptedAt',r.accepted_at);end if;
 select count(*) into n from public.staffing_mapping_chunks where scope=p_scope and run_id=p_id and chunk_index>=0 and chunk_index<r.chunk_count;
 if n<>r.chunk_count then return jsonb_build_object('ok',false,'incomplete',true);end if;
 update public.staffing_mapping_runs set status='accepted',accepted_at=now() where scope=p_scope and id=p_id returning * into r;
 return jsonb_build_object('ok',true,'id',r.id,'acceptedAt',r.accepted_at);
end;$$;
create or replace function public.staffing_mapping_dashboard(p_scope text,p_actor uuid)
returns jsonb language sql stable security invoker set search_path=public,pg_catalog as $$
with accepted as (
 select id,actor_name,accepted_at,metadata,headers from public.staffing_mapping_runs
 where scope=p_scope and status='accepted' and (p_actor is null or actor_uid=p_actor)
), totals as (
 select count(*) runs,coalesce(sum((metadata->>'validRows')::bigint),0) rows,
 coalesce(sum((metadata->>'invalidRows')::bigint),0) errors,
 coalesce(sum((metadata->>'sourceRows')::bigint),0) sources,
 count(distinct metadata->>'project') projects,max(accepted_at) latest from accepted
), projects as (
 select metadata->>'project' project,count(*) runs,sum((metadata->>'validRows')::bigint) rows
 from accepted group by metadata->>'project' order by rows desc limit 50
), periods as (
 select metadata->>'period' period,count(*) runs,sum((metadata->>'validRows')::bigint) rows
 from accepted group by metadata->>'period' order by period desc limit 24
)
select jsonb_build_object('ok',true,'stats',(select to_jsonb(totals) from totals),
 'byProject',coalesce((select jsonb_agg(projects) from projects),'[]'::jsonb),
 'byPeriod',coalesce((select jsonb_agg(periods) from periods),'[]'::jsonb),
 'runs',coalesce((select jsonb_agg(x) from (select * from accepted order by accepted_at desc,id limit 50) x),'[]'::jsonb));
$$;
revoke all on function public.staffing_begin_mapping_run(text,uuid,uuid,text,text,jsonb,jsonb,integer) from public,anon,authenticated;
revoke all on function public.staffing_commit_mapping_run(text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.staffing_mapping_dashboard(text,uuid) from public,anon,authenticated;
grant execute on function public.staffing_begin_mapping_run(text,uuid,uuid,text,text,jsonb,jsonb,integer) to service_role;
grant execute on function public.staffing_commit_mapping_run(text,uuid,uuid) to service_role;
grant execute on function public.staffing_mapping_dashboard(text,uuid) to service_role;
commit;
notify pgrst,'reload schema';
