# Current client UX readiness — 2026-10-11

## Changes in this delivery

- Site nav moved to accessible route-aware client header with clear selected link, working hamburger menu at <=850px, Supabase email/password login entry.
- Standard Supabase Auth signUp/signInWithPassword/resetPasswordForEmail/updateUser flows added. No GitHub OAuth login is used by the client. Confirmation and reset use /auth/callback with SSR PKCE session exchange; valid redirect destinations are allowlisted.
- Report page routes unauthenticated users to email login/sign-up, not GitHub login.
- Planner defaults to **real OSM basemap** and hides technical coordinates in an expandable disclosure, with map click selecting locations. Synthetic exercises are opt-in, never presented as a real route.
- Planner checks verified /api/v1/config availability. Until a reviewed graph is published, its live route comparison is disabled and a safety limitation displayed. Educator synthetic mode remains optional for testing.
- Actual supplied model / private AWS Lambda inference is verified in docs/execution/07-private-lambda-inference.md. It is NOT connected to the end-user report workflow; nor is the model independently validated for Delhi road flooding.

## Owner-required acceptance

Hosted Supabase project: https://supabase.com/dashboard/project/ihvsazbjhlpylnfeakao

1. Auth -> Providers -> Email: enable email/password + email confirmations, secure email sender/SMTP appropriate for production; verify rate limits.
2. Auth -> URL Configuration: Site URL https://monsoon-route-omega.vercel.app ; redirect allowlist must include https://monsoon-route-omega.vercel.app/auth/callback and https://monsoon-route-omega.vercel.app/auth/callback?next=** as needed (prefer minimal exact URLs).
3. Perform a real authorized sign-up, receive confirmation, sign in, password reset, sign out. Do not fabricate identities or bypass email verification. Browser client uses public Supabase publishable key only.
4. Live user-reports require a published licensed Delhi road graph, real edge IDs and owner-verified service key. Current active graph is null and production server-only service key absent. Do not enable photo uploads or automated road guidance before these gates.
5. Reviewer must be assigned after legitimate owner authorization; never auto-promote first registered account.

No claim that a production email was delivered or full route/video/submission was achieved without live evidence.
