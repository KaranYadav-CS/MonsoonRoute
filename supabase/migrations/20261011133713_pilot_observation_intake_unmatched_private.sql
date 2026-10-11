begin;
create table if not exists public.pilot_observations (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 client_nonce uuid not null,
 latitude double precision not null check (latitude between 28.600 and 28.655),
 longitude double precision not null check (longitude between 77.190 and 77.245),
 category text not null check (category in ('standing_water','heavy_water','blocked','clear')),
 observed_at timestamptz not null,
 note text not null default '' check (length(note)<=500),
 photo_path text,
 status text not null default 'pending' check(status in ('pending','acknowledged_unmatched','rejected')),
 review_note text check(review_note is null or length(review_note) between 10 and 1000),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '3 hours'),
 unique(user_id,client_nonce),
 constraint pilot_observed_age check (observed_at >= created_at-interval '3 hours' and observed_at<=created_at+interval '5 minutes'),
 constraint pilot_expires_check check(expires_at>created_at and expires_at<=created_at+interval '3 hours 5 minutes'),
 constraint pilot_photo_path_check check(photo_path is null or photo_path=(user_id::text||'/pilot-observations/'||id::text||'.jpg'))
);
create index if not exists pilot_observation_owner_recent on public.pilot_observations(user_id,created_at desc);
create index if not exists pilot_observation_pending on public.pilot_observations(created_at desc) where status='pending';
alter table public.pilot_observations enable row level security;
revoke all on public.pilot_observations from public,anon,authenticated;
grant select,insert,update on public.pilot_observations to authenticated;

create or replace function private.pilot_observation_insert_guard() returns trigger
 language plpgsql security definer set search_path=''
as $$
declare uid uuid;
begin
 uid := auth.uid();
 if uid is null or new.user_id <> uid then raise exception 'PILOT_OWNER_DENIED' using errcode='42501'; end if;
 if new.status <> 'pending' or new.reviewed_by is not null or new.reviewed_at is not null or new.review_note is not null then raise exception 'PILOT_REVIEW_FIELDS_DENIED' using errcode='42501'; end if;
 if new.observed_at<now()-interval '3 hours' or new.observed_at>now()+interval '5 minutes' then raise exception 'PILOT_TIME_DENIED' using errcode='22023'; end if;
 if (select count(*) from public.pilot_observations where user_id=uid and created_at>now()-interval '24 hours')>=8
 or (select count(*) from public.pilot_observations where user_id=uid and created_at>now()-interval '10 minutes')>=2
 then raise exception 'PILOT_DAILY_QUOTA' using errcode='23514';end if;
 return new;
end $$;
revoke all on function private.pilot_observation_insert_guard() from public,anon,authenticated;
drop trigger if exists pilot_observation_insert_guard on public.pilot_observations;
create trigger pilot_observation_insert_guard before insert on public.pilot_observations
for each row execute function private.pilot_observation_insert_guard();

create or replace function private.pilot_observation_review_guard() returns trigger
 language plpgsql security definer set search_path=''
as $$
declare requested_status text;requested_note text;
begin
 if not private.is_reviewer() or auth.uid() is null then raise exception 'PILOT_REVIEW_DENIED' using errcode='42501'; end if;
 if old.status<>'pending' then raise exception 'PILOT_ALREADY_REVIEWED' using errcode='22023'; end if;
 requested_status:=new.status;requested_note:=nullif(btrim(new.review_note),'');
 if requested_status not in ('acknowledged_unmatched','rejected') or requested_note is null or length(requested_note)<10
 then raise exception 'PILOT_REVIEW_REASON_REQUIRED' using errcode='22023';end if;
 new := old;
 new.status:=requested_status;new.review_note:=requested_note;
 new.reviewed_at:=now();new.reviewed_by:=auth.uid();
 return new;
end $$;
revoke all on function private.pilot_observation_review_guard() from public,anon,authenticated;
drop trigger if exists pilot_observation_review_guard on public.pilot_observations;
create trigger pilot_observation_review_guard before update on public.pilot_observations
for each row execute function private.pilot_observation_review_guard();

drop policy if exists pilot_owner_read on public.pilot_observations;
create policy pilot_owner_read on public.pilot_observations for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists pilot_reviewer_read on public.pilot_observations;
create policy pilot_reviewer_read on public.pilot_observations for select to authenticated using ((select private.is_reviewer()));
drop policy if exists pilot_owner_insert on public.pilot_observations;
create policy pilot_owner_insert on public.pilot_observations for insert to authenticated with check
(user_id=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null and review_note is null);
drop policy if exists pilot_reviewer_update on public.pilot_observations;
create policy pilot_reviewer_update on public.pilot_observations for update to authenticated
using ((select private.is_reviewer()) and status='pending')
with check ((select private.is_reviewer()) and status in ('acknowledged_unmatched','rejected'));

drop policy if exists pilot_photo_owner_insert on storage.objects;
create policy pilot_photo_owner_insert on storage.objects for insert to authenticated
with check(bucket_id='report-photos' and exists(
  select 1 from public.pilot_observations p where p.user_id=(select auth.uid())
  and p.photo_path=storage.objects.name and p.status='pending'
  and p.created_at>now()-interval '15 minutes'
));
drop policy if exists pilot_photo_owner_read on storage.objects;
create policy pilot_photo_owner_read on storage.objects for select to authenticated
using(bucket_id='report-photos' and exists(
 select 1 from public.pilot_observations p where p.user_id=(select auth.uid()) and p.photo_path=storage.objects.name
));
drop policy if exists pilot_photo_reviewer_read on storage.objects;
create policy pilot_photo_reviewer_read on storage.objects for select to authenticated
using(bucket_id='report-photos' and (select private.is_reviewer()) and exists(
 select 1 from public.pilot_observations p where p.photo_path=storage.objects.name
));
commit;