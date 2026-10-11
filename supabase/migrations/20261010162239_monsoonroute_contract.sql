begin;
create schema if not exists gis;
create schema if not exists private;
create extension if not exists postgis with schema gis;

create table public.cities (
  id text primary key,
  name text not null,
  supported_bbox gis.geometry(Polygon,4326) not null,
  active_graph_id uuid,
  created_at timestamptz not null default now()
);
create table public.data_sources (
  id text primary key,
  name text not null,
  source_url text not null check (source_url ~ '^https://'),
  license text not null,
  limitations text[] not null default '{}'
);
create table public.source_artifacts (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.data_sources(id),
  retrieved_at timestamptz not null,
  source_timestamp timestamptz,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  object_key text,
  license_review text not null check (license_review in ('approved','restricted','blocked')),
  metadata jsonb not null default '{}',
  unique(source_id,sha256)
);
create table public.graph_versions (
  id uuid primary key default gen_random_uuid(),
  city_id text not null references public.cities(id),
  source_artifact_id uuid not null references public.source_artifacts(id),
  sha256 text not null unique check (sha256 ~ '^[a-f0-9]{64}$'),
  captured_at timestamptz not null,
  node_count integer not null check (node_count between 1 and 15000),
  edge_count integer not null check (edge_count between 1 and 20000),
  manifest jsonb not null,
  state text not null default 'staging' check (state in ('staging','published','retired')),
  unique(id,city_id)
);
alter table public.cities add constraint cities_active_graph_fk
  foreign key (active_graph_id,id) references public.graph_versions(id,city_id);
