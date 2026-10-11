# P4 local development, worker packaging and P5 release gates

## Safe offline evaluation (requires Python only)

1. `python scripts/generate_fixture.py` regenerates the invented graph and synthetic rainfall JSON, with deterministic SHA-256 receipt.
2. `python -m http.server 8000` from repository root. Open `http://localhost:8000/demo/` on your own computer. The demo is purely educational and does not require credentials.
3. Optionally use `python scripts/verify_demo_browser.py` for isolated desktop/mobile Chromium regression; requires Python Playwright and Chromium, and uses mock local fixture responses because the test sandbox blocks browser localhost navigation.
4. Run `npm test`, `python -m unittest discover -s tests/integration -v`, `python scripts/package_workers.py`, `python infra/aws/validate.py`, `python scripts/check_artifacts.py`.

## Complete Next.js installation and semantic verification

Install Node 22, npm, an authenticated reviewed package source. The exact package versions are pinned in `package.json` but **package-lock.json could not be generated in this execution environment**. On an approved networked build host run `npm install --package-lock-only && npm ci`, review the resulting lockfile for dependencies/vulnerabilities, then run `npm run lint && npm run typecheck && npm test && npm run build`. Add `npm run check:browser` for optional UI smoke (Python dependency). Do not mark a CI release green without these commands succeeding in the actual source tree.

Configure `.env.local` securely from `.env.example`. Do **not** copy AWS root credentials, service-role tokens or HMAC secrets into NEXT_PUBLIC variables, GitHub source, logs, screenshots or artifacts. The existing P2 Vercel Git link targets the wrong historical repository name; reconnect only using Karan-controlled authenticated access. Hosted OAuth and reviewer/admin login require Karan-controlled GitHub OAuth configuration; do not manufacture user identity or provider secrets.

## Reviewed-source graph and weather/model preparation

1. Acquire licensed OSM XML and DEM raster file through verified source terms. Record immutable source paths/checksums/time and ODbL attribution in a reviewed provenance manifest. `scripts/build_graph.py` and `scripts/build_terrain.py` compile locally; run validation/tests and inspect output. Do not present this as a safety-certified urban flood map.
2. Review and run `scripts/import_graph.py` to produce a transaction SQL plan for P5; check against the 20261010162239 P3 migration. DO NOT auto-execute or publish unreviewed graph data or swap existing city version.
3. AWS Lambda handler source is packaged under each `services/*/build/` via `python scripts/package_workers.py`. Review dependency packaging, SAM template, build costs, native runtime/arch, IAM conditions and actual credentials. Do not activate EventBridge/SQS triggers before a separate P5 sandbox test.
4. Weather worker requires actual Open-Meteo responses, source license, nine accepted cells, S3 archive HEAD/digest and an atomic `publish_weather_run` RPC. Failure must not publish partial evidence; no live provider tests are claimed.
5. `models/export.py` requires owner-reviewed pinned snapshot safetensors/config/processor and locally installed torch, transformers, ONNX, onnxruntime; it refuses unsupported preprocessing or parity mismatch. No model weights, artifacts, inference evaluation or real Lambda benchmark are shipped. Manual review remains the safe fallback.
6. P5 must complete real owner/reviewer auth, HTTP route/report/withdraw/closure rights, S3 signed photo upload, quota denial, queued/retried worker claims, model parity and stale-weather abstention under cloud credentials, then measurable error/latency/cost/rollback checks.

## Stop condition

`python scripts/release_doctor.py` deliberately fails while authentic graph/model/OAuth/Git/lock/cloud checks are outstanding. Synthetic UI/browser successes prove only educational functionality. Never enable unattended schedules, represent generated rainfall as live, or deploy before real backend end-to-end tests and owner signoff.
