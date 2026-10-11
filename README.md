# MonsoonRoute

**Evidence-aware monsoon route research for Central Delhi** · [Live web app](https://monsoon-route-omega.vercel.app/) · [Map and live rainfall preview](https://monsoon-route-omega.vercel.app/plan)

MonsoonRoute explores relative road-waterlogging evidence without claiming to predict measured water depth or guarantee safety. The live app displays **real OpenStreetMap-based streets** and a timestamped **nine-cell Open-Meteo precipitation preview**. The routing engine also has a clearly opt-in **synthetic educational comparison**, which must not be used for navigation.

> **Release boundary (11 October 2026):** The public site is deployed and GitHub CI/Chromium navigation tests pass. A private AWS Lambda successfully loaded the pinned ONNX flood image classifier and classified a synthetic image in a private S3-to-Lambda smoke test. **Production road-level flood routing, verified authenticated photo processing, approved human moderation and independent real-world model accuracy have not passed end-to-end acceptance.** The real-route button remains gated and no synthetic route is silently presented as authentic Delhi guidance.

## Live features and evidence

| Feature | Verified status |
| --- | --- |
| Vercel Next.js web app | Deployed at the URL above; current main build verified through Vercel |
| Main navigation and mobile menu | Click-through tested in GitHub-hosted Chromium |
| Supabase email/password UI | Sign-up, login, reset, account, session-sensitive navigation implemented; one real password account with confirmed email/sign-in verified, but owner identity and reset flow remain unverified |
| Central Delhi basemap | Real OSM-derived vector basemap using MapLibre/OpenFreeMap; real point selection |
| Nine-cell rainfall preview | Live Open-Meteo API; model estimates only, not measured water depth |
| Synthetic route exploration | Explicit opt-in only; never usable for travel guidance |
| Production flood-risk routing | **Not available** until audited and published graph/terrain/weather/review data |
| Provisional road observation intake | **Live and database-verified**. Actual one user observation recorded with map point; private owner RLS, rate limits and an optional sanitized photo upload path are implemented. This evidence is unmatched, unverified and never used for road closures. The complete real-user photo upload remains untested. |\n| Human review of provisional observations | Reviewer-only queue and decision guard are implemented; no moderator has been authorized yet, so no human triage has been completed. |\n| User-facing experimental AI analysis | Authenticated private S3-to-Lambda adapter and UI implemented; **production feature flag disabled** due an account/tool safety block. The private Lambda smoke has passed, but full user upload/result is not verified. |
| Flood image model artifact | 343,342,041-byte ONNX model pinned to immutable upstream revision and uploaded to private encrypted AWS S3, checksum verified |
| Private AWS model inference | Python 3.12 Lambda `monsoonroute-private-model-inference` in Mumbai, successful controlled private image smoke; **synthetic test only, not a field benchmark** |
| CI | Node/Python checks and real-map Chromium navigation tests; see GitHub Actions |

### What users can do today

Open the [live planner](https://monsoon-route-omega.vercel.app/plan), choose origin and destination by clicking the actual street map, and inspect timestamped gridded rainfall estimates. Real flood-route recommendations remain unavailable until data-quality acceptance. Optional synthetic exercise is clearly labeled.

Authenticated users can create provisional [road observations](https://monsoon-route-omega.vercel.app/report) tied to a real street-map coordinate. These reports do not require a fabricated road-edge ID and do not automatically influence the router. Optional photo upload is private, but a full real-user photo upload-and-review has not yet been verified.\n\nUsers can access [email login](https://monsoon-route-omega.vercel.app/auth/login), [sign-up](https://monsoon-route-omega.vercel.app/auth/signup) and [password recovery](https://monsoon-route-omega.vercel.app/auth/forgot-password). Before inviting real users, the owner must verify Supabase Auth URL settings, confirmation delivery, and the complete real account session.

## Technical architecture

- **Frontend**: Next.js 16 App Router, TypeScript, React, MapLibre GL JS, OpenStreetMap-derived OpenFreeMap tiles. Accessibility includes skip link, keyboard inputs and responsive navigation.
- **Public weather display**: Nine-cell Open-Meteo precipitation, bounded provider validation, source labels and explicit no-flood-safety claims.
- **Data and accounts**: Supabase PostgreSQL/PostGIS, email-password Supabase Auth, owner/reviewer RLS and private `report-photos` bucket. A new `pilot_observations` intake holds real-map, rate-limited submissions independently of the still-unpublished routing graph. Verified 3 SQL permission cases including rollback test: authorized insert, anonymous denial, forged-owner denial. Photos are re-encoded before private storage; automatic expired-photo deletion is **not verified**.
- **Risk/routing research core**: Deterministic directed-road graph algorithm, turn restrictions, closure exclusion, relative-risk scoring and detour budget; separate synthetic tests do **not** establish real Delhi performance.
- **AWS inference**: Strict per-project Vercel → AWS OIDC subject was verified with short-lived credentials; the experimental production execution role has narrowly scoped S3 and Lambda grants, but public invocation remains disabled. Private S3 `monsoonroute-prod-artifacts-043063712559-ap-south-1`, content-addressed model SHA-256, AWS CodeBuild controlled export, IAM-only Lambda invocation, CloudWatch logs. No public inference URL or report-job event mapping.
- **AWS groundwork**: Private encrypted SQS+DLQ and alarms prepared; actual report queue-to-model-to-Supabase reviewer integration remains disabled.

### Model provenance and safety

Source: [prithivMLmods/Flood-Image-Detection](https://huggingface.co/prithivMLmods/Flood-Image-Detection), pinned Git revision `1fb5408d3b778c92c79b3a7894517ce794ad21f7`. The source specifies 224×224 RGB bilinear preprocessing. ONNX SHA-256: `2517f3dfb5d82dc21a0729733fff7756eaca0b4b22026d153189501169a84d76`. The experiment has numerical parity checks, but **no controlled Delhi-held-out accuracy, precision, recall, F1, calibration or false-guidance evaluation**. Scores are uncalibrated; human reviewers alone can approve reports or closures.

## Run and validate locally

Prerequisites: Node.js 22, Python 3.12, your own approved environment settings (copy `.env.example` to `.env.local`; do not commit secrets).

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npx playwright test tests/e2e/map-basemap.spec.ts
```

Run `npm run dev` to develop locally. Backend credentials and published road data are deliberately **not** bundled; do not bypass disabled gates or use fabricated user IDs.

## Hackathon demonstration and responsible disclosure

Read [Submission write-up](docs/submission/WRITEUP.md), [Live-demo recording guide](docs/submission/DEMO_RECORDING_GUIDE.md) and [Release gate status](docs/submission/RELEASE_STATUS_2026-10-11.md). The actual hackathon submission requires a **public** eligible repository, organizer sign-in, a public/unlisted YouTube demonstration under three minutes, a truthful write-up, and a submission receipt. Current repository publication and submission must be verified by the owner; no award is guaranteed.

**Credits:** OpenStreetMap contributors (ODbL), OpenFreeMap/OpenMapTiles (applicable tile attribution/terms), Open-Meteo (provider terms), public Hugging Face classifier and upstream author, MapLibre, Supabase, Vercel, AWS, Node/Python libraries, historical repository contributors (including `segrasevanon`), and AI-assisted engineering where used. License/redistribution review remains essential before public source publication.

## Explicit limitations

The UI is a research/pilot decision aid: not emergency response, not turn-by-turn navigation, not validated real-time flood detection, and not a guarantee a road is passable. Never enter or drive through floodwater based on this application.
