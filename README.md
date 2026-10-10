# MonsoonRoute — self-authored P4 source repository

**Source status:** Full, original codebase produced offline for MonsoonRoute P4; **not a deployed production release**. No legacy GitHub page, media asset, or checked-out source is required by the new implementation. This repository is intentionally a replacement source tree for review and local development, not a binary copy of `KaranYadav-CS/MonsoonRoute`. No files have been pushed, committed remotely, or deployed as part of this P4 iteration.

## Fastest working demonstration — no dependencies

Run from the repository root:

```bash
python scripts/generate_fixture.py
python -m http.server 8000
# Open http://localhost:8000/demo/
```

The `/demo/` folder is a standalone, real interactive responsive browser interface. It shares the same pure TypeScript routing algorithm (compiled into `demo/engine.mjs`). It does not require npm, a Google/Mapbox API key, internet, Supabase, Vercel, AWS, GPS, or a paid service. It depicts a **fabricated** street network and weather snapshot solely to demonstrate routing and uncertainty logic. **DO NOT USE IT TO NAVIGATE OR MAKE REAL FLOOD SAFETY DECISIONS.**

Regenerate the browser ESM after changing the source routing engine with `npm run demo:build` once Node dependencies are installed (or `USE_GLOBAL_TYPESCRIPT=1 node scripts/build_offline_demo.mjs` in the audited current build environment). The committed ESM is included so the demo opens immediately.

## Next.js product application (requires npm installation)

Requires Node.js 22, a verified npm registry, PostgreSQL/Supabase service and approved server-only environment variables.

```bash
cp .env.example .env.local             # set approved keys privately; do not publish
npm install --package-lock-only        # generate the previously unavailable lockfile
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

Use `http://localhost:3000` for the Next.js UI. Its pages include landing, route planning, observation reporting, review, history, report details and methodology. The `/plan` route also supports a visibly labeled synthetic demonstration. Live routes and real report submission fail closed while their required backend graph/OAuth/worker contracts are unavailable.

**IMPORTANT:** This offline environment could not reach the npm registry (`ENOTCACHED`/DNS). Therefore there is **no genuine package-lock.json**, and full Next.js build, ESLint, TypeScript semantic checking, Playwright Next E2E and dependency audit have **not** passed here. No fabricated lockfile or green CI outcome is included.

## Independent quality checks that ran offline

```bash
npm test                                   # 31 of 31 Node tests passed
python -m unittest discover -s tests/integration -v    # 21 of 21 Python tests passed
python scripts/package_workers.py
python infra/aws/validate.py
python scripts/check_artifacts.py
python scripts/verify_demo_browser.py    # optional Chromium + Python Playwright
python scripts/release_doctor.py         # intentionally exits 2, missing real production artifacts
```

The optional Chromium test passed at desktop and mobile resolutions using locally injected static JSON and the same browser JS (no blocked external requests or live claims). Screenshot evidence is in `docs/p4-ui-1440.png` and `docs/p4-ui-390.png`.

## Data and service architecture

- `app/`, `components/`: Next.js App Router pages and responsive accessible UI components; `app/api/v1/`: strict server APIs.
- `packages/engine/`: bounded turn-aware directed-graph risk comparison with closure and weather freshness abstention.
- `packages/contracts/`: typed HTTP/validation schemas; `lib/server/`: service-only DB, authorization, quotas and report lifecycle.
- `scripts/generate_fixture.py`, `demo/`: original, deterministic **synthetic** routing exercise.
- `scripts/build_graph.py`, `scripts/build_terrain.py`, `scripts/import_graph.py`: reviewed-source OSM/DEM compilation, verification and import SQL generation. No live Delhi graph, DEM tile or real road data is bundled.
- `services/weather/`, `services/vision/`, `services/maintenance/`: actual code for bounded weather ingest/archive/publish, lease-protected image pipeline and maintenance; packaged SAM Lambda builds are under each `build/`. Activation is intentionally deferred.
- `models/export.py`, `models/parity.py`: owner-reviewed model snapshot to ONNX export and numerical parity gating; **no model weights/validated ONNX runtime** in the ZIP.
- `supabase/`: canonical applied P3 migration SQL and seed; do not reapply migration to Karan's project without checking existing history.
- `infra/aws/`: foundation/SAM infrastructure, IAM contracts, safety policies, budgets and validators. **No P4 cloud write or deploy**.
- `.github/workflows`: proposed CI and release workflows for use **only after** review, npm lock generation, Git provenance/secret check and owner authorization.

Read `docs/execution/04-github-code-and-ci.md`, `docs/implementation-matrix.md`, `docs/runbook.md`, `.state/p4.json`, and `docs/verification.json` before staging P5.

## Security and claim boundary

The live Supabase P3 project has schema/RLS/seed installed, but **no reviewed published real street graph**, and hosted OAuth is still pending. AWS functions/schedules/vision are disabled until actual P5 integration tests succeed. Exact source/model licenses, data freshness, reviewer identities, actual traffic/field measurements and end-to-end correctness are **not established**. All relative-risk values in the synthetic demo are hypothetical and must never be presented as Delhi flood measurements, guaranteed safety or validated model accuracy.

**Provenance:** The online repository's 2026-10-10 baseline was `35d0e21c2004254f40522c9e24dacf8a36792534`, with historical commits attributed to `segrasevanon`. This ZIP does not incorporate its binary media or reattribute that person's commits. When integrating source in a real Git repository, preserve and separately review existing contributor/asset provenance. See `docs/THIRD_PARTY_NOTICES.md`.
