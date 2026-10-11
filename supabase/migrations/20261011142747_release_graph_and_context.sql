begin;
alter table public.graph_versions drop constraint graph_versions_edge_count_check;
alter table public.graph_versions add constraint graph_versions_edge_count_check check(edge_count between 1 and 21000);
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
   'captured_at',now(),'graph_id',p_graph,'graph_sha256',(select sha256 from public.graph_versions where id=p_graph),'reports',v_reports,'closures',v_closures,
   'weather_run',(select to_jsonb(w) from public.weather_runs w where id=v_run),
   'weather_frames',coalesce((select jsonb_agg(jsonb_build_object(
       'cell_id',cell_id,'interval_end',interval_end,'precipitation_mm',precipitation_mm)
       order by cell_id,interval_end)
     from public.weather_hourly where run_id=v_run),'[]'::jsonb)
 );
end $$;
revoke all on function public.live_route_context(uuid) from public,anon,authenticated;
grant execute on function public.live_route_context(uuid) to service_role;
create or replace function public.publish_graph(p_graph uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare g public.graph_versions; n integer; e integer;
begin
 select * into g from public.graph_versions where id=p_graph for update;
 if not found then raise exception 'GRAPH_VERSION_MISMATCH'; end if;
 perform pg_advisory_xact_lock(hashtext('monsoonroute:graph-publish'));
 select count(*) into n from public.road_nodes where graph_id=p_graph;
 select count(*) into e from public.road_edges where graph_id=p_graph;
 if n<>g.node_count or e<>g.edge_count or n>15000 or e>21000 then raise exception 'GRAPH_COUNTS_MISMATCH'; end if;
 if exists(select 1 from public.turn_restrictions t join public.road_edges a on a.graph_id=t.graph_id and a.edge_id=t.from_edge join public.road_edges b on b.graph_id=t.graph_id and b.edge_id=t.to_edge where t.graph_id=p_graph and (a.to_node<>t.via_node or b.from_node<>t.via_node)) then raise exception 'TURN_TOPOLOGY_INVALID'; end if;
 if not exists(select 1 from public.source_artifacts where id=g.source_artifact_id and license_review='approved') then raise exception 'SOURCE_NOT_APPROVED'; end if;
 update public.graph_versions set state='published' where id=p_graph;
 update public.cities set active_graph_id=p_graph,supported_bbox=gis.st_makeenvelope(77.200,28.610,77.240,28.650,4326) where id=g.city_id;
 insert into public.service_status(name,last_success_at,summary) values('graph',now(),jsonb_build_object('graph_id',p_graph,'node_count',n,'edge_count',e)) on conflict(name) do update set last_success_at=excluded.last_success_at,summary=excluded.summary,last_error_code=null;
 insert into public.audit_events(event_type,entity_id,details) values('graph_published',p_graph::text,jsonb_build_object('sha256',g.sha256,'nodes',n,'edges',e));
 return jsonb_build_object('graph_id',p_graph,'sha256',g.sha256,'nodes',n,'edges',e);
end $$;
revoke all on function public.publish_graph(uuid) from public,anon,authenticated;
grant execute on function public.publish_graph(uuid) to service_role;
commit;
