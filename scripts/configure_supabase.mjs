#!/usr/bin/env node
// Explicit opt-in hosted configuration. No secrets printed. Node 22+.
const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
const id = process.env.GITHUB_OAUTH_CLIENT_ID;
const secret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
const app = process.env.APP_URL;
const execute = process.argv.includes('--execute');
if (!/^[a-z]{20}$/.test(ref || '') || !/^https:\/\/[-a-z0-9.]+$/.test(app || '')) {
  console.error('Invalid project ref or APP_URL'); process.exit(2);
}
if (ref !== 'ihvsazbjhlpylnfeakao' || app !== 'https://monsoon-route-omega.vercel.app') {
  console.error('Target does not match approved Karan-owned production project'); process.exit(2);
}
if (!execute) {
  console.log('DRY RUN: hosted Auth/PostgREST configuration requires --execute and provider credentials; no request sent.');
  process.exit(0);
}
if (![token,id,secret].every(Boolean)) {
  console.error('Missing Management API token or GitHub OAuth credentials'); process.exit(2);
}
const auth = {
  site_url: app, uri_allow_list: `${app}/auth/callback`,
  disable_signup: false, jwt_exp: 900,
  external_github_enabled: true, external_github_client_id: id,
  external_github_secret: secret,
  external_email_enabled: false, external_phone_enabled: false,
  external_anonymous_users_enabled: false,
};
const url = `https://api.supabase.com/v1/projects/${ref}`;
async function patch(endpoint, body) {
  const res = await fetch(url+endpoint,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
  if (!res.ok) {console.error(`${endpoint} failed (HTTP ${res.status}); response intentionally suppressed`);process.exit(1);}
  console.log(`${endpoint}: accepted HTTP ${res.status}; secret-bearing response suppressed`);
}
await patch('/config/auth',auth);
await patch('/postgrest',{db_schema:'public',db_extra_search_path:'public,extensions',max_rows:2000});
console.log('Verify redacted hosted settings and complete real GitHub OAuth callback smoke test before sign-off.');
