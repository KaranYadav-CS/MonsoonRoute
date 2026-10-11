# P5 security verification

AWS: project account 043063712559; new S3 all four public access blocks true, SSE-S3 AES256, versioning, TLS-only denial; both SQS SSE, DLQ configured maxReceiveCount=3, live canary moved and deleted; two alarms OK. Control-plane plugin currently root assumed and is bootstrap-only, not an acceptable runtime identity. No worker functions or schedules.

Supabase: all 18 public app tables have RLS, role-restricted service RPCs from P3, no signed-in users yet to prove cross-user denial; private storage present. Security advisor reports INFO-only no-policy notices (intentional deny default). Never loosen RLS to silence notices. Audit https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy .

Owner-only requirements: GitHub OAuth client, real Karan login and admin identity; Supabase service-only credential installed directly in protected Vercel env and AWS Secrets Manager; new HMAC keys; least privilege GitHub/Vercel OIDC STS roles tested. No current live proof for those gates.
