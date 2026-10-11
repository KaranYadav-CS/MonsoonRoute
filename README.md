# MonsoonRoute

[Production application](https://monsoon-route-omega.vercel.app) · Central Delhi car-routing pilot

MonsoonRoute compares legal routes using a real, published OpenStreetMap graph, Copernicus terrain factors, captured Open-Meteo rainfall, and human-reviewed observations. The relative index is not flood probability, water depth or safety certification.

## Release verified on 11 October 2026

- Real graph: 10,200 nodes, 20,434 directed edges, five imported turn restrictions and twenty named junctions. Supported area: 77.200–77.240 E, 28.610–28.650 N.
- MapLibre streets and endpoint markers render in Edge. A versioned, same-origin worker fixes the blank-map failure. Default coordinate validation no longer blocks route submission.
- AWS weather ingestion captured 648 hourly frames across nine cells and archived the source response in encrypted S3. Refresh runs every fifteen minutes.
- Supabase email/password authentication is the owner's selected method. The explicitly confirmed owner account has audited administrator/reviewer access. Photos use private owner-scoped storage and short-lived reviewer links.
- AWS ONNX inference loads the checksum-pinned model with its actual 224-pixel preprocessing. Both class scores are advisory and uncalibrated; inference cannot approve reports or close roads.
- Image analysis permits ten analyses per account in each fixed thirty-minute window, with a shared pilot budget of one hundred photo jobs per UTC day.
- Report submission's unnecessary authentication-table read was removed without granting broad authentication-table access. The report foreign key preserves valid ownership. Draft creation passed a service-role transaction test that was rolled back.
- Human review displays road, timestamps, note, processed image and actual model advisory; approved closures are limited to two hours. Report pages refresh private processing status.
- SQS processing is enabled with batch size one, maximum concurrency two, partial batch failure reporting and a dead-letter queue. Maintenance repairs durable jobs and archives sanitized audit records; its direct production invocation succeeded.
- 234 JavaScript tests and 22 Python tests passed. Seven production browser/API tests passed, including rendered-map initialization, real route calculation, protected APIs, navigation, keyboard access and mobile overflow checks. Production build and type checking passed; production dependency audit found no vulnerabilities.

## Verification boundaries

The owner requested skipping the final automated file-upload check because Edge's extension blocks file selection. The complete signed-in photo upload → queue → processed image → review workflow has therefore not been accepted end to end. The model passed controlled numerical/runtime smoke checks, not independent field-accuracy evaluation. Password-reset email delivery, historical weather replay, multi-account privacy penetration testing, long-running retention and scheduler observation still require broader acceptance. No success is claimed for those cases.

The pilot has no curated historical hotspot dataset, live traffic or official closure feed. Missing or stale evidence causes abstention. Reports affect routes only after authorized review. Previously implemented provisional observations remain preserved in their original table.

## Development

Use Node 22: `npm ci`, `npm run check`, `npm run build`. Run Python integration tests with patched Pillow 12.3.0. Browser tests accept `BASE_URL` for a deployed application and optional `PLAYWRIGHT_CHANNEL=msedge`. Build preparation serves the pinned MapLibre worker and its shared module together.

The private deployment handoff and all secret values must remain outside Git. Runtime AWS access uses project- and production-scoped Vercel OIDC roles; no static AWS key was added. The temporary one-time secret bootstrap role was removed after backend connectivity was verified.

## October 2026 UI.zip visual transplant

This distribution retains the original Next.js routes, AWS/Supabase/Vercel interfaces, database migrations and domain components while transplanting the landing page, sidebar/dashboard skin, route-planning cards, reporting presentation and authentication split-screen design from the supplied UI reference. Optimized WebP images are stored once under `public/ui/`.

See [UI transplant implementation mapping and verification](docs/UI_TRANSPLANT_VERIFICATION.md) and [original production baseline hashes](docs/ui-transplant-baseline.json). Live backend features still follow the original release gates; visual changes do not enable unverified routing, image analysis or reviewer permissions.
