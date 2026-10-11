# 2:45 honest demonstration script — record the real app and AWS console

> This is a guide, **not** a claim the video exists. Use real screen recording of your signed-in Karan AWS console and publicly accessible MonsoonRoute. Do not reveal account emails, secrets, cookies, users' private photos or root credentials.

| Time | Actual scene | Suggested narration |
|---|---|---|
| 0:00–0:15 | Landing page | “Heavy rain isn't evidence a particular Delhi road is flooded. MonsoonRoute separates real map/weather data from uncertain risk estimates.” |
| 0:15–0:45 | Click header Plan, select two locations on actual map, show weather preview | “These streets are a real OSM-based basemap; rainfall comes from nine Open-Meteo grids. There is currently no reviewed road-level graph, so the app does not issue fabricated safe-route advice.” |
| 0:45–1:05 | Show login and sign-up interfaces | “We implemented Supabase email/password account screens. Production confirmation delivery and owner-scoped private-report flow are still pending final verification.” |
| 1:05–1:30 | AWS Console S3 bucket/prefix, model/processor/manifest (hide private screens as needed) | “The 343 MB ONNX model is stored privately, versioned and checksummed; it came from a pinned safe-format source build.” |
| 1:30–2:10 | Lambda Console `monsoonroute-private-model-inference`: run an actual `self_test` invocation or private `inference-fixtures/verified-pillow-smoke.png` call. Show response | “This is real Lambda CPU inference on a **synthetic test image**. It returned an advisory label, but the probability is uncalibrated; we cannot claim road-level safety or Delhi accuracy.” |
| 2:10–2:30 | GitHub Actions passing runs and model evidence | “CI validates source and browser navigation. We use role-scoped AWS resources, encrypted S3 and a private model runtime.” |
| 2:30–2:45 | Return to product page and limitations | “Human review, real licensed graph publication and held-out evaluation are next gates. MonsoonRoute is an evidence-aware research pilot, not a certified navigation tool.” |

**Owner checklist:** Use real footage, <=2:59 duration, upload video to YouTube public/unlisted, verify it plays while signed out, paste URL and source/public repo into organizer submission page before Oct 11, 8:00 PM IST. If you cannot complete those before cutoff, do not claim a submission.

**Safe Lambda self-test JSON:**

```json
{"mode":"self_test"}
```

**Safe preuploaded image test JSON:**

```json
{"mode":"classify_private_s3","key":"inference-fixtures/verified-pillow-smoke.png"}
```

The model returns an uncalibrated score only; don't use test imagery to claim field accuracy.
