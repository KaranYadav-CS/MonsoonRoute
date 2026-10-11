# Architecture

- Next.js App Router on Node 22 in Vercel Mumbai. All browser-facing routes are server authorization boundaries. Supabase hosted PostgreSQL / PostGIS in Seoul is the single source of identity/graph/report records.
- Typed request contracts in `packages/contracts`; offline pure risk and turn-aware deterministic path selection in `packages/engine`; server adapters in `lib/server`.
- Open-Meteo fixed nine-cell ingestion Lambda, PIL sanitizer / optional ONNX vision worker and bounded maintenance worker under `services/`. These workers **are not complete end-to-end adapters** until AWS queues/storage/secrets and Supabase RPC claims are configured.
- P1 SAM and foundation CloudFormation definitions under `infra/aws` are not redeployed by this source package.
- No route suggestions if the weather model is stale, if only an unverified graph exists, or if a reviewer closure cannot be honored. No road-water depth or driver safety claim.
- Pending P5: verified data extraction, hosted OAuth/role bootstrap, service key/HMAC, npm lock/build, model parity, all real endpoint smoke and release.
