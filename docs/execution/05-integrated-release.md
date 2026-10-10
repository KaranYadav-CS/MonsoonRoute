# P5 integrated release — verified partial checkpoint (2026-10-11)

Status: **PARTIAL, NOT FULLY VERIFIED**. Scope KaranYadav-CS/MonsoonRoute, AWS 043063712559/ap-south-1, Supabase ihvsazbjhlpylnfeakao, Vercel prj_3uLX8OEn0McITvMrv1Y1G1WpuX1w.

**Live verified:** Vercel homepage publicly accessible; last proven READY app commit 8bf6006f; Supabase healthy with 18 RLS application tables, 0 graphs/edges/weather runs/users; inactive P5 AWS CloudFormation stack CREATE_COMPLETE, private encrypted S3, encrypted SQS+DLQ, 2 alarms, no Lambda/schedules; actual SQS message received 3x, redriven to DLQ and deleted. AWS budget USD25, email alerts 10/20/25 actual and 25 forecast. P5 CI generated genuine 319083-byte package-lock.json and pinned it on main.

**Blockers:** Karan's OAuth App/hosted Supabase Auth and actual sign-in; server-only Supabase and rate-limit keys, IAM OIDC role assumption and Secrets Manager; reviewed Central Delhi graph, terrain, weather archive and atomic publication; ONNX model/CPU Lambda validation or manual fallback; real photo → reviewer → closure → reroute smoke and cross-user denial; public repo, actual AWS video and submission receipt.

All runtime flags remain disabled. No synthetic graph or hypothetical rain is labeled live. Read docs/deployment-receipt.md, docs/security-verification.md, docs/model-evaluation.md, docs/submission.md. These are truthful gap receipts, not acceptance passes.
