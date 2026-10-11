# Production and submission gate report — 11 October 2026

| Gate | Current verification |
|---|---|
| Latest live frontend, map, rainfall | VERIFIED_LIVE |
| Header navigation desktop/mobile | VERIFIED_TEST (Playwright) |
| Supabase email/password screens | IMPLEMENTED; real sign-up/confirmation/reset not yet verified |
| Supabase legitimate owner/admin login | OWNER_ACTION; user count zero at last inspection |
| Real licensed OSM graph, terrain publication | BLOCKED; active graph missing |
| Real road-safe route comparison | BLOCKED; disabled until graph and weather evidence |
| Real weather API preview | VERIFIED_LIVE; database weather publication missing |
| Upload of pinned ONNX model to AWS S3 | VERIFIED_LIVE; SHA-256 matched |
| Private Lambda model inference from S3 synthetic input | VERIFIED_LIVE (experiment); no field accuracy |
| Live signed-in user report/photo/reviewer/closure/re-route | NOT VERIFIED / GRAPH AND CREDENTIALS MISSING |
| Public GitHub repository and provenance/secret audit | OWNER_ACTION; private working repo must not be published blindly |
| YouTube <=3 min signed-out playable demo | OWNER_ACTION; not yet provided |
| WeMakeDevs submission receipt | OWNER_ACTION; not yet provided |

**Mandatory external actions for final release:** Configure Supabase Auth email sender and redirects; test a real owner-verified account; set server-only Supabase credential through Vercel secure environment (never `NEXT_PUBLIC_*`); import reviewed graph and weather archive; authorize reviewer; run photo and route E2E security tests. Never claim these gates passed without evidence.

**Event deadline:** The organizer's October 6 announcement confirms Sunday October 11, **8:00 PM IST**. Link: https://www.wemakedevs.org/blogs/what-is-happening-in-delhi-on-10-october . Submit before that time; final availability is controlled by the signed-in form: https://www.wemakedevs.org/aws/env/submit .

**Account fence:** All work belongs to KaranYadav-CS/MonsoonRoute, Karan's Supabase project `ihvsazbjhlpylnfeakao`, Vercel project `prj_3uLX8OEn0McITvMrv1Y1G1WpuX1w`, and AWS account `043063712559` in `ap-south-1`. Do not publish private execution handoff, AWS account emails or secret values.