create table public.road_nodes (
  graph_id uuid not null references public.graph_versions(id) on delete cascade,
  node_id text not null,
  geom gis.geometry(Point,4326) not null,
  primary key(graph_id,node_id)
);
create table public.road_edges (
  graph_id uuid not null references public.graph_versions(id) on delete cascade,
  edge_id text not null,
  physical_key text not null,
  from_node text not null,
  to_node text not null,
  osm_way_id bigint not null,
  name text,
  highway text not null,
  geom gis.geometry(LineString,4326) not null,
  length_m double precision not null check (length_m > 0 and length_m <= 105),
  time_s double precision not null check (time_s between 0.001 and 100000),
  hotspot_factor double precision not null check (hotspot_factor between 0 and 1),
  depression_factor double precision check (depression_factor between 0 and 1),
  underpass boolean not null default false,
  terrain_valid boolean not null default false,
  tags jsonb not null default '{}',
  primary key(graph_id,edge_id),
  foreign key(graph_id,from_node) references public.road_nodes(graph_id,node_id),
  foreign key(graph_id,to_node) references public.road_nodes(graph_id,node_id),
  check(from_node<>to_node),
  check(gis.st_npoints(geom)>=2)
);
create table public.turn_restrictions (
  graph_id uuid not null,
  from_edge text not null,
  to_edge text not null,
  via_node text not null,
  reason text not null,
  primary key(graph_id,from_edge,to_edge),
  foreign key(graph_id,from_edge) references public.road_edges(graph_id,edge_id),
  foreign key(graph_id,to_edge) references public.road_edges(graph_id,edge_id),
  foreign key(graph_id,via_node) references public.road_nodes(graph_id,node_id)
);
create table public.hotspots (
  id uuid primary key default gen_random_uuid(),
  city_id text not null references public.cities(id),
  source_artifact_id uuid not null references public.source_artifacts(id),
  name text not null,
  geom gis.geometry(Point,4326) not null,
  uncertainty_m double precision not null check (uncertainty_m>=0),
  usable boolean not null default false,
  source_page text not null,
  location_text text not null,
  review jsonb not null,
  check(not usable or uncertainty_m<=100)
);
create table public.weather_runs (
  id uuid primary key,
  city_id text not null references public.cities(id),
  artifact_id uuid not null references public.source_artifacts(id),
  kind text not null check (kind in ('forecast','reanalysis')),
  retrieved_at timestamptz not null,
  source_issued_at timestamptz,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  expected_rows integer not null check (expected_rows>=9),
  metadata jsonb not null,
  state text not null check (state in ('staging','published')),
  check(valid_until>valid_from)
);
create table public.weather_hourly (
  run_id uuid not null references public.weather_runs(id) on delete cascade,
  cell_id smallint not null check (cell_id between 0 and 8),
  requested_point gis.geometry(Point,4326) not null,
  provider_point gis.geometry(Point,4326) not null,
  interval_end timestamptz not null,
  precipitation_mm double precision not null check (precipitation_mm between 0 and 300),
  primary key(run_id,cell_id,interval_end)
);
create table public.scenarios (
  id text primary key,
  city_id text not null references public.cities(id),
  graph_id uuid not null references public.graph_versions(id),
  title text not null,
  kind text not null check(kind in ('synthetic','historical_weather','historical_observed')),
  artifact_sha256 text not null check (artifact_sha256 ~ '^[a-f0-9]{64}$'),
  artifact_path text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  description text not null,
  provenance jsonb not null,
  public_visible boolean not null default true,
  check(end_at>start_at)
);
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name)<=80),
  created_at timestamptz not null default now()
);
create table private.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check(role in ('moderator','admin')),
  assigned_at timestamptz not null default now()
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  client_nonce uuid not null,
  request_sha256 text not null check(request_sha256 ~ '^[a-f0-9]{64}$'),
  graph_id uuid not null,
  edge_id text not null,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  category text not null check(category in ('standing_water','heavy_water','blocked','clear')),
  point gis.geometry(Point,4326) not null,
  note text not null default '' check(length(note)<=500),
  photo_original_path text,
  photo_processed_path text,
  photo_mime text check(photo_mime in ('image/jpeg','image/png','image/webp')),
  status text not null default 'draft'
    check(status in ('draft','pending','approved','rejected','resolved','withdrawn')),
  review_version integer not null default 0 check(review_version>=0),
  reviewed_by uuid references auth.users(id) on delete set null,
  review_reason text check(length(review_reason)<=1000),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key(graph_id,edge_id) references public.road_edges(graph_id,edge_id),
  unique(user_id,client_nonce),
  check(observed_at<=created_at+interval '5 minutes'),
  check(observed_at>=created_at-interval '3 hours'),
  check(expires_at>observed_at and expires_at<=observed_at+interval '3 hours')
);
create table public.road_overrides (
  id uuid primary key default gen_random_uuid(),
  graph_id uuid not null,
  edge_id text not null,
  scope text not null check(scope in ('physical','directed')),
  report_id uuid references public.reports(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  reason text not null check(length(reason) between 5 and 1000),
  created_at timestamptz not null default now(),
  valid_until timestamptz not null,
  revoked_at timestamptz,
  foreign key(graph_id,edge_id) references public.road_edges(graph_id,edge_id),
  check(valid_until>created_at and valid_until<=created_at+interval '2 hours')
);
create table public.vision_jobs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.reports(id) on delete cascade,
  state text not null default 'queued' check(state in ('queued','running','succeeded','failed')),
  attempts integer not null default 0 check(attempts>=0),
  lease_token uuid,
  lease_until timestamptz,
  last_enqueue_at timestamptz,
  inference_config jsonb not null,
  source_sha256 text check(source_sha256 ~ '^[a-f0-9]{64}$'),
  result jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(state<>'running' or (lease_token is not null and lease_until is not null))
);
create table public.route_requests (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  city_id text not null references public.cities(id),
  graph_id uuid not null references public.graph_versions(id),
  weather_run_id uuid references public.weather_runs(id) on delete set null,
  scenario_id text references public.scenarios(id) on delete set null,
  ruleset_id text not null,
  mode text not null check(mode in ('live','scenario')),
  save_history boolean not null default false,
  effective_at timestamptz not null,
  request jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  check(not save_history or user_id is not null),
  check((mode='live' and scenario_id is null) or (mode='scenario' and scenario_id is not null))
);
create table public.audit_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  entity_id text not null,
  request_id uuid,
  details jsonb not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  archive_key text,
  check((archived_at is null)=(archive_key is null))
);
create table public.service_status (
  name text primary key,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_code text,
  summary jsonb not null default '{}'
);
create table private.quota_buckets (
  bucket text not null,
  subject_hash text not null,
  window_start timestamptz not null,
  used integer not null check(used>0),
  expires_at timestamptz not null,
  primary key(bucket,subject_hash,window_start)
);
create table private.runtime_settings (
  name text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index road_nodes_geom_idx on public.road_nodes using gist(geom);
create index road_edges_geom_idx on public.road_edges using gist(geom);
create index road_edges_physical_idx on public.road_edges(graph_id,physical_key);
create index hotspots_geom_idx on public.hotspots using gist(geom);
create index weather_latest_idx on public.weather_runs(city_id,retrieved_at desc)
  where state='published' and kind='forecast';
create index reports_active_idx on public.reports(graph_id,status,expires_at);
create index reports_owner_idx on public.reports(user_id,created_at desc);
create index overrides_active_idx on public.road_overrides(graph_id,valid_until)
  where revoked_at is null;
create index jobs_recovery_idx on public.vision_jobs(state,last_enqueue_at,lease_until);
create index history_owner_idx on public.route_requests(user_id,created_at desc)
  where save_history;
create index audit_created_idx on public.audit_events(created_at);
create index audit_unarchived_idx on public.audit_events(id) where archived_at is null;
create index quotas_expiry_idx on private.quota_buckets(expires_at);

insert into private.runtime_settings(name,value) values
  ('aws_enabled','false'),('vision_enabled','false'),('photos_enabled','false'),
  ('weather_ingest_enabled','false') on conflict do nothing;

-- Non-exposed helper: auth identity check before privileged role lookup.
create or replace function private.is_reviewer()
returns boolean language sql stable security definer set search_path=''
as $$
  select auth.uid() is not null and exists (
    select 1 from private.user_roles r
    where r.user_id=(select auth.uid()) and r.role in ('moderator','admin')
  )
$$;
revoke all on function private.is_reviewer() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_reviewer() to authenticated;

-- Explicit application table RLS; no inherited broad privileges.
do $$ declare t text; begin
  foreach t in array array[
    'cities','data_sources','source_artifacts','graph_versions','road_nodes',
    'road_edges','turn_restrictions','hotspots','weather_runs','weather_hourly',
    'scenarios','profiles','reports','road_overrides','vision_jobs',
    'route_requests','audit_events','service_status'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
-- Tables without client policies stay backend-only.
grant select on public.profiles,public.reports,public.route_requests to authenticated;
grant select(id,report_id,state,attempts,result,error_code,created_at,updated_at)
  on public.vision_jobs to authenticated;
create policy profile_owner_read on public.profiles for select to authenticated
  using(user_id=(select auth.uid()));
create policy report_owner_or_reviewer_read on public.reports for select to authenticated
  using(user_id=(select auth.uid()) or (select private.is_reviewer()));
create policy job_owner_or_reviewer_read on public.vision_jobs for select to authenticated
  using(exists(select 1 from public.reports r where r.id=report_id
    and (r.user_id=(select auth.uid()) or (select private.is_reviewer()))));
create policy history_owner_read on public.route_requests for select to authenticated
  using(save_history and user_id=(select auth.uid()));
revoke all on all tables in schema private from anon,authenticated;
grant usage on schema private,gis to service_role;
grant all on all tables in schema private to service_role;
grant usage,select on sequence public.audit_events_id_seq to service_role;
-- No public SELECT policy exposes photos, personal positions, or moderation actors.

-- Atomic quota check: server supplies trusted limit/window; callers cannot choose them.
create or replace function public.consume_quota(
  p_bucket text,p_subject_hash text,p_limit integer,p_window_seconds integer
) returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v_start timestamptz; v_used integer;
begin
  if p_limit<1 or p_window_seconds<1 or p_window_seconds>86400
    or length(p_subject_hash)<>64 then raise exception 'INVALID_QUOTA_ARGUMENT'; end if;
  v_start:=to_timestamp(floor(extract(epoch from clock_timestamp())/p_window_seconds)*p_window_seconds);
  insert into private.quota_buckets(bucket,subject_hash,window_start,used,expires_at)
  values(p_bucket,p_subject_hash,v_start,1,v_start+make_interval(secs=>p_window_seconds*2))
  on conflict(bucket,subject_hash,window_start) do update
    set used=private.quota_buckets.used+1
    where private.quota_buckets.used<p_limit
  returning used into v_used;
  return jsonb_build_object('allowed',v_used is not null,'used',v_used,
    'reset_at',v_start+make_interval(secs=>p_window_seconds));
end $$;
revoke all on function public.consume_quota(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_quota(text,text,integer,integer) to service_role;

-- Lease token prevents stale workers from committing after a retry has claimed the job.
create or replace function public.claim_vision_job(p_job_id uuid,p_token uuid)
returns setof public.vision_jobs language sql security invoker set search_path=''
as $$
  update public.vision_jobs set state='running',attempts=attempts+1,
    lease_token=p_token,lease_until=now()+interval '3 minutes',updated_at=now()
  where id=p_job_id and attempts<3
    and (state='queued' or (state='running' and lease_until<now()))
  returning *
$$;
revoke all on function public.claim_vision_job(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_vision_job(uuid,uuid) to service_role;

create or replace function public.finish_vision_job(
  p_job_id uuid,p_token uuid,p_processed_path text,p_result jsonb,p_error_code text
) returns boolean language plpgsql security invoker set search_path=''
as $$
declare v_report uuid; v_owner uuid; v_expected text; v_status text;
begin
  select report_id into v_report from public.vision_jobs where id=p_job_id;
  if not found then return false; end if;
  -- Lock order is report then job, identical to withdrawal/admin retry.
  select user_id,status into v_owner,v_status from public.reports
    where id=v_report for update;
  if not found or v_owner is null or v_status in ('draft','withdrawn') then return false; end if;
  perform 1 from public.vision_jobs where id=p_job_id and state='running'
    and lease_token=p_token and lease_until>now() for update;
  if not found then return false; end if;
  if p_error_code is null then
    if v_owner is null then raise exception 'REPORT_OWNER_REMOVED'; end if;
    v_expected:=v_owner::text||'/'||v_report::text||'/processed.jpg';
    if p_processed_path<>v_expected or p_result is null then
      raise exception 'INVALID_VISION_RESULT'; end if;
    update public.reports set photo_processed_path=p_processed_path where id=v_report;
  end if;
  update public.vision_jobs set state=case when p_error_code is null then 'succeeded' else 'failed' end,
    result=p_result,error_code=p_error_code,lease_token=null,lease_until=null,updated_at=now()
    where id=p_job_id;
  insert into public.audit_events(event_type,entity_id,details)
    values('vision_finished',p_job_id::text,jsonb_build_object('error_code',p_error_code));
  return true;
end $$;
revoke all on function public.finish_vision_job(uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.finish_vision_job(uuid,uuid,text,jsonb,text) to service_role;

-- Moderation and closure publication occur in one transaction with optimistic revision.
create or replace function public.moderate_report(
  p_actor uuid,p_report uuid,p_expected_version integer,p_action text,
  p_reason text,p_close_minutes integer default 0,p_scope text default 'physical'
) returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v public.reports; v_override uuid;
begin
  if not exists(select 1 from private.user_roles where user_id=p_actor
    and role in ('moderator','admin')) then raise exception 'FORBIDDEN'; end if;
  if p_action not in ('approve','reject','resolve') or length(p_reason) not between 5 and 1000
    or p_close_minutes not between 0 and 120 or p_scope not in ('physical','directed') then
    raise exception 'INVALID_REVIEW'; end if;
  select * into v from public.reports where id=p_report for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v.review_version<>p_expected_version then raise exception 'REVISION_CONFLICT'; end if;
  if v.status='draft' or v.status='withdrawn' then raise exception 'INVALID_REPORT_STATE'; end if;
  if p_action='approve' and v.expires_at<=now() then raise exception 'REPORT_EXPIRED'; end if;
  if p_action='approve' and v.photo_original_path is not null and v.photo_processed_path is null then
    raise exception 'PHOTO_PROCESSING'; end if;
  if p_close_minutes>0 and (p_action<>'approve' or v.category<>'blocked') then
    raise exception 'CLOSURE_REQUIRES_BLOCKED_REPORT'; end if;
  update public.reports set
    status=case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'resolved' end,
    reviewed_by=p_actor,review_reason=p_reason,reviewed_at=now(),review_version=review_version+1
    where id=p_report;
  -- Re-review replaces this report's prior closure decision; owner withdrawal cannot do so.
  update public.road_overrides set revoked_at=now() where report_id=p_report and revoked_at is null;
  if p_close_minutes>0 then
    insert into public.road_overrides(graph_id,edge_id,scope,report_id,created_by,reason,valid_until)
    values(v.graph_id,v.edge_id,p_scope,p_report,p_actor,p_reason,
      least(now()+make_interval(mins=>p_close_minutes),v.expires_at))
    returning id into v_override;
  end if;
  insert into public.audit_events(event_type,actor_id,entity_id,details)
    values('report_moderated',p_actor,p_report::text,
      jsonb_build_object('action',p_action,'revision',v.review_version+1,'override_id',v_override));
  return jsonb_build_object('id',p_report,'review_version',v.review_version+1,'override_id',v_override);
end $$;
revoke all on function public.moderate_report(uuid,uuid,integer,text,text,integer,text)
  from public,anon,authenticated;
grant execute on function public.moderate_report(uuid,uuid,integer,text,text,integer,text) to service_role;

-- All nine cells are inserted and validated before publishing a weather run.
create or replace function public.publish_weather_run(
  p_run jsonb,p_frames jsonb
) returns uuid language plpgsql security invoker set search_path=''
as $$
declare v_id uuid; v_count integer; v_cells integer;
begin
  v_id:=(p_run->>'id')::uuid;
  if exists(select 1 from public.weather_runs where id=v_id and state='published') then return v_id; end if;
  insert into public.weather_runs(id,city_id,artifact_id,kind,retrieved_at,source_issued_at,
    valid_from,valid_until,expected_rows,metadata,state)
  values(v_id,p_run->>'city_id',(p_run->>'artifact_id')::uuid,p_run->>'kind',
    (p_run->>'retrieved_at')::timestamptz,(p_run->>'source_issued_at')::timestamptz,
    (p_run->>'valid_from')::timestamptz,(p_run->>'valid_until')::timestamptz,
    (p_run->>'expected_rows')::integer,p_run->'metadata','staging')
  on conflict(id) do nothing;
  insert into public.weather_hourly(run_id,cell_id,requested_point,provider_point,interval_end,precipitation_mm)
  select v_id,f.cell_id,
    gis.st_setsrid(gis.st_makepoint(f.requested_lon,f.requested_lat),4326),
    gis.st_setsrid(gis.st_makepoint(f.provider_lon,f.provider_lat),4326),
    f.interval_end,f.precipitation_mm
  from jsonb_to_recordset(p_frames) as f(cell_id smallint,requested_lon double precision,
    requested_lat double precision,provider_lon double precision,provider_lat double precision,
    interval_end timestamptz,precipitation_mm double precision)
  on conflict(run_id,cell_id,interval_end) do nothing;
  select count(*),count(distinct cell_id) into v_count,v_cells
    from public.weather_hourly where run_id=v_id;
  if v_count<>(p_run->>'expected_rows')::integer or v_cells<>9 then
    raise exception 'INCOMPLETE_WEATHER_RUN'; end if;
  update public.weather_runs set state='published' where id=v_id;
  insert into public.service_status(name,last_success_at,summary)
    values('weather',now(),jsonb_build_object('run_id',v_id))
    on conflict(name) do update set last_success_at=excluded.last_success_at,summary=excluded.summary;
  return v_id;
end $$;
revoke all on function public.publish_weather_run(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.publish_weather_run(jsonb,jsonb) to service_role;

-- Private photo bucket; write scope is intentionally limited to original uploads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('report-photos','report-photos',false,3145728,
  array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;
create policy report_photo_original_insert on storage.objects for insert to authenticated
with check(bucket_id='report-photos' and exists (
  select 1 from public.reports r where r.user_id=(select auth.uid())
    and r.status='draft' and r.created_at>now()-interval '15 minutes'
    and r.photo_original_path=name
));
create policy report_photo_owner_read on storage.objects for select to authenticated
using(bucket_id='report-photos' and exists (
  select 1 from public.reports r where r.user_id=(select auth.uid())
    and (r.photo_original_path=name or r.photo_processed_path=name)
));
-- Reviewers can fetch only processed images, never untrusted originals.
create policy report_photo_reviewer_read on storage.objects for select to authenticated
using(bucket_id='report-photos' and (select private.is_reviewer()) and exists (
  select 1 from public.reports r where r.photo_processed_path=name
));
-- No client UPDATE/upsert or DELETE policy. Server performs replacement/retention.

-- Private-schema RLS as defense in depth, service_role is trusted backend.
alter table private.user_roles enable row level security;
alter table private.quota_buckets enable row level security;
alter table private.runtime_settings enable row level security;
-- Transaction ends after additional RPCs in section11.6.

-- Add to the same contract migration after tables exist.
create or replace function public.create_report_draft(
 p_actor uuid,p_nonce uuid,p_request_sha256 text,p_graph uuid,p_edge text,
 p_lat double precision,p_lon double precision,p_observed timestamptz,
 p_category text,p_note text,p_mime text,p_user_quota_hash text
) returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v public.reports; v_id uuid:=gen_random_uuid(); v_point gis.geometry(Point,4326);
begin
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
 select * into v from public.reports where user_id=p_actor and client_nonce=p_nonce;
 if found then
   if v.request_sha256<>p_request_sha256 then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
   return jsonb_build_object('report_id',v.id,'status',v.status,'path',v.photo_original_path,'mime',v.photo_mime);
 end if;
 if not exists(select 1 from auth.users where id=p_actor) then raise exception 'FORBIDDEN'; end if;
 v_point:=gis.st_setsrid(gis.st_makepoint(p_lon,p_lat),4326);
 if not exists(select 1 from public.cities c join public.graph_versions g on g.id=c.active_graph_id
   where g.id=p_graph and g.state='published' and gis.st_covers(c.supported_bbox,v_point)) then
   raise exception 'POINT_OUTSIDE_PILOT'; end if;
 if not exists(select 1 from public.road_edges e where e.graph_id=p_graph and e.edge_id=p_edge
   and gis.st_dwithin(e.geom::gis.geography,v_point::gis.geography,100)) then
   raise exception 'INVALID_REPORT_EDGE'; end if;
 if p_observed<now()-interval '3 hours' or p_observed>now()+interval '5 minutes' then
   raise exception 'INVALID_OBSERVED_TIME'; end if;
 if p_mime is not null and not coalesce((select (value #>> '{}')::boolean
   from private.runtime_settings where name='photos_enabled'),false) then raise exception 'PHOTOS_DISABLED'; end if;
 if (select count(*) from public.reports where user_id=p_actor and status='draft'
   and created_at>now()-interval '15 minutes')>=5 then raise exception 'DRAFT_QUOTA'; end if;
 if not ((public.consume_quota('draft_user_hour',p_user_quota_hash,5,3600)->>'allowed')::boolean)
   or not ((public.consume_quota('draft_user_day',p_user_quota_hash,20,86400)->>'allowed')::boolean) then
   raise exception 'DRAFT_QUOTA'; end if;
 insert into public.reports(id,user_id,client_nonce,request_sha256,graph_id,edge_id,
   observed_at,expires_at,category,point,note,photo_mime,photo_original_path)
 values(v_id,p_actor,p_nonce,p_request_sha256,p_graph,p_edge,p_observed,p_observed+interval '3 hours',
   p_category,v_point,p_note,p_mime,
   case when p_mime is null then null else p_actor::text||'/'||v_id::text||'/original' end);
 return jsonb_build_object('report_id',v_id,'status','draft',
   'path',case when p_mime is null then null else p_actor::text||'/'||v_id::text||'/original' end,'mime',p_mime);
end $$;
revoke all on function public.create_report_draft(uuid,uuid,text,uuid,text,double precision,double precision,timestamptz,text,text,text,text)
 from public,anon,authenticated;
grant execute on function public.create_report_draft(uuid,uuid,text,uuid,text,double precision,double precision,timestamptz,text,text,text,text)
 to service_role;

create or replace function public.finalize_report(p_actor uuid,p_report uuid,p_has_photo boolean,p_quota_subject_hash text,p_job_config jsonb)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v public.reports; v_job uuid;
begin
  select * into v from public.reports where id=p_report and user_id=p_actor for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v.status='pending' then
    select id into v_job from public.vision_jobs where report_id=p_report;
    return jsonb_build_object('report_id',p_report,'job_id',v_job,'status','pending');
  end if;
  if v.status<>'draft' or v.created_at<now()-interval '15 minutes' or v.expires_at<=now() then
    raise exception 'INVALID_REPORT_STATE'; end if;
  if p_has_photo<>(v.photo_original_path is not null) then raise exception 'PHOTO_STATE_MISMATCH'; end if;
  if p_has_photo and (jsonb_typeof(p_job_config)<>'object' or
    (p_job_config->>'processing_mode') not in ('aws','manual') or
    (p_job_config->>'sanitize_version')<>'sanitize-v1') then raise exception 'INVALID_JOB_CONFIG'; end if;
  if p_has_photo and not ((public.consume_quota('photo_jobs_global',p_quota_subject_hash,100,86400)->>'allowed')::boolean) then
    raise exception 'PHOTO_JOB_QUOTA'; end if;
  update public.reports set status='pending' where id=p_report;
  if p_has_photo then
    insert into public.vision_jobs(report_id,inference_config) values(p_report,p_job_config)
      on conflict(report_id) do update set updated_at=public.vision_jobs.updated_at
      returning id into v_job;
  end if;
  insert into public.audit_events(event_type,actor_id,entity_id,details)
    values('report_submitted',p_actor,p_report::text,jsonb_build_object('job_id',v_job));
  return jsonb_build_object('report_id',p_report,'job_id',v_job,'status','pending');
end $$;
revoke all on function public.finalize_report(uuid,uuid,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.finalize_report(uuid,uuid,boolean,text,jsonb) to service_role;

create or replace function public.backend_context(p_actor uuid default null)
returns jsonb language sql stable security invoker set search_path=''
as $$
 select jsonb_build_object(
   'role',(select role from private.user_roles where user_id=p_actor),
   'flags',coalesce((select jsonb_object_agg(name,value) from private.runtime_settings),'{}'::jsonb)
 )
$$;
revoke all on function public.backend_context(uuid) from public,anon,authenticated;
grant execute on function public.backend_context(uuid) to service_role;

create or replace function public.set_runtime_flags(p_actor uuid,p_flags jsonb)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare k text; v jsonb;
begin
 if not exists(select 1 from private.user_roles where user_id=p_actor and role='admin') then
   raise exception 'FORBIDDEN'; end if;
 if jsonb_typeof(p_flags)<>'object' then raise exception 'INVALID_FLAGS'; end if;
 for k,v in select key,value from jsonb_each(p_flags) loop
   if k not in ('aws_enabled','vision_enabled','photos_enabled','weather_ingest_enabled')
     or jsonb_typeof(v)<>'boolean' then raise exception 'INVALID_FLAGS'; end if;
   insert into private.runtime_settings(name,value) values(k,v)
     on conflict(name) do update set value=excluded.value,updated_at=now();
 end loop;
 insert into public.audit_events(event_type,actor_id,entity_id,details)
   values('flags_changed',p_actor,'runtime',p_flags);
 return public.backend_context(p_actor);
end $$;
revoke all on function public.set_runtime_flags(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.set_runtime_flags(uuid,jsonb) to service_role;

create or replace function public.withdraw_report(p_actor uuid,p_report uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v public.reports;
begin
 select * into v from public.reports where id=p_report and user_id=p_actor for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 update public.reports r set status='withdrawn',note='',
   point=(select gis.st_lineinterpolatepoint(e.geom,0.5) from public.road_edges e
     where e.graph_id=r.graph_id and e.edge_id=r.edge_id),
   photo_original_path=null,photo_processed_path=null,review_version=review_version+1
   where id=p_report;
 update public.vision_jobs set state='failed',error_code='REPORT_WITHDRAWN',
   lease_token=null,lease_until=null,updated_at=now() where report_id=p_report and state in ('queued','running');
 insert into public.audit_events(event_type,actor_id,entity_id,details)
   values('report_withdrawn',p_actor,p_report::text,'{}');
 return jsonb_build_object('original_path',v.photo_original_path,'processed_path',v.photo_processed_path);
end $$;
revoke all on function public.withdraw_report(uuid,uuid) from public,anon,authenticated;
grant execute on function public.withdraw_report(uuid,uuid) to service_role;

create or replace function public.live_route_context(p_graph uuid)
returns jsonb language plpgsql stable security invoker set search_path=''
as $$
declare v_city text; v_run uuid; v_reports jsonb; v_closures jsonb;
begin
 select city_id into v_city from public.graph_versions
   where id=p_graph and state='published';
 if not found or not exists(select 1 from public.cities
   where id=v_city and active_graph_id=p_graph) then raise exception 'GRAPH_VERSION_MISMATCH'; end if;
 select id into v_run from public.weather_runs
   where city_id=v_city and kind='forecast' and state='published'
   order by retrieved_at desc,id desc limit 1;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into v_reports from (
   select id,edge_id,category,observed_at,expires_at,review_version
   from public.reports where graph_id=p_graph and status='approved' and expires_at>now()
   order by id limit 2001
 ) q;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into v_closures from (
   select id,edge_id,scope,valid_until,report_id from public.road_overrides
   where graph_id=p_graph and revoked_at is null and valid_until>now()
   order by id limit 2001
 ) q;
 if jsonb_array_length(v_reports)>2000 or jsonb_array_length(v_closures)>2000 then
   raise exception 'EVIDENCE_VOLUME_UNSUPPORTED'; end if;
 return jsonb_build_object(
   'captured_at',now(),'graph_id',p_graph,'reports',v_reports,'closures',v_closures,
   'weather_run',(select to_jsonb(w) from public.weather_runs w where id=v_run),
   'weather_frames',coalesce((select jsonb_agg(jsonb_build_object(
       'cell_id',cell_id,'interval_end',interval_end,'precipitation_mm',precipitation_mm)
       order by cell_id,interval_end)
     from public.weather_hourly where run_id=v_run),'[]'::jsonb)
 );
end $$;
revoke all on function public.live_route_context(uuid) from public,anon,authenticated;
grant execute on function public.live_route_context(uuid) to service_role;

create or replace function public.reserve_vision_enqueue(p_job uuid)
returns setof public.vision_jobs language sql security invoker set search_path=''
as $$
 update public.vision_jobs set last_enqueue_at=now(),updated_at=now()
 where id=p_job and attempts<3 and
   (state='queued' or (state='running' and lease_until<now())) and
   (last_enqueue_at is null or last_enqueue_at<now()-interval '5 minutes')
 returning *
$$;
revoke all on function public.reserve_vision_enqueue(uuid) from public,anon,authenticated;
grant execute on function public.reserve_vision_enqueue(uuid) to service_role;

create or replace function public.retry_vision_job(
 p_actor uuid,p_job uuid,p_reason text,p_quota_subject_hash text
) returns uuid language plpgsql security invoker set search_path=''
as $$
declare v_report uuid; v public.reports; j public.vision_jobs;
begin
 if not exists(select 1 from private.user_roles where user_id=p_actor and role='admin') then
   raise exception 'FORBIDDEN'; end if;
 if length(p_reason) not between 5 and 300 then raise exception 'INVALID_RETRY_REASON'; end if;
 select report_id into v_report from public.vision_jobs where id=p_job;
 if not found then raise exception 'NOT_FOUND'; end if;
 select * into v from public.reports where id=v_report for update;
 select * into j from public.vision_jobs where id=p_job for update;
 if j.state<>'failed' or v.status='withdrawn' or v.photo_original_path is null
   or v.created_at<now()-interval '24 hours' then raise exception 'JOB_NOT_RETRYABLE'; end if;
 if exists(select 1 from public.audit_events where event_type='vision_retry'
   and entity_id=p_job::text and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC') then
   raise exception 'RETRY_QUOTA'; end if;
 if not ((public.consume_quota('photo_jobs_global',p_quota_subject_hash,100,86400)->>'allowed')::boolean) then
   raise exception 'PHOTO_JOB_QUOTA'; end if;
 update public.vision_jobs set state='queued',attempts=0,lease_token=null,lease_until=null,
   last_enqueue_at=null,error_code=null,result=null,updated_at=now() where id=p_job;
 insert into public.audit_events(event_type,actor_id,entity_id,details)
   values('vision_retry',p_actor,p_job::text,jsonb_build_object('reason',p_reason));
 return p_job;
end $$;
revoke all on function public.retry_vision_job(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.retry_vision_job(uuid,uuid,text,text) to service_role;

create or replace function public.maintenance_context()
returns jsonb language plpgsql security invoker set search_path=''
as $$
begin
 update public.vision_jobs set state='failed',error_code='ATTEMPTS_EXHAUSTED',
   lease_token=null,lease_until=null,updated_at=now()
 where id in (select id from public.vision_jobs
   where attempts>=3 and (state='queued' or (state='running' and lease_until<now()))
   order by created_at limit 50);
 return jsonb_build_object(
   'flags',(public.backend_context(null)->'flags'),
   'jobs',coalesce((select jsonb_agg(to_jsonb(q)) from (
     select id,report_id from public.vision_jobs where attempts<3 and
       (state='queued' or (state='running' and lease_until<now())) and
       (last_enqueue_at is null or last_enqueue_at<now()-interval '5 minutes')
     order by created_at limit 50) q),'[]'::jsonb),
   'cleanup_reports',coalesce((select jsonb_agg(to_jsonb(q)) from (
     select id,user_id,status,created_at,photo_original_path,photo_processed_path
     from public.reports where
       (photo_original_path is not null and created_at<now()-interval '24 hours') or
       (photo_processed_path is not null and created_at<now()-interval '7 days') or
       (status='withdrawn' and created_at>now()-interval '30 days')
     order by created_at limit 100) q),'[]'::jsonb),
   'audit',coalesce((select jsonb_agg(to_jsonb(q)) from (
     select id,event_type,entity_id,created_at,
       jsonb_strip_nulls(jsonb_build_object(
         'error_code',details->'error_code','job_id',details->'job_id')) as details
     from public.audit_events where archived_at is null
     order by id limit 500) q),'[]'::jsonb)
 );
end $$;
revoke all on function public.maintenance_context() from public,anon,authenticated;
grant execute on function public.maintenance_context() to service_role;

create or replace function public.commit_audit_archive(p_ids bigint[],p_key text)
returns integer language plpgsql security invoker set search_path=''
as $$
declare n integer;
begin
 if cardinality(p_ids) not between 1 and 500 or p_key !~ '^audit/[a-zA-Z0-9/_\.-]+\.json$' then
   raise exception 'INVALID_ARCHIVE_BATCH'; end if;
 update public.audit_events set archived_at=now(),archive_key=p_key
   where id=any(p_ids) and archived_at is null;
 get diagnostics n=row_count;
 return n;
end $$;
revoke all on function public.commit_audit_archive(bigint[],text) from public,anon,authenticated;
grant execute on function public.commit_audit_archive(bigint[],text) to service_role;

create or replace function public.prune_maintenance()
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare n_quota integer; n_routes integer; n_weather integer; n_reports integer; n_audit integer;
begin
 delete from private.quota_buckets where (bucket,subject_hash,window_start) in
   (select bucket,subject_hash,window_start from private.quota_buckets
    where expires_at<now() order by expires_at limit 500);
 get diagnostics n_quota=row_count;
 delete from public.route_requests where id in (select id from public.route_requests
   where (save_history and created_at<now()-interval '7 days') or
     (not save_history and created_at<now()-interval '24 hours')
   order by created_at limit 500);
 get diagnostics n_routes=row_count;
 delete from public.weather_runs where id in (select w.id from public.weather_runs w
   where w.retrieved_at<now()-interval '7 days' and not exists
     (select 1 from public.route_requests r where r.weather_run_id=w.id)
   order by w.retrieved_at limit 100);
 get diagnostics n_weather=row_count;
 update public.reports r set user_id=null,reviewed_by=null,note='',review_reason=null,
   point=(select gis.st_lineinterpolatepoint(e.geom,0.5) from public.road_edges e
     where e.graph_id=r.graph_id and e.edge_id=r.edge_id)
 where r.id in (select id from public.reports where created_at<now()-interval '30 days'
   and user_id is not null and photo_original_path is null and photo_processed_path is null
   order by created_at limit 100);
 get diagnostics n_reports=row_count;
 delete from public.reports where id in (select id from public.reports
   where status='draft' and created_at<now()-interval '24 hours'
     and photo_original_path is null and photo_processed_path is null
   order by created_at limit 100);
 delete from public.audit_events where id in (select id from public.audit_events
   where created_at<now()-interval '30 days' order by created_at limit 500);
 get diagnostics n_audit=row_count;
 return jsonb_build_object('quotas',n_quota,'routes',n_routes,'weather',n_weather,
   'deidentified_reports',n_reports,'audit',n_audit);
end $$;
revoke all on function public.prune_maintenance() from public,anon,authenticated;
grant execute on function public.prune_maintenance() to service_role;

create or replace function public.expire_report_source(p_report uuid)
returns text language plpgsql security invoker set search_path=''
as $$
declare v public.reports;
begin
 select * into v from public.reports where id=p_report for update;
 if not found or v.photo_original_path is null or v.created_at>=now()-interval '24 hours' then return null; end if;
 update public.vision_jobs set state='failed',error_code='SOURCE_EXPIRED',
   lease_token=null,lease_until=null,updated_at=now()
 where report_id=p_report and state in ('queued','running');
 return v.photo_original_path;
end $$;
revoke all on function public.expire_report_source(uuid) from public,anon,authenticated;
grant execute on function public.expire_report_source(uuid) to service_role;

create or replace function public.pin_vision_source(p_job uuid,p_token uuid,p_sha text)
returns boolean language plpgsql security invoker set search_path=''
as $$
declare v public.vision_jobs;
begin
 if p_sha !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_SOURCE_HASH'; end if;
 select * into v from public.vision_jobs where id=p_job and state='running'
   and lease_token=p_token and lease_until>now() for update;
 if not found then return false; end if;
 if v.source_sha256 is not null and v.source_sha256<>p_sha then
   raise exception 'SOURCE_HASH_CHANGED'; end if;
 update public.vision_jobs set source_sha256=p_sha where id=p_job;
 return true;
end $$;
revoke all on function public.pin_vision_source(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.pin_vision_source(uuid,uuid,text) to service_role;
commit;
