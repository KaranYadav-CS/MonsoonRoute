-- Backfill real Supabase Auth user profiles without assigning any privileged role.
-- Applied to Karan Supabase project ihvsazbjhlpylnfeakao, migration 20261011130336.
create or replace function private.monsoonroute_auth_profile()
returns trigger language plpgsql security definer set search_path = ''
as $body$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, '')
  on conflict (user_id) do nothing;
  return new;
end;
$body$;
revoke all on function private.monsoonroute_auth_profile() from public, anon, authenticated;
drop trigger if exists monsoonroute_on_auth_user_created on auth.users;
create trigger monsoonroute_on_auth_user_created
after insert on auth.users
for each row execute function private.monsoonroute_auth_profile();
insert into public.profiles(user_id,display_name)
select u.id, '' from auth.users as u
where not exists (select 1 from public.profiles as p where p.user_id=u.id)
on conflict (user_id) do nothing;
