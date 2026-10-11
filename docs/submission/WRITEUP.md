# MonsoonRoute — Environmental Hacks 2026 submission write-up (truthful current scope)

## The problem

During monsoon conditions, commuters often know there is heavy rain somewhere in Delhi but cannot distinguish verified road observations from uncertain, gridded weather-model estimates. A colorful map can become misleading if it implies flooded-road safety without road-level evidence.

## Our solution

**MonsoonRoute** is an evidence-aware, Central Delhi research pilot. Its live web experience displays an actual OpenStreetMap-derived street basemap and a nine-cell Open-Meteo precipitation preview with timestamps and caveats. Users can pick map locations directly. The underlying deterministic routing research engine evaluates time, modeled relative risk and detour budgets on a separately labeled synthetic graph. We deliberately do not present this exercise as validated navigation.

The application now offers Supabase email/password registration, login and password-reset screens. The deployed app also supports **provisional community road observations** tied to real map coordinates through Supabase Auth and owner-isolated RLS. One real, non-test observation has reached the private database. Optional photos are re-encoded to remove embedded metadata before a private Supabase Storage upload; however, actual user photo-upload acceptance remains unverified. Reports are held for human triage and cannot trigger a road closure or influence routing without validated graph evidence.

## Where AWS genuinely executes

- Private versioned/encrypted Amazon S3 stores a checksum-pinned 343 MB ONNX flood-scene classifier and its processor/manifest.
- AWS CodeBuild downloaded safe-format source weights from a fixed public Hugging Face revision and exported an ONNX CPU artifact; numerical preprocessing/logit parity checks passed.
- A private Python 3.12 AWS Lambda in Mumbai loaded that ONNX from S3, received an AWS S3 test image, ran actual CPU inference and returned an advisory class. Measured in-model compute was approximately 548 ms for one deterministic synthetic image.
- IAM roles limit artifact access and function invocation; the Lambda has no Function URL, resource-based public invoke policy, or queue event mapping. CloudWatch/queue/dead-letter alert groundwork is configured.

These are authentic AWS operations, not an on-screen mock. They establish execution and artifact integrity, **not real-world classification accuracy**. The model cannot approve road closures.

## What we verified

- Production website and real street-map integration.
- Live Open-Meteo forecast endpoint.
- GitHub CI and desktop/mobile Chromium navigation checks.
- AWS model object SHA-256, S3 encryption/versioning, private Lambda invocation and safe failure boundaries.

## Scientific limits and next steps

A real-map preliminary observation intake is deployed, but no reviewed Central Delhi routing graph is published; there is no integrated authenticated user-photo → moderation → safe reroute production run. There is no independent Delhi-held-out model accuracy or road-depth benchmark. The planned implementation is to publish provenance-checked OSM roads and terrain, verify fresh weather ingestion and secure report storage, complete human review and rerouting, and only then release evidence-aware route comparison. Unsupported features remain disabled.

## Attribution

We acknowledge OSM contributors and ODbL, OpenFreeMap/OpenMapTiles, Open-Meteo, the `prithivMLmods/Flood-Image-Detection` model and its author/license, MapLibre, Supabase, AWS, Vercel, upstream dependencies, existing historical repository contributors, and assistance from AI coding tools. Only code authored during the eligible event window should be claimed as event implementation.

**Demo:** [MonsoonRoute live site](https://monsoon-route-omega.vercel.app/plan)  
**Source:** https://github.com/KaranYadav-CS/MonsoonRoute (owner must verify public visibility before submission)  
**Video:** Not uploaded/verified — add actual YouTube URL after recording.  
**Submission:** No receipt yet — owner must sign in and submit.
