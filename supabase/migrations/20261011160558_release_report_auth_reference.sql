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
 -- The authenticated server supplies p_actor; reports.user_id has an auth.users foreign key.
 -- Do not require runtime SELECT on the private authentication table.
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
