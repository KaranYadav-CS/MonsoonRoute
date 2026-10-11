# MonsoonRoute — UI Transplant and Verification Report

**Date:** 11 October 2026 (IST)  
**Deliverable:** `Monsoon Road Final.zip`  
**Original functional archive actually supplied:** `MonsoonRoute-main (1).zip` (root `MonsoonRoute-main/`).  
**Visual reference:** `UI.zip` (root `Monsoon/`).

## 1. Implementation decision

This is a **visual transplant** into the original Next.js/React application. The HTML-only UI reference is not used as the router, server, authentication system, map engine, API implementation, data layer, or source of claims. All pre-existing page and API route files retain their paths. The UI archive's `.git/`, `.env.local`, duplicate asset directories, mock-data scripts and stand-alone HTML pages were **not** copied.

An intentional difference from `UI.zip`: the reference designs advertise unverified predicted water depth, hard-coded emergency data, dummy user names, fictional incidents, and unsupported alternative pages. Those were **not** transplanted as data or functional controls. The real pilot app's evidence and backend behavior remain authoritative.

## 2. Route-to-design mapping

| Original application route | Source design in UI.zip | Result |
| --- | --- | --- |
| `/` | Landing Page | Recreated photo hero, dark overlaid header, blue CTAs, capability ribbon, image cards, solution steps, forecast preview, conclusion. Live `WeatherPreview` API client retained. |
| `/plan` | User Interface/Routes + Map + Dashboard | Blue/slate workspace, persistent dark navigation sidebar, card-based location selection, map and route cards. Original `RoutePlanner`, `LiveMap`, `RouteCards`, `EvidenceSheet` untouched. |
| `/report` | User Interface/Report | Bright white report surface, information side rail, instructional image. Original `RoadReportForm` including private upload and review API flow untouched. |
| `/analyze` | Report + Dashboard UI system | Matching photo upload and advisory panels; original private analysis API unchanged. |
| `/review` | Dashboard + Profile UI system | Matching reviewer panels, same authorization checks and review workflows. |
| `/history` | Profile UI system | Matching private history panel and real deletion control. |
| `/account` | Profile UI system | Matching account page; original identity and session actions untouched. |
| `/auth/login` | Login Page | Split photo/gradient promo + real Supabase email/password login. |
| `/auth/signup` | Signup Page | Split photo/gradient promo + real Supabase signup/verification. |
| `/auth/forgot-password`, `/auth/update-password` | Login Page password-recovery visual system | Shared authentication presentation; original reset/update API behavior preserved. |
| `/methodology`, `/reports/[id]` | Landing + Report supporting visual styles | Same original content, URLs and evidence/status workflows; shared design system. |
| `/auth/callback`, `/auth/logout` | Not applicable | Server/auth routes preserved exactly. |
| All `/api/v1/**` | Not applicable | All original API routes and their implementations retained byte-for-byte. |

The UI reference's separate **Emergency** and **Map** URLs were not introduced because they do not exist as corresponding production routes. `/plan` remains the original map/planner destination.

## 3. Source preservation and wiring

- Original page and API path inventory: **36/36 paths preserved**, compared mechanically with the input archive.
- Backend/workflow files protected by SHA-256: **113/113 byte-identical** across `app/api`, `app/auth` callback/logout handlers, `lib`, `packages`, `services`, `infra`, `supabase`, and original functional components. See `docs/ui-transplant-baseline.json` and `tests/unit/ui-transplant.test.mjs`.
- The original database migrations, Supabase access policies, authenticated report/photo submission handler, review guards, AWS/S3/Lambda integration, model artifacts, Next.js config, Vercel config and CI definitions were not replaced with reference UI mockups.
- Landing and navigation action links point to real original routes. The header uses a working mobile toggle, route-aware active state, original session-aware account link, a workspace quick-action/search-shaped link to the real planner, and real navigation (Next.js `Link`). No nonfunctional search form, simulated traffic counter, synthetic alert feed, dummy identities, Google/Apple OAuth buttons, or pretend route-calculation button was added.
- The reference includes capabilities that the production release has not actually enabled: these remain gated by existing backend features, rather than becoming fabricated UI success states.

## 4. Assets and responsive behavior

