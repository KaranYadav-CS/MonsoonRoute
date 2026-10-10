# MonsoonRoute — Environment Variable Registry

> Auto-generated reference for every environment variable used by the project.
> Cross-checked against `.env.example` by `scripts/check_env.mjs`.

## Legend

| Tag | Meaning |
|-----|---------|
| **CLIENT-SAFE** | Exposed in the browser bundle via `NEXT_PUBLIC_` prefix |
| **SERVER-ONLY** | Available only in Node.js server runtime; never in browser |
| **SECRET** | Contains credentials; must never be logged, committed, or exposed |
| **DEPLOY-ONLY** | Used only in CI/CD, build scripts, or bootstrap; not in app runtime |
| **LAMBDA-ONLY** | Set in AWS SAM/Lambda env; not consumed by Next.js |
| **OPTIONAL** | Not required for basic operation |
| **FUTURE** | Planned but not configured for the hackathon |

---

## A. App Identity

| Variable | Purpose | Client-safe? | Secret? | Where configured | Consumer |
|----------|---------|:------------:|:-------:|------------------|----------|
| `APP_ENV` | Runtime environment selector (`local\|ci\|staging\|production`) | No | No | Vercel / local / CI | Env validation, deployment boundaries |
| `FIXTURE_MODE` | Enable fixture/synthetic data mode; rejected in production | No | No | Local / CI / isolated preview | Fixture-build adapter |
| `APP_URL` | Exact origin, no trailing slash | No | No | Vercel / local | Origin checks, OAuth redirects, metadata |
| `CITY_ID` | Pilot city identifier (`delhi-central`) | No | No | Vercel / SAM env | All adapters/routing |
| `GRAPH_VERSION` | Published graph UUID | No | No | Vercel build/release env | Graph consistency gate |
| `GRAPH_SHA256` | Compiled graph hash (64 hex) | No | No | Vercel build/release env | Integrity check |
| `RULESET_ID` | Risk ruleset ID (`relative-risk-v1`) | No | No | Vercel | Risk/route provenance |
| `LOG_LEVEL` | Structured logging level (`INFO`) | No | No | Vercel / SAM | Logging |
| `BUILD_SHA` | Git commit SHA from CI | No | No | Vercel build env / CI | Status/version/audit |

## B. Supabase — Browser-safe

| Variable | Purpose | Client-safe? | Secret? | Where configured | Consumer |
|----------|---------|:------------:|:-------:|------------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL for Auth/Storage | **Yes** | No | Vercel + local `.env.local` | Browser Supabase client, SSR |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public project key (not service key) | **Yes** | No | Vercel + local | Browser/SSR user-context client |

## C. Supabase & Security — Server-only

| Variable | Purpose | Client-safe? | Secret? | Where configured | Consumer |
|----------|---------|:------------:|:-------:|------------------|----------|
| `SUPABASE_URL` | Backend project URL; must equal `NEXT_PUBLIC_SUPABASE_URL` | No | No | Vercel; Secrets Manager JSON for Lambda | Privileged DB/Storage clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy service-role JWT | No | **Yes** | Vercel; Secrets Manager JSON | Trusted API/worker clients |
| `RATE_LIMIT_HMAC_KEY` | HMAC key for rate-limit subject hashing (≥32 bytes base64) | No | **Yes** | Vercel | Quota/IP hashing |

## D. AWS Runtime

| Variable | Purpose | Client-safe? | Secret? | Where configured | Consumer |
|----------|---------|:------------:|:-------:|------------------|----------|
| `AWS_ENABLED` | Master allow/deny AWS SDK calls | No | No | Vercel / local | Enqueue, refresh provider, fallback |
| `AWS_REGION` | Must be `ap-south-1` | No | No | Vercel / local | AWS SDK clients |
| `AWS_ROLE_ARN` | Vercel federated role ARN (per-environment) | No | No | Vercel production/staging | STS/OIDC helper |
| `AWS_VISION_QUEUE_URL` | SQS queue URL from SAM output | No | No | Vercel | SendMessage |
| `AWS_INGEST_FUNCTION_ARN` | Lambda function ARN from SAM output | No | No | Vercel | Admin InvokeFunction |
| `AWS_PROFILE` | Local AWS SSO profile; absent on Vercel | No | No | Local only | Local AWS SDK/CLI |

## E. Lambda Variables (LAMBDA-ONLY)

> These map to SAM parameters and are **not** read by Next.js.
> Lambda receives `supabase_url` and `supabase_service_role_key` from Secrets Manager JSON, **not** from env.

| Variable | SAM Parameter | Purpose | Client-safe? | Secret? | Where configured | Consumer |
|----------|---------------|---------|:------------:|:-------:|------------------|----------|
| `BACKEND_SECRET_ARN` | `BackendSecretArn` | AWS secret ARN | No | No | SAM parameter → Lambda env | Lambda secret loaders |
| `ARTIFACT_BUCKET` | — | Private S3 bucket | No | No | SAM env | Ingestion/vision/maintenance |
| `VISION_QUEUE_URL` | — | SQS queue (worker-repair name) | No | No | Maintenance Lambda SAM env | Maintenance SendMessage |
| `HF_MODEL_ID` | — | Model identifier (exact case) | No | No | Vision SAM env + manifest | Result provenance |
| `MODEL_REVISION` | `ModelRevision` | HF model commit SHA (40 hex) | No | No | SAM parameter → vision env | Artifact provenance |
| `MODEL_KEY` | `ModelKey` | Immutable ONNX S3 key | No | No | SAM parameter → vision env | Model download |
| `MODEL_SHA256` | `ModelSha256` | Hash of exported ONNX (64 hex) | No | No | SAM parameter → vision env | Integrity check |
| `PREPROCESSOR_KEY` | `PreprocessorKey` | Processor recipe S3 key | No | No | SAM parameter → vision env | Preprocessing download |
| `PREPROCESSOR_SHA256` | `PreprocessorSha256` | Hash of recipe file (64 hex) | No | No | SAM parameter → vision env | Integrity check |
| `ORT_THREADS` | — | ONNX inter-op threads (`2`) | No | No | Vision SAM env | ONNX session |

