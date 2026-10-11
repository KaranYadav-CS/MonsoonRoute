# AWS experimental inference verification — 11 October 2026

Scope: MonsoonRoute, AWS account 043063712559, region ap-south-1.

**Verified actual code:** `services/vision/experimental_private_lambda.py` is a byte-for-byte checked-in copy of private S3 source `s3://monsoonroute-prod-artifacts-043063712559-ap-south-1/inference-build-input/handler.py`. The running function package was built through AWS CodeBuild `monsoonroute-inference-package`, then deployed to Lambda `monsoonroute-private-model-inference`.

**Private Lambda runtime:** Python 3.12 x86_64, 3008 MB memory, 120-second timeout, 1024 MB /tmp. No Function URL, no resource-based invoke policy and no event-source mappings. CloudWatch logs retained for seven days. Execution role: `monsoonroute-private-inference-execution`, allowing read-only access to the pinned S3 model and `inference-fixtures` plus its own logs. No Supabase secret credentials, AWS queues or public web invoke.

**Model:** SigLIP Flood-Image-Detection pinned upstream source revision `1fb5408d3b778c92c79b3a7894517ce794ad21f7`; model checksum `2517f3dfb5d82dc21a0729733fff7756eaca0b4b22026d153189501169a84d76`; input 224x224 RGB with bilinear resizing. No accuracy/calibration approval.

**AWS live smoke evidence:** synchronous `self_test` invocation with generated synthetic PNG returned `Non Flooded`, uncalibrated score `0.73583`, measured ONNX inference `534.36 ms`. Private `inference-fixtures/verified-pillow-smoke.png` was generated and uploaded from AWS CodeBuild; synchronous `classify_private_s3` returned HTTP-level invocation 200, `Non Flooded`, uncalibrated `0.73583`, model compute `548.29 ms`, image SHA-256 `2f3701bc017dd54abcd81ecaf7d31e44b365ce9dd84713814b8c8f1d14ad968b`. These are synthetic **compatibility smoke tests**, NOT real-world accuracy metrics or overall request latency.

**Failure and recovery:** initial manually encoded PNG could not be decoded; replaced with PIL-encoded verified fixture. Temporary fixture-write IAM permission was removed and invalid object deleted.

**Production acceptance intentionally blocked:** hosted GitHub OAuth, real user identities, protected Supabase server key, actual report/photo user auth, review-to-routing flow, real reviewed graph, weather publication, held-out model F1/calibration, abuse/quota controls, and full authenticated browser E2E tests have not passed. Model results `evaluation_approved=false` and `routing_usable=false`; never use them as evidence of road safety. Existing public status endpoint returns unavailable without backend credentials.

**WhatsApp:** planner now includes a share link for the publicly hosted Vercel preview. This is not a WhatsApp deployment, bot or Business API integration.
