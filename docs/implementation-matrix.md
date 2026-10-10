# P4 feature implementation and release-proof matrix

Legend: `IMPLEMENTED_TESTED` means code exercised offline with targeted tests, not deployed. `IMPLEMENTED_UNVERIFIED` means code authored and static validation passed but live dependency/provider behavior not established. `MISSING_INPUT` means a legitimate external dataset/credential/review is required. `P5` marks host actions explicitly deferred.

| Feature | P4 status | Evidence / boundary |
|---|---|---|
| Original responsive Next.js landing/planner/report/reviewer/history pages | IMPLEMENTED_UNVERIFIED | TSX syntax validated, but Next.js deps/build unavailable offline |
| Standalone interactive responsive route lab | IMPLEMENTED_TESTED | Chromium 1440 and 390 widths, screenshots `docs/p4-ui-*.png`, no page errors or overflow, synthetic warning |
| Directed-turn closure-aware 0–30% detour routing | IMPLEMENTED_TESTED | 31 Node tests with deterministic graph cases; not real Delhi data |
| Unknown/stale weather abstention | IMPLEMENTED_TESTED | Node routing tests, manual weather frame validator tests |
| Live graph import | IMPLEMENTED_UNVERIFIED | OSM/DEM compilers and import SQL generator tested on mini-fixture; no reviewed real Delhi source |
| API Zod contracts, auth/origin checks, deny-by-default | IMPLEMENTED_UNVERIFIED | Syntax tests/security sentinels, backend provider tests still needed |
| User reports/private upload/lease/human moderation | IMPLEMENTED_UNVERIFIED | Source/Supabase RPC argument checks and worker tests; no authenticated end-to-end test |
| Server HMAC quota enforcement | IMPLEMENTED_TESTED | corrected JSON RPC `allowed` parsing; real Vercel HMAC still absent |
| Weather S3 archive + nine-cell SQL publication | IMPLEMENTED_UNVERIFIED | worker source and unit/security tests; no provider-run receipt |
| Python image sanitize + optional ONNX guarded inference | IMPLEMENTED_TESTED | 21 Python tests include invalid content/refusal; no ONNX weights or live AWS tests |
| Worker builds and disabled SAM triggers | IMPLEMENTED_TESTED | Lambda packaging/static template validation; no Lambda execution |
| Original SVG brand and synthetic map | IMPLEMENTED_TESTED | browser visual screenshots and locally authored files; no imported old media |
| Hosted GitHub OAuth and first admin | MISSING_INPUT | P3 owner OAuth registration and sign-in required |
| Vercel Git binding and HMAC secret | MISSING_INPUT | P2 wrong repo link, secret entry blocked; no fabrication |
| Dependency lock, Next.js semantic build, dependency audit | MISSING_INPUT | npm registry unavailable in sandbox, must verify in networked runner |
| Real city graph/DEM, reviewed closure and weather feeds | MISSING_INPUT | owner dataset/license/provenance signoff mandatory |
| Published/parity-benchmarked model | MISSING_INPUT | owner snapshot and P5 Lambda proof required |
| End-to-end SQS/Lambda/Auth/RLS/rollback | P5 | cloud activation prohibited in offline codebase iteration |