## F. Build & Deployment Credentials (DEPLOY-ONLY)

| Variable | Purpose | Client-safe? | Secret? | Where configured | Consumer |
|----------|---------|:------------:|:-------:|------------------|----------|
| `HF_TOKEN` | Read-only Hub token for downloads | No | **Yes** (optional) | Local / GitHub protected env | Model resolver/export script |
| `SUPABASE_PROJECT_REF` | Hosted project identifier | No | No | Deployment env | CLI & Management API scripts |
| `SUPABASE_ACCESS_TOKEN` | Management/CLI auth | No | **Yes** | Deployment-only secret | Config/migration workflow |
| `SUPABASE_DB_PASSWORD` | Remote DB migration password | No | **Yes** | Deployment-only secret | Supabase CLI deployment |
| `DATABASE_URL` | TLS Postgres for graph import/bootstrap | No | **Yes** | Deployment-only secret | Seed/import scripts |
| `GITHUB_OAUTH_CLIENT_ID` | GitHub OAuth app ID | No | No | Supabase Auth / local config | Auth config; `supabase/config.toml` via `env()` |
| `GITHUB_OAUTH_CLIENT_SECRET` | GitHub OAuth app secret | No | **Yes** | Supabase Auth; never Vercel browser | Auth config; `config.toml` via `env()` & Management API script |
| `AWS_ACCOUNT_ID` | IAM/budget bootstrap account | No | No | Deployment env | OIDC/SAM/IAM renderer |
| `AWS_DEPLOY_ROLE_ARN` | GitHub OIDC deployment role | No | No | GitHub protected environment | GitHub deploy workflow |
| `AWS_DEPLOY_BUCKET` | Deploy S3 bucket (`monsoonroute-deploy-{acct}-ap-south-1`) | No | No | Protected deployment config | SAM packaging/deploy |
| `GITHUB_OWNER` | Repository owner for OIDC trust | No | No | Bootstrap config | IAM trust renderer |
| `GITHUB_REPO` | Repository name for OIDC trust | No | No | Bootstrap config | IAM trust renderer |
| `VERCEL_TEAM_SLUG` | OIDC issuer/audience owner slug | No | No | Bootstrap input | IAM trust renderer |
| `VERCEL_PROJECT_NAME` | Vercel OIDC subject project name | No | No | Bootstrap input | IAM trust renderer |
| `VERCEL_ORG_ID` | Vercel CLI target org ID | No | No | Deployment config | Vercel CLI workflow |
| `VERCEL_PROJECT_ID` | Vercel CLI target project ID | No | No | Deployment config | Vercel CLI workflow |
| `VERCEL_TOKEN` | Deployment/API token for CLI | No | **Yes** | Protected deployment-only secret | Vercel CLI |
| `AWS_BUDGET_EMAIL` | Budget alert email recipient | No | No (private) | Private deployment config | Budget bootstrap script |
| `ADMIN_USER_ID` | Supabase auth UUID for first admin | No | No (private) | Private bootstrap input | Role bootstrap SQL/script |

## G. Optional Evaluation Importer

> Only **one** credential mechanism may be set. Leave all commented out by default.

| Variable | Purpose | Client-safe? | Secret? | Where configured | Consumer |
|----------|---------|:------------:|:-------:|------------------|----------|
| `KAGGLE_USERNAME` | Legacy Kaggle download auth (part 1) | No | **Yes** (optional) | Build-only secret | Evaluation importer |
| `KAGGLE_KEY` | Legacy Kaggle download auth (part 2) | No | **Yes** (optional) | Build-only secret | Evaluation importer |
| `KAGGLE_API_TOKEN` | Current token mechanism (alternative) | No | **Yes** (optional) | Build-only secret | Evaluation importer |

## H. Future Scope

> Not configured for the hackathon. Fully commented out in `.env.example`.

| Variable | Purpose | Client-safe? | Secret? | Where configured | Consumer |
|----------|---------|:------------:|:-------:|------------------|----------|
| `NVIDIA_API_KEY` | NVIDIA NIM API key | No | **Yes** | Server-only (future) | NIM summary feature |
| `NIM_MODEL_ID` | NIM model (`meta/llama-3.1-8b-instruct`) | No | No | Server config (future) | NIM client |
| `NIM_BASE_URL` | NIM endpoint | No | No | Server config (future) | NIM client |
| `NIM_SUMMARY_ENABLED` | Feature flag (default `false`) | No | No | Server config (future) | Summary adapter |

## I. Never Set

These are **not** application variables. They are platform-provided or temporary credentials.

- **`AWS_ACCESS_KEY_ID`** / **`AWS_SECRET_ACCESS_KEY`** / **`AWS_SESSION_TOKEN`**: Temporary STS/SSO/Lambda-role credentials only. Never committed or reused as long-lived keys.
- **`VERCEL_ENV`**, **`VERCEL_REGION`**, and the **Vercel OIDC token**: Platform-provided at runtime. Do not manually copy or log.
