begin;
create or replace function public.pilot_reviewer_access() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(private.is_reviewer(),false) $$;
revoke all on function public.pilot_reviewer_access() from public,anon,authenticated;
grant execute on function public.pilot_reviewer_access() to authenticated;
commit;