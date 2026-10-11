begin;
grant delete on public.pilot_observations to authenticated;
drop policy if exists pilot_owner_withdraw on public.pilot_observations;
create policy pilot_owner_withdraw on public.pilot_observations for delete to authenticated
 using(user_id=(select auth.uid()) and status='pending');
drop policy if exists pilot_photo_owner_withdraw on storage.objects;
create policy pilot_photo_owner_withdraw on storage.objects for delete to authenticated
 using(bucket_id='report-photos' and exists(
   select 1 from public.pilot_observations p
   where p.user_id=(select auth.uid()) and p.status='pending' and p.photo_path=storage.objects.name
 ));
create or replace function private.pilot_observation_review_guard() returns trigger
language plpgsql security definer set search_path=''
as $$
declare requested_status text;requested_note text;
begin
 if not private.is_reviewer() or auth.uid() is null then raise exception 'PILOT_REVIEW_DENIED' using errcode='42501'; end if;
 if old.status<>'pending' then raise exception 'PILOT_ALREADY_REVIEWED' using errcode='22023'; end if;
 if old.expires_at<=now() then raise exception 'PILOT_EVIDENCE_EXPIRED' using errcode='22023'; end if;
 requested_status:=new.status;requested_note:=nullif(btrim(new.review_note),'');
 if requested_status not in ('acknowledged_unmatched','rejected') or requested_note is null or length(requested_note)<10
 then raise exception 'PILOT_REVIEW_REASON_REQUIRED' using errcode='22023';end if;
 new := old;
 new.status:=requested_status;new.review_note:=requested_note;
 new.reviewed_at:=now();new.reviewed_by:=auth.uid();
 return new;
end $$;
revoke all on function private.pilot_observation_review_guard() from public,anon,authenticated;
commit;