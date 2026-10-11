# Supabase Auth profile migration — verified live, 11 Oct 2026

Applied migration: `20261011130336_monsoonroute_auth_profile_lifecycle` against Karan project `ihvsazbjhlpylnfeakao`.

## Verified by real database read-back

- 1 real Auth user present, **email confirmed**, password-based, and has completed sign-in.
- Previously, 1 user had no matching `public.profiles` row.
- After migration: 1 user, 1 profile, 0 missing profiles, 0 reviewer/admin roles.
- Trigger `monsoonroute_on_auth_user_created` is enabled for future registrations.
- Profile function is in the private schema, uses a restricted security-definer context and schema-qualified insert, revokes direct execution for browser roles.
- No user was promoted to moderator/admin; no identity, email, credential, or private profile data is committed to source.

The backend's private report workflow still requires a published road graph and protected server-only service credentials; account creation is not equivalent to photo or routing E2E acceptance.