- Transferred **22 WebP assets**, optimized once into `public/ui/`. No redundant per-page copies.
- Transferred assets total approximately **1.91 MiB** (original UI archive: ~40.64 MiB compressed, mostly duplicated assets and Git objects). Existing production `public/pilot/` assets are retained.
- Sidebar-inspired desktop UI and mobile drawer; homepage responsive navigation; split-screen auth that collapses to a single-column layout; adaptive planner/report cards; accessible focus outlines; keyboard-operated menus; reduced-motion CSS.
- Responsive styles were implemented for the page shell at **1100, 970, 780, 650 and 385 px**. These are implemented breakpoints, **not** evidence of tested visual behavior on every device.

## 5. Verification executed locally

| Check | Result | Scope |
| --- | --- | --- |
| New route-structure contract | **PASS** | Original page and API path inventory exactly preserved |
| Backend integrity contract | **PASS** | SHA-256 of all 113 designated functional source files |
| Reference containment/navigation/assets contract | **PASS** | No HTML UI router, original links, optimized files exist, reduced-motion CSS |
| Node unit and security suite | **PASS: 240/240** | Original 234 tests plus 6 transplant regressions |
| Python worker/integration tests | **PASS: 22/22** | Existing tests only; no new live AWS acceptance tests |
| `npm run check:syntax` | **PASS** | TypeScript/TSX parsing; not semantic type-checking |
| `npm run check:artifacts` | **PASS** | Existing artifact checker |
| `python scripts/check_source_boundaries.py` | **PASS** | Existing source authorization-boundary check |
| CSS parsing and transferred-asset files | **PASS** | 367 parse rules, 0 top-level CSS parse errors; all image URLs resolved locally |
| `npm ci` / Next.js build / lint / typecheck | **NOT COMPLETED** | npm registry DNS unavailable; dependencies could not be installed |
| Playwright visual/e2e regression and screenshot diff | **NOT COMPLETED** | No bootable Next.js runtime in this sandbox; headless Chromium also timed out |
| Live AWS, Supabase and Vercel round trips | **NOT COMPLETED** | No production credentials/configuration copied into the archive or exercised from this sandbox |

**Critical:** Passing the original unit tests and preserved-source hash checks does not establish successful production deployment, cross-device pixel fidelity, or live remote integration health.

## 6. Existing non-UI backend release gates

The supplied document `docs/submission/RELEASE_STATUS_2026-10-11.md` records these caveats at the archive's release snapshot:

- An independently reviewed, published Delhi road graph and weather evidence runs were missing; live route recommendation remained gated. The synthetic scenario must remain clearly labeled.
- Authenticated browser photo-to-AWS analysis was gated by the production `AWS_ANALYSIS_ENABLED` flag; the existing Lambda model had been separately tested, not the complete user upload path.
- A production-authorized reviewer account and full photo/review acceptance flow were unverified.
- The current code still needs infrastructure/credentials, end-to-end run evidence, and owner-approved releases for any disabled features.

**None of these backend gates were removed or bypassed by a styling change.** This final ZIP is an updated code artifact, not a proof of production readiness.

## 7. Required release validation on a connected workstation

1. Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test`, and `npm run check:python` with Node 22.
2. Run Playwright e2e against the updated local Next.js instance, test `/`, `/plan`, `/report`, `/analyze`, `/review`, `/history`, `/account`, `/auth/login` and `/auth/signup` on representative 390 px, 768 px, 1024 px and 1440 px viewports, checking interactive controls and page overflow.
3. Visually compare each corresponding page to `UI.zip` while preserving the original application's data sources and page architecture.
4. Test logged-out and logged-in behavior, report create/finalize/private photo, owner isolation, reviewer authorization, profile, history, map data loading and route planning against authorized nonproduction infrastructure.
5. Independently verify AWS processing, Supabase RLS and storage policies, allowed file types, credential scope, deployed Vercel environment variables, data-retention jobs and production rollout/rollback plan.
6. Verify/enable backend features **only** after their existing security and release gates pass. Do not create fictional predictions, closure approvals, emergency dispatch capabilities, or guarantees of passability.

## 8. Non-goals

No external deployment was performed. No backend schema or authorization permissions were changed, and no live data or missing road graph was synthesized. No extra UI reference pages were added. Full feature enablement and an absolute pixel-perfect claim are **not** warranted by the checks completed here.
