# MonsoonRoute — verified release gate status (11 October 2026, evening IST)

These are real current observations, not acceptance inferred from source existence. Scope: Karan repository `KaranYadav-CS/MonsoonRoute`, Vercel project `monsoon-route`, Supabase `ihvsazbjhlpylnfeakao`, AWS `043063712559` / Mumbai.

| Gate | Current status |
| --- | --- |
| Next.js production pages, real OSM map, Open-Meteo preview | VERIFIED_LIVE |
| Responsive header / Plan / Report / Analyze navigation | VERIFIED_TEST — Playwright browser checks |
| Supabase email/password login | VERIFIED_PARTIAL — 1 confirmed password user with actual sign-in; full reset and owner identity not independently tested |
| Provisional road-observation intake | VERIFIED_LIVE — real non-test observation recorded |
| Provisional road-observation owner isolation | VERIFIED_TEST — simulated authenticated insert succeeded in a rolled-back transaction; anonymous and cross-user insert denied |
| Provisional private photo storage | IMPLEMENTED_UNVERIFIED — RLS-controlled private `report-photos` bucket, sanitized client upload; actual photo upload and review not tested |
| Owner withdrawal/private image deletion | IMPLEMENTED_UNVERIFIED — RLS DELETE migration and UI; no full authenticated browser withdrawal run |
| Reviewer triage | IMPLEMENTED_UNVERIFIED — reviewer-only permissions and status-changing guard; zero authorized reviewer roles; no review event verified |
| Published independently reviewed Delhi road graph | MISSING — zero published graphs; synthetic route mode labeled |
| Published DB-backed gridded weather with evidence snapshots | MISSING — zero published weather runs |
| Live safe-route comparison, approved closures and rerouting | DISABLED / NOT VERIFIED — never substitute synthetic graph |
| AWS ONNX and processor hashes / private S3 | VERIFIED_LIVE — SHA-256 pinned and private storage |
| Private image-scene Lambda inference | VERIFIED_LIVE — actual bounded image prefix and synthetic S3 → Lambda prediction, uncalibrated |
| Vercel production → AWS OIDC | VERIFIED_LIVE via strict-claim zero-permission probe; production analysis role scoped |
| Authenticated browser image upload → AWS Lambda → UI | GATED — production `AWS_ANALYSIS_ENABLED=false`; tool safety check blocked enabling; real user image path not accepted as working |
| Public repository eligibility/secrets audit | OWNER_ACTION — repository currently private |
| Signed-out YouTube demo under three minutes and event submission receipt | OWNER_ACTION — not verified |

## Three security and functional tests executed

1. **Database authorized insertion:** authenticated-role transaction inserted one observation; rollback left zero persisted test rows.
2. **Database anonymous rejection:** direct anonymous INSERT was denied with `42501`.
3. **Database forged-owner rejection:** mismatched owner UUID rejected with `PILOT_OWNER_DENIED`.

Separately: real Supabase user successfully submitted an observation, and IAM-private AWS Lambda classified a deterministic S3 image under the new temporary analysis prefix. The latter does **not** validate real flood detection, accuracy, real road passability, or user-upload performance.

## Remaining owner and release actions

- **Image analysis flag:** Enable only after the project owner reviews Vercel Production `AWS_ANALYSIS_ENABLED` and the scoped role `monsoonroute-vercel-private-analysis`; manual enabled-state and a genuine confirmed-user photo upload test are necessary. An attempted connector update was blocked by platform safety checks; do not claim success or bypass them. All images are advisory only.
- **Human reviewer:** Verify an exact owner-designated moderator account before adding any `private.user_roles` entry. Do not auto-promote the first Supabase signup.
- **Road routing:** Acquire and QA licensed, turn-correct, traversable OSM road graph + terrain + weather runs; publish an immutable graph, test all safety/exclusion invariants, and only then enable live recommendations.
- **Retention:** Pending observations have three-hour evidence validity. Automatic purge of expired Supabase Storage photo objects has not passed acceptance; user-initiated withdrawal can remove a private image.
- **Submission:** Inspect full Git history for secrets/provenance and legitimate organizer eligibility; publicize eligible repository only after owner verification. Record real AWS demo and YouTube playback (under three minutes), then submit in the signed-in event portal before the deadline.

Neither Docker nor a GPU is required to run the verified Python ONNX Lambda: the existing serverless ZIP deployment has executed successfully. Adding Docker without a tested requirement would add operational risk and delay.

**Links:** [Live app](https://monsoon-route-omega.vercel.app/) · [Report](https://monsoon-route-omega.vercel.app/report) · [Experimental image analysis](https://monsoon-route-omega.vercel.app/analyze) · [GitHub code](https://github.com/KaranYadav-CS/MonsoonRoute)

**Never claim:** human-approved road closures, working live risk-aware navigation, calibrated model accuracy, public submission, or end-to-end user image analysis without actual evidence.
