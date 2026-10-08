# MonsoonRoute — Implementation Source of Truth

**Specification version:** 1.0 • **Research checked:** 4 October 2026 (Asia/Kolkata)  
**Track:** Environmental Hacks / Heat & Water  
**Product status:** specification for a new hackathon build; no application, cloud deployment, model benchmark, or field validation is claimed by this document.  
**Normative language:** MUST is required; SHOULD is recommended; FUTURE SCOPE is excluded from the hackathon acceptance contract.

> Build a Delhi road-waterlogging decision aid that compares an ordinary route with a lower modeled-risk route within an explicit detour budget, explains the evidence, and remains honest when the evidence is missing.

## Contents

1. Decisions, evidence, and claim boundaries
2. Problem, market requirements, and competitors
3. Product requirements and user journeys
4. Architecture and component contracts
5. Data acquisition, provenance, and graph construction
6. Risk engine and routing algorithm
7. Hugging Face models and inference deployment
8. Kaggle dataset decisions and evaluation data contracts
9. NVIDIA NIM decision
10. Supabase database and security migrations
11. Storage, authentication, and authorization
12. API contracts and validation
13. AWS resources, IAM, configuration, and budget
14. Environment variables and secrets
15. Frontend and repository architecture
16. Reliability, observability, and threat model
17. Tests, ML evaluation, and reproducibility
18. Deployment and CI/CD
19. Implementation roadmap and judging demonstration
20. Feasibility register, limitations, and future scope
21. Research source registry

## 1. Decisions, evidence, and claim boundaries

### 1.1 Final build decisions

| Decision | IMPLEMENT FOR HACKATHON |
|---|---|
| Name and positioning | **MonsoonRoute: evidence-aware monsoon route planning.** A research decision aid, not a certified safety navigation system. |
| Geography | Central Delhi pilot. Supported endpoint rectangle: longitude 77.190–77.245, latitude 28.600–28.655. Graph extraction buffer: longitude 77.180–77.255, latitude 28.590–28.665. No citywide coverage claim. |
| Travel profile | Passenger-car route planning only, static travel-time estimates. No ambulance, pedestrian, motorcycle-depth, or turn-by-turn navigation claims. |
| Weather horizon | Current conditions index plus +1 h and +3 h planning views, based on gridded numerical weather-model precipitation and reviewed local reports. No claim of a locally validated meteorological nowcast. |
| Risk output | Versioned **relative risk index**, evidence coverage, source age, reason codes, and reviewed closures. No calibrated road-flood probability in the mandatory build. |
| Optimization | Best feasible route among a deterministic candidate set, within 0–30% estimated-time detour. Hard closure exclusion. No claim of a globally optimal constrained path. |
| Frontend/API | Next.js App Router, TypeScript, Node.js Vercel Functions, Vercel production subdomain. |
| Application state | Supabase Postgres/PostGIS, Auth, private Storage. |
| AWS | S3, three Lambda functions, SQS + DLQ, EventBridge Scheduler, Secrets Manager, CloudWatch, IAM/STS, AWS Budgets. AWS SAM/CloudFormation defines infrastructure. |
| HF model | `prithivMLmods/Flood-Image-Detection`, CPU ONNX inference in Lambda; assists human photo review only. |
| LLM | No external LLM call required for the hackathon. Deterministic evidence explanations in English and Hindi. NIM assessed in §9. |
| Training | No new road-risk supervised model without event-level road labels. No fine-tuning needed to complete the build. |
| Maps | MapLibre GL JS with self-served OSM-derived GeoJSON roads and HTML landmark markers. No paid map/routing API or tile infrastructure dependency. |
| Demo | One integrated app, AWS ingestion and photo job visible, route comparison, detour adjustment, provenance panel, and clearly labeled replay/scenario mode. |

The architecture intentionally replaces the supplied documents' suggested Amplify, DynamoDB, and OpenSearch with the user's preferred Vercel and Supabase. Those documents describe service possibilities, not mandatory service-by-service requirements. S3 archives and Lambda ingestion/inference are real AWS workloads, not decorative integrations.

### 1.2 Input audit and corrections

Both supplied Markdown files were read in full: the category analysis (1,074 lines) and evidence ledger (789 lines). The first opportunity is road-level monsoon waterlogging risk plus routing. The other four opportunities informed scope comparison but are not added to this product.

The files' evidence IDs are not consistently aligned after S36: for example, S49 means S3 in some category-analysis passages but BWSSB Kaveri on Wheels in the evidence ledger. Do not carry those ambiguous IDs into code or this document's research references. Use the URLs and the independent R-series registry in §21.

The Delhi Traffic Police June 2025 publication supports 445 hotspots and 57 recurrent locations. It names examples; it does **not** supply a complete machine-readable, accurately geocoded 57-location label set. Its counts do not authorize inventing 445 coordinates. [R04]

The opened road-flood research supports feature fusion, but the 2023 Computational Urban Science paper describes repeated fivefold cross-validation. Do not attribute this document's stricter event-separated evaluation to that paper. The evaluation protocol here is a design decision intended to reduce leakage. [R09]

### 1.3 Event constraints that change implementation planning

The official event page advertises 8–11 October 2026 and teams of 1–4. The rules allow learning, planning, and practice before opening, but project implementation must start during the event. Submission requires a public repository, a write-up, and a YouTube video of at most three minutes. Judges assess the submitted video; there is no live judging call. Show AWS executing in that video. Exact opening/submission times must come from the organizer's current submission page; this specification does not invent them. [R01–R03]

This document is pre-event research and planning. Create the project-specific implementation history when the event opens. Record AI coding tools and third-party credits in the write-up. Do not promise Amazon interview eligibility: the current rules limit that separate opportunity to specified graduation cohorts; prize eligibility and recruitment eligibility are different. [R02]

### 1.4 Evidence and implementation certainty

| Statement | Actual status |
|---|---|
| Selected HF classifier exists, has a published label space, and is not served by a listed inference provider | Verified from the current model page. [R18] |
| Qwen3-VL-8B has a listed HF inference-provider path | Current page lists Featherless AI. An authenticated call was not performed. [R21] |
| Classifier exports to ONNX and runs within the proposed Lambda latency | Technically specified deployment path; **not benchmarked here**. Export, parity, memory, and cold-start gates are mandatory. |
| Live weather API and archive API are documented | Documentation verified; a project-specific data capture has not been executed. [R11–R13] |
| Complete Delhi road labels or licensed Kaggle road-event labels are available | Not established. No such availability or benchmark is claimed. |
| Migrations and cloud configuration below are production deployed | No. They are specifications to implement and execute in the coding/deployment phase. |
| Risk reduction equals fewer actual flooded-road encounters | Not established. Only modeled exposure reduction is mandatory; actual benefit requires independent observations. |

No amount of architecture detail removes missing ground truth. The build is complete as an integrated decision aid, with calibration and field-validated safety explicitly excluded until evidence supports them.

## 2. Problem, market requirements, and competitors

### 2.1 Problem analysis

A traveler needs a road decision, whereas rainfall grids, static flood maps, municipal bulletins, and resident observations arrive at different resolutions and times. A low-lying road can be hazardous while an adjacent overpass is passable; a report pin can also refer to the wrong carriageway. A citywide rainfall color is insufficient for choosing a path.

MonsoonRoute fuses static susceptibility, gridded rainfall forcing, and reviewed local evidence into a road-linked index, then compares paths under a user-selected detour. The road precision belongs to the **decision graph**; it does not imply street-level rainfall measurement, water-depth estimation, or drainage simulation.

### 2.2 MRD

| Item | Requirement / evidence boundary |
|---|---|
| Initial user | Delhi commuter planning a car journey during rainfall; secondary user is a small-fleet dispatcher reviewing a single trip. |
| User job | Decide whether a detour is justified and understand which road evidence drove it. |
| Pain | Navigation objectives usually prioritize duration/distance; waterlogging evidence is fragmented and may be stale. This is a problem hypothesis, not an interviewed-user finding. |
| Alternatives | Ordinary navigation, police advisories, resident groups, institutional flood forecasts, licensed flood intelligence. |
| Product value | Lower modeled hazard exposure subject to a visible time tradeoff, plus explicit uncertainty and closure handling. |
| Adoption requirement | No account for route comparison; map-click input; result visible on mobile; evidence timestamps prominent. |
| Trust requirement | Never label a route guaranteed safe. No concealed synthetic reports. No photo-model output promoted to physical truth. |
| Validation before commercialization | At least 10 commuter/dispatcher interviews, municipal data feasibility review, field observations across storms, and independent route-outcome evaluation. Not performed by this research. |
| Commercial hypothesis | Later fleet/API subscriptions or municipal pilots. No willingness-to-pay, revenue, market-share, or adoption metrics claimed. |
| Business constraint | Free educational/noncommercial weather API and Vercel Hobby terms must be re-evaluated before paid use. AWS credits do not fund Vercel, Supabase, HF, Kaggle, or NVIDIA charges. |
| Environmental impact | Operational adaptation to waterlogging. No emissions, money, injuries, or lives-saved claim without measured outcomes. |

### 2.3 Competitive differentiation

| Existing system | Primary-source capability | Consequence for MonsoonRoute |
|---|---|---|
| Google Flood Hub | Flash-flood model documentation describes 20 km × 20 km outputs and weather/geophysical inputs. [R05] | Do not claim to invent AI urban flooding. Add route-linked decision logic, not a competing global weather model. |
| Fathom | Licensed global flood hazard/map/API products. Vendor statements establish product existence, not independently measured performance. [R06] | Static high-resolution hazard data are already a product. MonsoonRoute focuses on local evidence and bounded route action. |
| Chennai flood SDSS | Municipal real-time forecasting/spatial decision support in the supplied ledger. [R07] | India already has institutional flood systems. Portable pilot deployment and a commuter workflow are narrower aims. |
| FloodMapp NowCast / RoadSafe | Vendor describes flooded-road/navigation integration in Norfolk. [R08] | **Flood-aware routing is not globally novel.** Avoid first-of-its-kind claims. |
| Previsico | Vendor offers transport flood intelligence, API integration, and modeled forecast/observed flood timelines. [R10] | Do not claim forecast + explanation is unique. Differentiate through transparent implementation and an accessible Indian pilot. |
| Academic road-flood systems | Topography, precipitation, crowdsourced/traffic evidence have been studied. [R09, R17] | Feature fusion is established. Evaluate this implementation locally; do not borrow published accuracy. |

### 2.4 Four defensible product USPs

1. **Explicit detour contract:** every recommendation includes the baseline duration, allowed cap, achieved detour, and risk-index comparison. If no candidate meets the cap, say so.
2. **Evidence-aware abstention:** freshness, missing terrain, report review, and conflicting evidence are visible; stale conditions remove comparative weather-risk claims.
3. **Reproducible local evidence:** graph version, weather run, ruleset, active report IDs, closure records, hashes, and replay clock make a decision auditable.
4. **An integrated, modest-cost Indian pilot:** source ingestion, private photo review, route optimization, audit, and playback run in one app with an actual AWS data/inference plane.

These are differentiators of the proposed implementation, not proof of unique worldwide invention or superior forecast accuracy.

## 3. Product requirements and user journeys

### 3.1 PRD and acceptance criteria

| ID | Required behavior | Acceptance test |
|---|---|---|
| P01 | Plan from two map points or local landmark search | Valid pilot coordinates produce baseline and up to two alternatives; outside coordinates fail before computation. |
| P02 | Set detour 0–30%, default 20% | Every recommended path obeys the same estimated-time cap, with a numeric check. |
| P03 | Choose current, +1 h, +3 h planning view | Return exact effective time, weather provenance, and horizon; never imply depth prediction. |
| P04 | Compare evidence-linked road indices | Hover/click shows index, coverage, reasons, source time, graph and ruleset versions. |
| P05 | Apply reviewed closures | No recommendation traverses an active closure; baseline crossing one is labeled unavailable. |
| P06 | Handle unknown conditions | Weather older than 60 min or invalid inputs yield closure-aware planning only, with comparison metrics unavailable. |
| P07 | Submit structured report and optional private photo | GitHub-authenticated user creates an owned report, uploads directly to Storage, and sees job status. |
| P08 | Assist and moderate reports | Lambda produces image evidence; moderator decides approve/reject/resolve and optional closure. AI cannot approve or close roads. |
| P09 | Replay an immutable scenario | Historical weather scenario or synthetic scenario labeled persistently; no live-report mutation in replay. |
| P10 | Show system evidence | Data status, AWS ingestion archive ID, and vision job timestamps visible to reviewers without secrets. |
| P11 | Respect privacy | No public raw report coordinates, uploader identities, or photos; route history is opt-in. |
| P12 | Operational recovery | Duplicate SQS deliveries and interrupted enqueue do not duplicate decisions or permanently lose jobs. |
| P13 | Usable interface | Responsive 360 px–desktop, keyboard alternatives to map input, contrast ≥4.5:1 for body text, no reliance on color alone. |
| P14 | Explain without LLM | Stable bilingual templates generated from reason codes and numeric facts, not unconstrained text generation. |

Targets: warm route endpoint p95 <3 s and total client-visible p95 <5 s at 10 simultaneous requests; vision job p95 <90 s including ordinary cold starts; weather capture ≤15 min schedule plus processing; reviewed report reflected in next route query ≤30 s. These are acceptance targets to measure, not current results or vendor guarantees.

### 3.2 Features excluded from the hackathon

Turn-by-turn guidance; emergency dispatch; inferred safe water depth for vehicles; citywide/countrywide expansion; push/SMS alerts; social feeds; gamification; continuous GPS tracking; autonomous report validation; a flood chatbot; drone/satellite segmentation in the live path; GPU endpoints; hydrodynamic drainage simulation.

### 3.3 User journeys

**Route planner:** open `/plan` → select pilot landmark or map origin/destination → choose detour and horizon → `POST /api/v1/routes` → map comparison → inspect risky edge reasons → adjust detour → recompute. No login. The UI shows “lower modeled risk,” never “safe route.”

**Reporter:** sign in with GitHub → select road and observation category/time → create draft → optionally upload photo → finalize → asynchronous image review → pending human review. The uploader receives no promise that submission automatically changes public routing.

**Moderator:** `/review` checks session and live database role → inspect pending structured report and private processed image → compare map location with named road/time → record decision and reason → optionally establish a short closure → audit transaction → next route reflects approved evidence. “Reviewed” means reviewed for plausibility, not field verified.

**Judge:** use seeded scenario → compare routes → show the detour contract → submit a consented demonstration photo → watch AWS job result → moderator approves a demonstration observation → recompute in explicitly marked demo mode → inspect provenance and metrics. Then show live weather status separately.

**Failure journey:** weather feed unavailable → cached run ages → at 60 min the app switches to closure-only planning → user sees conditions unknown and can choose labeled scenario playback. The app never silently substitutes synthetic data for live data.

## 4. Architecture and component contracts

### 4.1 Deployment topology

```mermaid
flowchart TD
  B["Browser on Vercel subdomain"] --> V["Vercel Node API"]
  B --> A["Supabase Auth"]
  B --> U["Private Supabase photo upload"]
  V --> D["Supabase Postgres and PostGIS"]
  V --> Q["SQS vision jobs"]
  Q --> W["Lambda vision worker"]
  W --> U
  W --> D
  W --> S["Private S3 artifacts and archives"]
  E["EventBridge schedules"] --> I["Lambda weather ingestion"]
  E --> M["Lambda maintenance"]
  I --> F["Open-Meteo data API"]
  I --> D
  I --> S
  M --> D
  M --> Q
  M --> S
  M --> U
```

IAM/STS grants Vercel temporary permissions to send SQS jobs. Lambda roles read one Supabase backend secret from Secrets Manager. CloudWatch observes Lambda/SQS/schedules; application logs stay in Vercel and database audit. There is no AWS public application endpoint, API Gateway, NAT gateway, VPC, or always-on server.

### 4.2 Component responsibilities

| Component | Inputs and outputs | Implementation boundary |
|---|---|---|
| Browser | Map points, detour, report form → JSON API calls; direct private Storage upload | Public keys only; no weather/model/provider credentials. |
| Vercel API | Validated HTTP → auth, atomic quotas, DB reads/writes, graph scoring/routing, SQS send | Node runtime; request JSON ≤64 KiB; response ≤2 MiB. |
| Supabase Auth | GitHub OAuth PKCE → secure SSR session | Identity only; moderator authorization is database-controlled. |
| Postgres/PostGIS | App records, graph, provenance, reports, closures, weather | Authoritative application state; no DynamoDB copy. |
| Supabase Storage | Original then sanitized evidence images | Private; ownership and moderator policies; raw EXIF discarded on processing. |
| Lambda ingestion | Fixed city weather query → validated run, hourly cells, S3 raw response | Python; does not train or execute route searches. |
| Lambda vision | Durable job ID → sanitized photo + logits/scores + job result | Python ONNX Runtime; no GPU, no LLM, no arbitrary URL fetching. |
| Lambda maintenance | Pending jobs/audit archive/retention → retries, archival, deletes | Bounded batches, idempotent, scheduled. |
| S3 | Content-addressed archives, graph/model/provenance artifacts | Secondary immutable evidence storage; application photos primarily remain in Supabase. |
| SQS | Minimal job messages | Durable asynchronous work; DB remains status authority. |
| Repository build scripts | Public source snapshots → verified graph/model/static map files | Run during event; artifacts have manifest hashes and licenses. |

### 4.3 Complete request chains

**Live route:** browser → Vercel validate/limit → read graph manifest + current successful weather run + approved unexpired reports + active closures from Supabase → score relevant graph → deterministic candidates → detour/closure filter → response → browser map. Record only aggregate decision metrics unless route-history consent is set. No synchronous ML/provider/AWS call is needed to plan a route.

**Weather:** EventBridge Scheduler → ingestion Lambda with IAM role → HTTPS fixed Open-Meteo URL → schema/unit checks → private S3 raw object → Supabase `publish_weather_run` transaction → Vercel reads that version → browser displays retrieval/effective times. Failed captures cannot publish partial runs.

**Photo:** browser authenticated via Supabase → Vercel creates owned draft → browser direct Storage upload under ownership policy → Vercel confirms object/finalizes report + durable job → IAM/STS SQS send → worker claims DB lease → builds Storage path from DB → downloads bounded image → validates/strips metadata/re-encodes → ONNX CPU → stores sanitized private image and structured result → user polls Vercel → moderator reviews → audit + closure transaction → subsequent route query. No webhook or unauthenticated callback.

**Replay:** browser chooses immutable scenario ID/frame → Vercel loads graph, weather, and explicit report/closure fixture from committed artifact → score at virtual time → same routing code → result carries `mode`, scenario checksum, and virtual time. Live records are not read into replay.

### 4.4 Runtime budgets

Vercel route handlers use `runtime = 'nodejs'`, `maxDuration = 30`, `preferredRegion = 'bom1'`; admin weather refresh and manual-photo finalize/retry use at most60s. Region must align with the project's available plan/region settings. No dependence on beta large-function limits. Graph/server dependencies must stay below 100 MiB uncompressed; built client assets are separate static files. The documented Node function body limit is 4.5 MB, so photos bypass Vercel entirely. [R24]

Internal route work deadline: 2 s candidate generation after data fetch; hard total handler deadline 20 s with abortable calls. If the candidate generator stops early, include `search_complete:false` and compare only candidates already checked. It must never return an unchecked path.

Lambda: ingestion 512 MiB/60 s; vision 3,072 MiB/120 s with 2,048 MiB ephemeral storage; maintenance 512 MiB/60 s. Zip/layers ≤250 MiB uncompressed. Model weights live in S3 and are cached in `/tmp`, rather than being squeezed into the zip. AWS account quotas are checked before provisioning; new accounts can have reduced memory/concurrency limits. [R26]

## 5. Data acquisition, provenance, and graph construction

### 5.1 Required data inventory

| Source | Use | Resolution / caveat | Acquisition path |
|---|---|---|---|
| OpenStreetMap | Directed pilot road graph, road names, bridge/tunnel tags, turn relations, landmarks | Map completeness and restrictions vary; ODbL attribution and derivative-database obligations apply | One bounded Overpass extraction during build; frozen raw JSON archived in S3 and checksum manifest. [R14–R15] |
| Delhi Traffic Police June 2025 newsletter | Recurrent-hotspot contextual evidence | No complete geocoded label set, no time-stamped negatives | Store URL/page references; manually curate only unambiguous named locations; reviewed geocoding records. [R04] |
| Copernicus DEM GLO-30 public AWS dataset | Coarse local relative-elevation feature | Surface model, approximately 30 m; buildings/bridges contaminate road elevation | During build, unsigned S3 list/get from `copernicus-dem-30m`, `eu-central-1`; select intersecting N28/N29 E077 tile(s), read COG window, compute features offline. [R16] |
| Open-Meteo forecast API | Recent model-derived rainfall and next 1/3 h forcing | Gridded weather-model output, not road observation or gauge truth | Ingestion Lambda every 15 min; nine fixed pilot grid points; exact contract below. [R11–R12] |
| Open-Meteo historical API | Historical-weather scenario | Reanalysis/archival data, not proof a given road flooded or an operational forecast available at that past time | One frozen build-time query for 30 July–1 August 2024; explicit scenario label. [R13] |
| Consented reports | Local observation evidence linked to a road | Manual claims can be incorrect in time/location; review is not field truth | Authenticated form, optional photo, moderation, short validity and separate closure records. |
| HF pretrained artifact | Advisory photo classification | Training domain and independent test overlap not fully known | Download exact safe files by pinned revision in build workflow; see §7. |

Do not ingest Sentinel-2 in the mandatory build. Clouds, revisit, spectral preprocessing, and a land-cover model would add a second substantial pipeline without proving road-scale same-hour flood truth. The supplied Sentinel data suggestion remains future static-feature scope.

### 5.2 Live weather request

Use one fixed-host request; no user supplies a URL, city, model, or query string:

```text
GET https://api.open-meteo.com/v1/forecast
latitude=28.600,28.600,28.600,28.6275,28.6275,28.6275,28.655,28.655,28.655
longitude=77.190,77.2175,77.245,77.190,77.2175,77.245,77.190,77.2175,77.245
hourly=precipitation
past_days=1
forecast_days=2
timezone=UTC
timeformat=unixtime
```

URL-encode parameters. Use `models=best_match` only if accepted by the pinned API contract; the default automatic model selection is sufficient, so the mandatory request omits it. Persist returned latitude/longitude/elevation and returned generation metadata; provider coordinates may differ from requested points. Nearest requested cell assigns roads, but source grid resolution is recorded as unknown unless response/model metadata establishes it. Nine requested points do not imply nine independent high-resolution rainfall sensors.

Response is an array for multiple coordinates. Each item MUST contain `hourly.time`, `hourly.precipitation`, `hourly_units.precipitation="mm"`; arrays equal length; times strictly increasing by 3,600 s; each non-null value finite and 0–300 mm/hour. Values above 300 or negative are quarantined as invalid, not clipped into plausible truth. Reject capture if fewer than nine valid cells or required rolling/forecast windows are unavailable. Response ≤1 MiB; connect timeout 3 s, whole attempt 10 s; retry twice with jitter only on network/408/429/5xx within 35 s total. Honor bounded `Retry-After`; no retry for schema/auth/4xx errors.

Open-Meteo's hourly precipitation is an accumulation over the **preceding hour**. For a frame labeled 14:00, its interval is [13:00,14:00]. Never treat mm as mm/s or as instantaneous rain. [R11]

For effective time `t`, previous rainfall sums use intervals ending ≤floor(t/hour); future sums use intervals starting ≥ceil(t/hour). Omit the partially overlapping current hour; do not invent within-hour rain distribution. Store exact included interval boundaries in reasons/provenance. For +1 h/+3 h views evaluate this same convention at `t+h`, and label future/previous intervals derived from forecast appropriately.

Weather `retrieved_at` is the actual fetch time. `source_issued_at` is nullable: do not call retrieval time the weather-model issuance time if the provider does not return issuance metadata. `valid_from/valid_until` come from returned interval coverage.

Free endpoint is appropriate only for this educational/noncommercial prototype under the published rate/attribution terms. Nine points × 96 captures/day remains small even if billing/counting treats locations independently. Commercial use requires the provider's paid terms or a permitted replacement. [R12]

Build-time historical request uses `GET https://archive-api.open-meteo.com/v1/archive` with the same nine `latitude`/`longitude` lists, `start_date=2024-07-30`, `end_date=2024-08-01`, `hourly=precipitation`, `timezone=UTC`, `timeformat=unixtime`; omit `models` to use the documented default. Apply the same interval/unit/cell checks; preserve returned dataset metadata. This is hindsight reanalysis, explicitly not a forecast known at the historical route decision. Freeze once; no runtime archive API call.

### 5.3 NASA/IMD decision

NASA IMERG is technically valuable historical precipitation evidence, but its Early product has roughly four-hour latency and ~0.1° grid spacing. It cannot be described as fresh street observations. Live implementation does not depend on Earthdata credentials or large HDF5 processing. IMERG and IMD adapters are FUTURE SCOPE until exact endpoint access, licenses, product units, credentials, and latency are validated. No assumed IMD API key or scraped endpoint exists in the mandatory architecture. [R17a]

### 5.4 OSM extraction contract

Build script uses `https://overpass-api.de/api/interpreter`, identifiable application User-Agent, 120 s timeout, max 30 MiB raw response, sequential requests only. Query all motor-road ways in the graph buffer, then relation restrictions referencing those ways and complete node geometry. Persist `osm3s.timestamp_osm_base` and query text. Do not call Overpass for individual route requests. Public servers have finite capacity; once extraction succeeds, reuse the snapshot. [R14]

Required initial Overpass POST form field `data` (latitude order south,west,north,east):

```text
[out:json][timeout:120][maxsize:31457280];
way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|service)$"](28.590,77.180,28.665,77.255)->.roads;
rel(bw.roads)["type"="restriction"]->.restrictions;
(.roads;.restrictions;);
(._;>>;);
out body;
```

Recursion obtains relation member ways/nodes; importer still filters normalized drivable ways and pilot buffer. For the predetermined reduced pilot substitute bbox `(28.600,77.190,28.660,77.250)` only; all other query rules stay fixed. Read bytes with a streaming30MiB cap; fail rather than parsing a truncated graph. DEM tile selection uses floor(min/maxlatitude/longitude) for extraction bounds (normally N28/E077 only), lists actual bucket keys and records them; do not guess a tile filename then treat a missing object as zero elevation.

Allowed `highway`: motorway, motorway_link, trunk, trunk_link, primary, primary_link, secondary, secondary_link, tertiary, tertiary_link, unclassified, residential, living_street, service. Exclude `area=yes`, `access=no/private`, `motor_vehicle=no/private`, `motorcar=no/private`, construction/proposed roads. A more-specific allowed `motorcar` tag can override generic access only when explicitly parsed; unknown conditional restrictions mark affected ways unsupported and exclude them. Exclude ferries, steps, pedestrian/cycle-only roads.

1. Preserve OSM node identity: crossing lines are not connected without shared node IDs. Bridge/tunnel layers therefore do not create false intersections.
2. Split at junctions and geometry intervals so physical pieces are ≤100 m. Interpolate synthetic nodes in projected EPSG:32643; deterministic synthetic IDs are hash-derived strings, not guessed OSM IDs.
3. `physical_key = osm_way_id + ':' + original_span_index + ':' + split_index`. Directed edges are `physical_key + ':f'` and `':r'` where legal. Opposite directions share physical evidence and closures unless a moderator explicitly records a directional closure.
4. Respect `oneway=yes/1/true`, `oneway=-1`, roundabout implied one-way unless overridden, and motorcar-specific direction tags. Unknown direction values exclude the way and enter an import warning.
5. Extract via-node `no_*` and `only_*` motorcar restrictions. Compile allowed transitions `(incoming_edge, outgoing_edge)`. Conditional/time-dependent and via-way restrictions are not silently ignored: exclude their affected from/to ways in this pilot and log the loss. They are future expansion work.
6. Route in state `(node_id,incoming_edge_id)`, checking transitions. Forbid immediate reversal of the same physical piece unless the static legal graph has no outgoing non-reverse transition at that node; explicit turn prohibitions still apply and temporary closures do not create permission for a U-turn; do not join disconnected carriageways based on proximity.
7. Largest usable weakly connected component is retained, but directed reachability is tested per request. The buffer can be traversed; origins/destinations must be inside the supported rectangle.
8. Cap graph at 20,000 directed edges and 15,000 nodes. If exceeded, fail build and use the predeclared inner supported rectangle longitude 77.200–77.240, latitude 28.610–28.650 with the same 0.010° buffer. This is a declared scope reduction, not arbitrary dropping of connecting roads. UI reads the active manifest and shows the actual supported area.
9. Bundle server graph JSON, browser base-road GeoJSON, landmark JSON, and manifest. Public URLs are content-versioned `/pilot/{graph_sha256}/roads.geojson` and `/pilot/{graph_sha256}/landmarks.json`; scenarios use `/scenarios/{artifact_sha256}/{scenario_id}.json`. Return these derived URLs in config/metadata and use immutable caching only for these versioned paths, never a mutable `roads.geojson` URL. Database and bundle hashes MUST match before serving routing. A mismatch returns 503 `GRAPH_VERSION_MISMATCH`.

Static estimated speed defaults: motorway/trunk 50 km/h; primary 35; secondary 30; tertiary/unclassified 25; residential 20; living_street/service 10. Numeric `maxspeed` in km/h or recognized mph is parsed and capped to 5–80; use min(default,maxspeed), not optimistic speeds. Edge time = length / speed + 2 s traversal overhead. Add transition delay 5 s at junctions of out-degree ≥3, otherwise 0; these same delays apply to baseline and alternatives. Estimates exclude traffic and traffic-light timing; display estimated minutes, not a live ETA.

Landmark builder uses real graph junction nodes with≥3 static outgoing edges and nonempty connected road names. Label `Road A / Road B` using up to two distinct normalized names in lexical order; ID=`junction-`+first16hex of SHA256(graph_id+node_id). Point is the exact node location, so it is a road access anchor. Partition support rectangle into5×5 cells, take each cell's junction closest to its center (tie node ID), then sort cell ID and retain at most20; if fewer junctions, retain all and allow map-click input. Names are OSM-derived, not inferred POI coordinates. Display “road junction anchor”; no claim it is a building entrance. Render road names/landmarks/notes with textContent/React escaping, never raw MapLibre popup HTML.

### 5.5 Terrain and hotspot preprocessing

Read Copernicus public COGs only during offline feature build. Project sample locations to EPSG:32643. For each physical piece sample DEM every 30 m along geometry; calculate edge p10 elevation and median elevation within 150 m. Relative depression `D=clip((local_median-edge_p10)/2,0,1)`. Missing/invalid terrain produces `D=null`, not zero. Bridge/tunnel elevation is unreliable: set D null and record `TERRAIN_SURFACE_UNCERTAIN`. OSM underpass/tunnel tag gives independent `U=1`; ordinary roads U=0. Do not use DEM to estimate physical water depth or runoff connectivity.

Hotspot curation JSON contains `name, point, uncertainty_m, source_url, page, quoted_location, geocoded_by, reviewed_by, reviewed_at`. Only named point locations such as Minto Bridge can be promoted after map review. Broad references such as Ring Road, IP Marg, or Pusa Road do not authorize marking the whole named road hazardous. If point uncertainty exceeds 100 m, keep contextual text and exclude from scoring. Default valid point influence: `H=exp(-distance_m/150)`, zero after 600 m. No hotspot found means absence of positive historical evidence, not observed non-flooding.

Build can work with zero curated hotspots but must show coverage limitation and cannot advertise a 57-hotspot implemented layer. At least one independently reviewed, unambiguous hotspot is a demo readiness goal, not a fabricated dataset requirement.

### 5.6 Provenance manifest

Every imported artifact has:

```json
{
  "schema_version": "1.0",
  "artifact_id": "UUID",
  "source_url": "https://official-source.example/path",
  "retrieved_at": "ISO-8601 UTC",
  "source_timestamp": null,
  "sha256": "64 hex characters",
  "license": "identified license or UNKNOWN",
  "license_review": "approved|restricted|blocked",
  "crs": "EPSG:4326",
  "units": {"precipitation":"mm per preceding hour","length":"m"},
  "transform_version": "Git commit SHA",
  "limitations": ["model-derived precipitation"]
}
```

The example source URL above expresses a schema field only; actual manifests contain the real registry URL, never that example. Archive raw weather at `raw/weather/{city}/{YYYY-MM-DD}/{run_uuid}.json`; graph at `curated/graphs/{graph_sha256}/...`; model at `models/{model_revision}/{artifact_sha256}.onnx`; audit batches at `audit/{date}/{batch_id}.jsonl`. Content hashes are checked before processing. Never include secrets, raw personal photographs, or identity records in S3 audit archives.

## 6. Risk engine and routing algorithm

### 6.1 Deterministic ruleset `relative-risk-v1`

All definitions apply to an edge at effective scenario/live time `t`. Constants are engineering priors, not learned/calibrated hydrological parameters.

- H: recurrent-hotspot proximity, 0–1, defined in §5.
- D: coarse relative depression, 0–1; use neutral 0.5 in arithmetic when missing, while reducing evidence coverage.
- U: known underpass/tunnel indicator, 0 or 1.
- Susceptibility `S=0.60H+0.25D_imputed+0.15U`.
- `r1_past`, `r3_past`, `r1_future`, `r3_future`: precipitation sums over complete intervals at selected horizon.
- Rain forcing `F=max(clip(r1_past/10,0,1),clip(r3_past/25,0,1),clip(r1_future/10,0,1),clip(r3_future/25,0,1))`.
- For approved unexpired positive reports on the physical piece: severity weight `standing_water=0.35`, `heavy_water=0.70`, `blocked=1.00`; `E=max(weight*exp(-age_minutes/60))`. Age is max(0,t−observation time), never moderation time; the five-minute future-time tolerance cannot amplify evidence above its severity weight. Reports expire no later than observation+180 min. `clear` does not lower the score. Pending/unreviewed photos do not alter it.
- Relative index `R=clip(0.05+0.65*S*F+0.15*F+0.60*E,0,1)`.

Reports never propagate to unrelated roads merely because coordinates are near. The source piece and its opposite-direction equivalent receive evidence; directional exceptions require explicit moderation. A model photo score is **not** a term in R.

Evidence coverage is `C=clip(0.40W+0.20T+0.20G+0.20L,0,1)`:

- W=1 if capture age ≤30 min, 0.5 if >30–60 min, 0 if older/invalid; source issuance unknown adds a visible reason but no invented age.
- T=1 valid terrain, 0 otherwise.
- G=1 graph snapshot ≤30 days old with imported restrictions supported, 0.5 if older; excluded ways are not assigned false certainty.
- L=1 if reviewed local report age ≤60 min, 0.5 if >60–180 min, 0 otherwise.

C means evidence coverage, **not statistical confidence that R is correct**. Unknown unobserved roads can have no local reports; this does not imply clear passage.

Risk bands: low relative index <0.25, elevated 0.25–<0.50, high 0.50–<0.75, very high ≥0.75. UI labels explicitly contain “index,” display 0–100 without a percent sign, and list incomplete evidence. A valid low index is not a “safe” classification.

### 6.2 Missing/stale behavior

If weather capture age >60 min, or complete rainfall windows are missing, do not calculate a comparable weather-risk R. Set `risk_index:null`, `evidence_status:"unknown"`. Still apply active reviewed closures and show fresh positive report warnings. Route endpoint returns ordinary/closure-aware estimates with `comparison_status:"conditions_unknown"`, `risk_reduction:null`, and no lower-risk recommendation badge.

Use uncached upstream fetching (`cache:'no-store'` for Node; no application cache in Python), validate any HTTP `Age`/`Date` metadata, and reject a clearly expired cached response (Age≥3600s or source response date older60min). Recent retrieval means recent checked access, not a newly issued forecast. A failed ingestion does not update `retrieved_at`. Re-fetching an old cached payload does not reset its age. Replay uses virtual time and fixture source timestamps; its banner remains present even when fixture data appear fresh at that virtual time.

### 6.3 Explanation contract

Return structured reason codes and facts, not open-ended model text. Codes: `RECURRENT_HOTSPOT`, `MODEL_RAIN_RECENT`, `MODEL_RAIN_FORECAST`, `LOW_RELATIVE_ELEVATION`, `UNDERPASS`, `REVIEWED_POSITIVE_REPORT`, `REVIEWED_CLOSURE`, `TERRAIN_MISSING`, `TERRAIN_SURFACE_UNCERTAIN`, `WEATHER_STALE`, `SOURCE_ISSUANCE_UNKNOWN`, `NO_LOCAL_OBSERVATION`, `CONFLICTING_REPORTS`, `GRAPH_OLD`, `REPLAY_SCENARIO`.

Examples: “Recurrent hotspot within 120 m; model-derived precipitation 12 mm in the last three complete hours; reviewed standing-water report 24 minutes old.” Hindi text comes from a checked-in dictionary using the same values. Do not infer a driver's ability to cross water. Contradictory clear and positive reports add `CONFLICTING_REPORTS`; they cannot silently cancel positive evidence.

### 6.4 Route objective and constrained candidate search

Let T(P) be summed edge + transition seconds. Let `X(P)=sum(length_m*R)` be modeled risk-weighted meters and `U(P)=sum(length_m*(1-C))`. Selection objective `J(P)=X(P)+0.25U(P)`. Report X and U separately. `high_index_length_m=sum(length_m where R≥0.50)` and route `evidence_coverage=sum(length_m*C)/sum(length_m)`; both null when comparison is unknown. J is an engineering preference, not expected fatalities or probability of flooding. Never compute `1-product(1-R)` because R is not a probability and edges are correlated.

1. Validate endpoints in active rectangle; snap each to the nearest eligible graph node within 120 m, using Haversine distance with Earth radius6,371,008.8m and breaking exact-distance ties by node ID. Return snap distance and explicit access-distance notice. Do not fabricate drivable connector roads between input and snapped nodes. If both snap to same node return 422 `TRIP_TOO_SHORT`; if no node within 120 m return 422 `POINT_NOT_ON_NETWORK`.
2. Compute ordinary baseline shortest time T0 on legal graph transitions **without waterlogging closures**. Its closure crossings are shown as unavailable, never recommended. If no legal baseline, return `NO_NETWORK_ROUTE`.
3. Compute cap `Tcap=T0*(1+detour_fraction)` using full precision before display rounding.
4. Remove active closed transitions/edges. On this graph compute shortest-time path and seven weighted Dijkstra paths with `lambda∈{0.5,1,2,4,8,16,32}` and edge cost `time_s + lambda*(length_m/10)*(R+0.25*(1-C))`; transition delay remains in the cost. Costs are nonnegative. If risk unknown, compute only closure-aware shortest time.
5. Add up to 12 Yen loopless shortest-time paths, using the same turn-expanded graph. Stop at 2 s wall time or 150,000 state expansions across all searches. Candidates found before stopping remain usable after validation. De-duplicate by ordered edge IDs.
6. Recompute actual T/X/U/J from path edges. Reject loops, illegal turns, active closures, disconnected geometry, missing edges, and T>Tcap+1e-6. Include baseline only if it crosses no closure.
7. Rank feasible candidates by J, then T, then lexical edge-ID sequence. The best is the candidate for a recommendation, subject to the improvement gate in step9. Return up to two alternatives non-dominated in(T,X,U), with different edge sequences; for unknown risk use time/distance only. Overlap is shared directed-edge length divided by the shorter route length. Suppress a separate alternative if overlap>95%, time difference≤1s, X difference≤1m and U difference≤1m.
8. If no feasible closure-free candidate exists, return 200 `no_feasible_route`, baseline marked unavailable where relevant, and optionally shortest closure-free path as **over_budget**, never as the recommendation. Let the user explicitly increase cap.
9. If best J≥baseline J or best X≥baseline X (tolerance1e-6), set status `no_lower_risk_option`, recommendation null, show checked feasible paths as ordinary/closure-aware alternatives, and state “No lower modeled-risk option found within this detour.” A closure-unavailable baseline remains only a reference. Set reduction null in this state; do not manufacture an improvement. If baseline X=0, reduction percentage is null. Otherwise `100*(X0-Xbest)/X0`, named `modeled_exposure_reduction_pct`.

Search finds a bounded candidate-set optimum, not the global resource-constrained optimum. Candidate budgets and `search_complete` are part of result metadata. Test this statement and the detour invariant; do not promote it to “guaranteed safest route.”

### 6.5 Decision snapshot

Live planning uses the single-statement-snapshot `live_route_context` RPC in §11.6. Reviewed closures active at the current capture time remain excluded for all three forecast horizons; an expiry is not a forecast that a road will reopen. The positive-report term uses its own effective-time expiry/decay; current closures/warnings remain visible separately. Scenario mode uses only fixture closures at its virtual clock.

Each response includes `graph_version`, `graph_sha256`, `weather_run_id`, `ruleset_id`, effective time, accepted report IDs, active override IDs, algorithm configuration hash, candidate count, search completeness, and computation time. These references allow deterministic reconstruction while reports themselves are private. An API caller cannot retrieve report identity/photo merely from an evidence ID.

## 7. Hugging Face models and inference deployment

### 7.1 Model requirements derived from the task

Road-risk computation is deterministic fusion/graph optimization; no existing pretrained HF model has been verified to map these Delhi edge/weather/report inputs to calibrated road-flood probabilities. Inventing such a model ID or treating a general flood dataset as its training set would be wrong.

The useful ML task in this build is narrower: **does a submitted photograph visually resemble a flooded scene?** It assists review and flags disagreement with the user's category. It cannot identify the actual location, timestamp, water depth, drivability, cause of flooding, or authenticity of a photo.

### 7.2 Selection and availability

| Candidate | Fit and deployment evidence | Decision |
|---|---|---|
| `prithivMLmods/Flood-Image-Detection` | Published binary flooded-scene/non-flooded classifier, SigLIP2-derived, 92.9M parameters, approximately 372 MB FP32 safe weights, Apache-2.0 model tag. Current model page explicitly says no Inference Provider deployment. Model-card metrics are author-reported, not Delhi validation. [R18–R19] | Select for advisory binary photo review; implement CPU ONNX serving on Lambda. |
| `google/siglip2-base-patch16-224` / `onnx-community/siglip2-base-patch16-224-ONNX` | General image/text encoder, deployable ONNX artifacts; ONNX page says no provider deployment. Strong generic representation, but not a published binary flood head. [R20] | Do not replace a task-specific classifier with prompt similarity merely for convenience. Potential later embedding baseline. |
| `openai/clip-vit-base-patch32` | Generic zero-shot image classifier. Current page also says no Inference Provider deployment. [R20a] | No direct-HF assumption; generic prompt sensitivity and domain limitations make it weaker for this narrow advisory task. |
| `Qwen/Qwen3-VL-8B-Instruct` | General VLM; current page lists Featherless AI for image-text-to-text. No authenticated call or road-flood benchmark performed here. [R21] | Strongest directly provider-listed visual-reasoning comparator reviewed, not proven best binary flood classifier. Excluded from default due to generative ambiguity, provider cost/availability, and unnecessary external-LLM dependency. |
| FloodNet/Prithvi/satellite flood segmentation candidates | Aerial/multispectral/SAR inputs differ from citizen photos; raw data and required preprocessing not in the user's photo workflow | Exclude from hackathon. Drone/satellite model outputs cannot be applied directly to RGB ground photographs. |

“Closest task fit” refers to input/label alignment, not a measured superiority claim. The selected model's training-dataset linkage is recorded in the model manifest. Its author-reported performance must not be copied into the product as our accuracy.

### 7.3 Non-direct-HF inference path

**Chosen path:** public Hugging Face safe weights → offline export to ONNX → private S3 artifact → AWS Lambda Python ONNX Runtime CPU → DB result. This makes the model inference-accessible within the allowed ecosystem, with no permanent GPU, container service, or HF dedicated endpoint.

Build-time procedure:

1. Resolve the current model commit to a full revision SHA; commit `models/manifest.json`. Use exact case `prithivMLmods/Flood-Image-Detection`, not the lowercased example in the model card.
2. Download only `config.json`, `preprocessor_config.json`, `model.safetensors`, README/license evidence using `huggingface_hub.snapshot_download(revision=resolved_sha, allow_patterns=[...])`. Never load `training_args.bin` or checkpoint pickle files; `trust_remote_code=False`.
3. Load `SiglipForImageClassification` in float32 on CPU with eager attention, eval mode. Wrap forward to expose logits only. Use the pinned image processor on fixed `[1,3,512,512]` input.
4. Export fixed-shape ONNX opset 17, input `pixel_values`, output `logits`, constant folding, no dynamic batch, using PyTorch legacy exporter (`dynamo=False`). Run `onnx.checker.check_model` and CPU ONNX Runtime on fixture images.
5. Optional deterministic optimization: dynamic int8 MatMul/Gemm quantization with per-channel weights. **Default deployed artifact is FP32** unless int8 passes parity gates below. A large artifact is supported because it downloads from S3 to `/tmp`, not into the Lambda deployment zip.
6. Export the preprocessing recipe directly from the resolved processor JSON. Expected spatial size is 512×512, RGB, processor-specified resize/rescale/normalization. Lambda reproduces this recipe with Pillow/NumPy. A test compares processor tensor and Lambda tensor; do not assume generic ImageNet normalization.
7. Hash ONNX/preprocessor/labels. Upload under immutable S3 keys. CI rejects a changed model revision without a manifest/evaluation update.

Suggested known-compatible export environment, pinned in a lockfile: Python 3.12, `torch==2.6.0` CPU, `transformers==4.51.3`, `onnx==1.17.0`, `onnxruntime==1.22.1`, `numpy==2.2.6`, `Pillow==11.2.1`; separately lock transitive dependencies and run dependency/security checks before deployment. These version choices are an implementation baseline, not a claim they are the latest. If a security fix requires upgrading, update lockfiles and rerun parity; do not use unbounded versions.

Runtime does not install/download from HF or pip. Worker zip contains only code, ONNX Runtime, NumPy, Pillow, Supabase HTTP client dependencies, and pinned AWS SDK dependencies; build manylinux-compatible CPython 3.12 x86_64 wheels. SAM packages the zip through S3 if compressed size exceeds 50 MiB. No Docker image is deployed. A temporary build container is optional for reproducible wheel packaging; no maintained container infrastructure is introduced.

### 7.4 Photo inference contract

Input: DB job ID; server-owned original Storage path; JPEG/PNG/WebP ≤3 MiB, decoded dimensions ≤4 million pixels, no animated image or multipage file. Detect format from bytes, not extension. Treat Pillow decompression warnings as errors. Parse EXIF orientation then remove EXIF and re-encode JPEG at quality 85, max long side 1600 for the review copy. Require the encoded copy ≤512 KiB: try quality85,75,65 at long side1600, then the same qualities at1200 and800; choose the first compliant copy. If none meets the bound, fail `PROCESSED_IMAGE_TOO_LARGE`. Pillow and Sharp fallback implement the same ordering; model preprocessing starts from the chosen sanitized copy. The model receives the processed RGB image through its exact 512×512 recipe.

Output:

```json
{
  "schema_version":"1.0",
  "model_id":"prithivMLmods/Flood-Image-Detection",
  "model_revision":"full pinned SHA from manifest",
  "artifact_sha256":"actual exported artifact hash",
  "scores":{"flooded_scene":0.82,"non_flooded":0.18},
  "advisory":"flooded_scene_likely",
  "calibrated":false,
  "location_verified":false,
  "depth_estimated":false,
  "latency_ms":1234
}
```

Numbers above illustrate the JSON shape, not an executed result. Label ordering follows resolved config plus model-card mapping: class 0 flooded scene, class 1 non-flooded; fail export if inconsistent. Softmax scores are model confidences, not local flood probabilities. Advisory: score0 ≥0.8 → `flooded_scene_likely`; score0 ≤0.2 → `non_flooded_scene_likely`; otherwise `uncertain`. These thresholds are review rules; they are not validated operating points. Reviewer may override with a recorded reason.

Delete original after successful sanitized-copy creation and commit. If commit fails, retry using existing processed object; do not delete the only evidence first. Failed raw uploads expire within 24 h. No public photo URLs are generated. No sensitive user text or coordinates are sent to a third-party inference provider.

### 7.5 Deployment gates and fallback

- FP32 PyTorch versus ONNX max absolute logit error ≤1e-3 on ≥20 consented fixtures; preprocessing error ≤1e-5. If failure, repair export; do not declare inference ready.
- Optional int8: score error ≤0.03, ≥99% agreement on a ≥100-image parity set, and no new high-confidence non-flooded classification for a flooded fixture. Otherwise use FP32.
- Measured Lambda peak RSS <2.5 GiB at 3 GiB allocation; ordinary warm inference ≤30 s and cold job processing <110 s on deployed region. Targets, not existing measurements.
- If ONNX export fails, the first fixed fallback is manual review with vision flagged unavailable. Core routing remains usable. Do not introduce a GPU endpoint or pretend the CV feature passed. A classifier-enabled final submission requires actual export/invocation evidence.
- If memory/time gates fail, optimize ORT/session settings and rerun once; do not replace the model with an unrelated easier model silently. If still failing, omit the advisory capability visibly and keep manual review. The complete decision aid can still be demonstrated honestly.

### 7.6 AWS versus directly served HF alternative

| Dimension | Selected binary classifier on Lambda | Provider-listed Qwen3-VL-8B through HF |
|---|---|---|
| Task alignment | Fixed flood/non-flood labels; model provenance limitations remain | Richer road-scene explanations but uncalibrated generative judgments; not verified on this binary task |
| Quality evidence | Author model-card report; no independent Delhi result | General VLM documentation; no head-to-head flood result. No superiority claim |
| Latency | Measured at deployment; cold artifact download can be tens of seconds; async acceptable | Network/provider queue and generated-token latency; authenticated measurement required |
| Reliability | Our durable queue/lease, owned pinned artifacts, fallback manual review | Provider mapping can change; paid availability/quota must be verified |
| Complexity | One export/parity workflow and one CPU worker | Simpler initial API call, harder deterministic outputs/privacy/prompt control |
| Cost | AWS credits cover CPU inference; bounded to low-volume budget | Separate HF/provider billing, not AWS credits; no verified fixed per-photo quote here |
| Privacy | Photo remains in chosen Supabase/AWS trust boundary | Sends evidence to an additional model provider |
| Hackathon value | Meaningful AWS inference, inspectable fixed result | Weaker AWS contribution and extra LLM dependency |

Selected because this is a small fixed classification aid, not visual reasoning/chat. The evidence does not support declaring it universally better than Qwen. HF Hub presence and a provider listing are different availability levels; authenticated calls are an additional deployment check. [R22]

## 8. Kaggle dataset decisions and evaluation data contracts

### 8.1 Research results and honest availability

| Kaggle source | Purpose considered | Fields / accessibility evidence | Final use |
|---|---|---|---|
| `saurabhshahane/roadway-flooding-image-dataset` | External flood-photo evaluation candidate | Dataset page/listing exists; accessible research did not expose file inventory, exact classes, license, collection metadata, or duplicate overlap. These are **unverified**, not assumed. [R23] | Optional evaluation import only after metadata/license inspection. Not a mandatory runtime/training dependency. |
| `rajanand/rainfall-in-india` | India rainfall climatology | Monthly subdivision aggregation is not road-hour flood ground truth; page exists but full bytes/schema were not inspected in this session. [R23a] | Rejected for route-risk training or live rainfall. No required download. |
| UrbanFloodBench Kaggle competition | Hydraulic/urban flood modeling research | Competition data page explicitly warns its Kaggle upload is incomplete and for exploration. [R23b] | Rejected as a turnkey Delhi road-label set; license/competition terms would need separate review. |
| Generic tabular “flood prediction” datasets | Supervised risk | No verified Delhi roads, storm timing, negative-observation provenance, and deployment-matched covariates | Rejected. Do not train on an unrelated/synthetic table and claim road-scale validation. |

There is no evidence-backed Kaggle Delhi road-segment storm dataset in this research. The specification therefore avoids a critical dependency on one. Official OSM/weather/terrain are operational geospatial/meteorological sources; Kaggle is the chosen route for any **additional external ML dataset**, subject to provenance/licensing gates. Existing pretrained-model training provenance is preserved rather than replaced by an invented Kaggle origin.

### 8.2 Optional Kaggle photo evaluation importer

After license review, operator runs `kaggle datasets metadata ...` and authenticated download using Kaggle's supported CLI; record metadata, exact dataset version, file list, archive hash, license URL/text, and authorship in `evaluation/datasets/kaggle_manifest.json`. Do not publish Kaggle files or photographs in the public repo without permission. Any manually accepted license is recorded before import; unknown license blocks import.

Convert images into our **canonical evaluation schema**, not an asserted original Kaggle schema:

```text
sample_id:string, relative_path:string, image_sha256:string,
phash:string, source_dataset:string, source_version:string,
source_item_id:string|null, label: flooded_scene|non_flooded|ambiguous,
scene_group:string, storm_id:string|null, geography:string|null,
label_provenance:string, license:string, split:dev|test
```

Importer never guesses class labels from file order. Explicit `labels.csv` supplied by reviewed dataset metadata or human annotation is mandatory. A folder-to-label mapping can be used only when file inspection establishes folder semantics and the mapping is committed. Missing fields remain null/unknown and are excluded from event/geography claims.

Preprocessing: validate image bounds and format; exact SHA dedup; pHash clustering with Hamming distance ≤6 and manual confirmation; group near-duplicates/same scene before split; apply the model's inference preprocessing without train-time augmentation. Compare hashes and image similarities with any legally accessible model training examples; because complete original training provenance may be unavailable, mark independence uncertain and do not report the set as a definitive independent benchmark.

External photo data do not supply Delhi road-event positives or negatives. Their model score can evaluate visual evidence classification only.

### 8.3 Required local engineering fixtures

Use consented team photographs/owned images and explicitly synthetic graph/weather/report fixtures for unit/E2E tests. At least 20 diverse image fixtures validate export; ≥100 can evaluate approximate photo behavior if available, including dry wet roads, puddles, rivers/lakes, indoor scenes, night glare, reflections, and obstructed views. Without sufficient labeled diversity, report only parity/engineering results, not generalization accuracy.

Road evaluation canonical record:

```text
edge_id, graph_version, storm_id, observed_at, flooded:boolean|null,
severity:standing_water|heavy_water|blocked|clear|unknown,
evidence_url_or_private_id, observer_method, coverage_method,
label_confidence:high|medium|low, collected_at, input_available_at
```

A missing report is **not** a negative label. Verified dry-road observations at the same event/time are needed for negatives. Do not use a report both as an input and the later evaluation label for the same decision without a valid time cutoff.

## 9. NVIDIA NIM decision

**IMPLEMENT FOR HACKATHON: no NVIDIA inference call.** The product's intelligence consists of pretrained photo classification, evidence fusion, and graph optimization; structured reports and deterministic bilingual explanations need no external LLM. This is an intentional architecture decision, not a missing box or hidden provider.

Reviewed reference candidate: `meta/llama-3.1-8b-instruct`, text generation via documented `POST https://integrate.api.nvidia.com/v1/chat/completions`, `Authorization: Bearer NVIDIA_API_KEY`. NVIDIA's current model catalog marks its free endpoint deprecated while partner/download paths remain. Documentation is not proof our account can invoke a free hosted service. [R25]

FUTURE SCOPE, gated by actual account/model availability: generate a concise operator summary from already validated route facts, with temperature 0, max_tokens 200, no tools, no photos, no raw free-text reports, 8 s timeout, no critical routing influence. JSON facts are the only context; output is validated and labeled generated; deterministic text remains fallback. Do not implement self-hosted NIM GPU/container infrastructure or a partner subscription inside the $100 AWS budget. This future hook introduces no mandatory environment variable or endpoint in the hackathon build.

## 10. Supabase database and security migrations

### 10.1 Database contract

Use hosted Supabase in Mumbai when available, with Postgres ≥15. PostGIS lives in dedicated `gis`; `private` is not exposed to PostgREST. Only `public` is exposed. Every public application table has RLS enabled. Client writes to application tables are revoked; all mutations flow through authenticated/authorized Vercel handlers. Owner/reviewer read policies remain defense in depth for direct Data API access.

The SQL blocks in §10.2,§10.3,§11.5,§11.6 together form one complete contract migration; concatenate them in that order, retaining the single opening BEGIN and final COMMIT. The separate §18 seed is applied after that migration. During implementation create the migration with `supabase migration new monsoonroute_contract`, then put this SQL into the generated file. Do not invent an applied migration timestamp or depend on dashboard-created tables. Do not use `CREATE EXTENSION ... VERSION ...`; current Supabase changelog describes extension-version pinning changes. [R30]

`gen_random_uuid()` is a Postgres built-in in the supported baseline. If PostGIS already exists in another schema, setup must detect it and fail with an explicit migration prerequisite; do not create conflicting extension copies or silently alter an existing unrelated project's objects. Use a new dedicated project.

### 10.2 Baseline SQL

```sql
begin;
create schema if not exists gis;
create schema if not exists private;
create extension if not exists postgis with schema gis;

create table public.cities (
  id text primary key,
  name text not null,
  supported_bbox gis.geometry(Polygon,4326) not null,
  active_graph_id uuid,
  created_at timestamptz not null default now()
);
create table public.data_sources (
  id text primary key,
  name text not null,
  source_url text not null check (source_url ~ '^https://'),
  license text not null,
  limitations text[] not null default '{}'
);
create table public.source_artifacts (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.data_sources(id),
  retrieved_at timestamptz not null,
  source_timestamp timestamptz,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  object_key text,
  license_review text not null check (license_review in ('approved','restricted','blocked')),
  metadata jsonb not null default '{}',
  unique(source_id,sha256)
);
create table public.graph_versions (
  id uuid primary key default gen_random_uuid(),
  city_id text not null references public.cities(id),
  source_artifact_id uuid not null references public.source_artifacts(id),
  sha256 text not null unique check (sha256 ~ '^[a-f0-9]{64}$'),
  captured_at timestamptz not null,
  node_count integer not null check (node_count between 1 and 15000),
  edge_count integer not null check (edge_count between 1 and 20000),
  manifest jsonb not null,
  state text not null default 'staging' check (state in ('staging','published','retired')),
  unique(id,city_id)
);
alter table public.cities add constraint cities_active_graph_fk
  foreign key (active_graph_id,id) references public.graph_versions(id,city_id);
create table public.road_nodes (
  graph_id uuid not null references public.graph_versions(id) on delete cascade,
  node_id text not null,
  geom gis.geometry(Point,4326) not null,
  primary key(graph_id,node_id)
);
create table public.road_edges (
  graph_id uuid not null references public.graph_versions(id) on delete cascade,
  edge_id text not null,
  physical_key text not null,
  from_node text not null,
  to_node text not null,
  osm_way_id bigint not null,
  name text,
  highway text not null,
  geom gis.geometry(LineString,4326) not null,
  length_m double precision not null check (length_m > 0 and length_m <= 105),
  time_s double precision not null check (time_s between 0.001 and 100000),
  hotspot_factor double precision not null check (hotspot_factor between 0 and 1),
  depression_factor double precision check (depression_factor between 0 and 1),
  underpass boolean not null default false,
  terrain_valid boolean not null default false,
  tags jsonb not null default '{}',
  primary key(graph_id,edge_id),
  foreign key(graph_id,from_node) references public.road_nodes(graph_id,node_id),
  foreign key(graph_id,to_node) references public.road_nodes(graph_id,node_id),
  check(from_node<>to_node),
  check(gis.st_npoints(geom)>=2)
);
create table public.turn_restrictions (
  graph_id uuid not null,
  from_edge text not null,
  to_edge text not null,
  via_node text not null,
  reason text not null,
  primary key(graph_id,from_edge,to_edge),
  foreign key(graph_id,from_edge) references public.road_edges(graph_id,edge_id),
  foreign key(graph_id,to_edge) references public.road_edges(graph_id,edge_id),
  foreign key(graph_id,via_node) references public.road_nodes(graph_id,node_id)
);
create table public.hotspots (
  id uuid primary key default gen_random_uuid(),
  city_id text not null references public.cities(id),
  source_artifact_id uuid not null references public.source_artifacts(id),
  name text not null,
  geom gis.geometry(Point,4326) not null,
  uncertainty_m double precision not null check (uncertainty_m>=0),
  usable boolean not null default false,
  source_page text not null,
  location_text text not null,
  review jsonb not null,
  check(not usable or uncertainty_m<=100)
);
create table public.weather_runs (
  id uuid primary key,
  city_id text not null references public.cities(id),
  artifact_id uuid not null references public.source_artifacts(id),
  kind text not null check (kind in ('forecast','reanalysis')),
  retrieved_at timestamptz not null,
  source_issued_at timestamptz,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  expected_rows integer not null check (expected_rows>=9),
  metadata jsonb not null,
  state text not null check (state in ('staging','published')),
  check(valid_until>valid_from)
);
create table public.weather_hourly (
  run_id uuid not null references public.weather_runs(id) on delete cascade,
  cell_id smallint not null check (cell_id between 0 and 8),
  requested_point gis.geometry(Point,4326) not null,
  provider_point gis.geometry(Point,4326) not null,
  interval_end timestamptz not null,
  precipitation_mm double precision not null check (precipitation_mm between 0 and 300),
  primary key(run_id,cell_id,interval_end)
);
create table public.scenarios (
  id text primary key,
  city_id text not null references public.cities(id),
  graph_id uuid not null references public.graph_versions(id),
  title text not null,
  kind text not null check(kind in ('synthetic','historical_weather','historical_observed')),
  artifact_sha256 text not null check (artifact_sha256 ~ '^[a-f0-9]{64}$'),
  artifact_path text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  description text not null,
  provenance jsonb not null,
  public_visible boolean not null default true,
  check(end_at>start_at)
);
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name)<=80),
  created_at timestamptz not null default now()
);
create table private.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check(role in ('moderator','admin')),
  assigned_at timestamptz not null default now()
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  client_nonce uuid not null,
  request_sha256 text not null check(request_sha256 ~ '^[a-f0-9]{64}$'),
  graph_id uuid not null,
  edge_id text not null,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  category text not null check(category in ('standing_water','heavy_water','blocked','clear')),
  point gis.geometry(Point,4326) not null,
  note text not null default '' check(length(note)<=500),
  photo_original_path text,
  photo_processed_path text,
  photo_mime text check(photo_mime in ('image/jpeg','image/png','image/webp')),
  status text not null default 'draft'
    check(status in ('draft','pending','approved','rejected','resolved','withdrawn')),
  review_version integer not null default 0 check(review_version>=0),
  reviewed_by uuid references auth.users(id) on delete set null,
  review_reason text check(length(review_reason)<=1000),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key(graph_id,edge_id) references public.road_edges(graph_id,edge_id),
  unique(user_id,client_nonce),
  check(observed_at<=created_at+interval '5 minutes'),
  check(observed_at>=created_at-interval '3 hours'),
  check(expires_at>observed_at and expires_at<=observed_at+interval '3 hours')
);
create table public.road_overrides (
  id uuid primary key default gen_random_uuid(),
  graph_id uuid not null,
  edge_id text not null,
  scope text not null check(scope in ('physical','directed')),
  report_id uuid references public.reports(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  reason text not null check(length(reason) between 5 and 1000),
  created_at timestamptz not null default now(),
  valid_until timestamptz not null,
  revoked_at timestamptz,
  foreign key(graph_id,edge_id) references public.road_edges(graph_id,edge_id),
  check(valid_until>created_at and valid_until<=created_at+interval '2 hours')
);
create table public.vision_jobs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.reports(id) on delete cascade,
  state text not null default 'queued' check(state in ('queued','running','succeeded','failed')),
  attempts integer not null default 0 check(attempts>=0),
  lease_token uuid,
  lease_until timestamptz,
  last_enqueue_at timestamptz,
  inference_config jsonb not null,
  source_sha256 text check(source_sha256 ~ '^[a-f0-9]{64}$'),
  result jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(state<>'running' or (lease_token is not null and lease_until is not null))
);
create table public.route_requests (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  city_id text not null references public.cities(id),
  graph_id uuid not null references public.graph_versions(id),
  weather_run_id uuid references public.weather_runs(id) on delete set null,
  scenario_id text references public.scenarios(id) on delete set null,
  ruleset_id text not null,
  mode text not null check(mode in ('live','scenario')),
  save_history boolean not null default false,
  effective_at timestamptz not null,
  request jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  check(not save_history or user_id is not null),
  check((mode='live' and scenario_id is null) or (mode='scenario' and scenario_id is not null))
);
create table public.audit_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  entity_id text not null,
  request_id uuid,
  details jsonb not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  archive_key text,
  check((archived_at is null)=(archive_key is null))
);
create table public.service_status (
  name text primary key,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_code text,
  summary jsonb not null default '{}'
);
create table private.quota_buckets (
  bucket text not null,
  subject_hash text not null,
  window_start timestamptz not null,
  used integer not null check(used>0),
  expires_at timestamptz not null,
  primary key(bucket,subject_hash,window_start)
);
create table private.runtime_settings (
  name text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index road_nodes_geom_idx on public.road_nodes using gist(geom);
create index road_edges_geom_idx on public.road_edges using gist(geom);
create index road_edges_physical_idx on public.road_edges(graph_id,physical_key);
create index hotspots_geom_idx on public.hotspots using gist(geom);
create index weather_latest_idx on public.weather_runs(city_id,retrieved_at desc)
  where state='published' and kind='forecast';
create index reports_active_idx on public.reports(graph_id,status,expires_at);
create index reports_owner_idx on public.reports(user_id,created_at desc);
create index overrides_active_idx on public.road_overrides(graph_id,valid_until)
  where revoked_at is null;
create index jobs_recovery_idx on public.vision_jobs(state,last_enqueue_at,lease_until);
create index history_owner_idx on public.route_requests(user_id,created_at desc)
  where save_history;
create index audit_created_idx on public.audit_events(created_at);
create index audit_unarchived_idx on public.audit_events(id) where archived_at is null;
create index quotas_expiry_idx on private.quota_buckets(expires_at);

insert into private.runtime_settings(name,value) values
  ('aws_enabled','true'),('vision_enabled','true'),('photos_enabled','true'),
  ('weather_ingest_enabled','true') on conflict do nothing;

-- Non-exposed helper: auth identity check before privileged role lookup.
create or replace function private.is_reviewer()
returns boolean language sql stable security definer set search_path=''
as $$
  select auth.uid() is not null and exists (
    select 1 from private.user_roles r
    where r.user_id=(select auth.uid()) and r.role in ('moderator','admin')
  )
$$;
revoke all on function private.is_reviewer() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_reviewer() to authenticated;

-- Explicit application table RLS; no inherited broad privileges.
do $$ declare t text; begin
  foreach t in array array[
    'cities','data_sources','source_artifacts','graph_versions','road_nodes',
    'road_edges','turn_restrictions','hotspots','weather_runs','weather_hourly',
    'scenarios','profiles','reports','road_overrides','vision_jobs',
    'route_requests','audit_events','service_status'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;
-- Tables without client policies stay backend-only.
grant select on public.profiles,public.reports,public.route_requests to authenticated;
grant select(id,report_id,state,attempts,result,error_code,created_at,updated_at)
  on public.vision_jobs to authenticated;
create policy profile_owner_read on public.profiles for select to authenticated
  using(user_id=(select auth.uid()));
create policy report_owner_or_reviewer_read on public.reports for select to authenticated
  using(user_id=(select auth.uid()) or (select private.is_reviewer()));
create policy job_owner_or_reviewer_read on public.vision_jobs for select to authenticated
  using(exists(select 1 from public.reports r where r.id=report_id
    and (r.user_id=(select auth.uid()) or (select private.is_reviewer()))));
create policy history_owner_read on public.route_requests for select to authenticated
  using(save_history and user_id=(select auth.uid()));
revoke all on all tables in schema private from anon,authenticated;
grant usage on schema private,gis to service_role;
grant all on all tables in schema private to service_role;
grant usage,select on sequence public.audit_events_id_seq to service_role;
-- No public SELECT policy exposes photos, personal positions, or moderation actors.

-- Atomic quota check: server supplies trusted limit/window; callers cannot choose them.
create or replace function public.consume_quota(
  p_bucket text,p_subject_hash text,p_limit integer,p_window_seconds integer
) returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v_start timestamptz; v_used integer;
begin
  if p_limit<1 or p_window_seconds<1 or p_window_seconds>86400
    or length(p_subject_hash)<>64 then raise exception 'INVALID_QUOTA_ARGUMENT'; end if;
  v_start:=to_timestamp(floor(extract(epoch from clock_timestamp())/p_window_seconds)*p_window_seconds);
  insert into private.quota_buckets(bucket,subject_hash,window_start,used,expires_at)
  values(p_bucket,p_subject_hash,v_start,1,v_start+make_interval(secs=>p_window_seconds*2))
  on conflict(bucket,subject_hash,window_start) do update
    set used=private.quota_buckets.used+1
    where private.quota_buckets.used<p_limit
  returning used into v_used;
  return jsonb_build_object('allowed',v_used is not null,'used',v_used,
    'reset_at',v_start+make_interval(secs=>p_window_seconds));
end $$;
revoke all on function public.consume_quota(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_quota(text,text,integer,integer) to service_role;

-- Lease token prevents stale workers from committing after a retry has claimed the job.
create or replace function public.claim_vision_job(p_job_id uuid,p_token uuid)
returns setof public.vision_jobs language sql security invoker set search_path=''
as $$
  update public.vision_jobs set state='running',attempts=attempts+1,
    lease_token=p_token,lease_until=now()+interval '3 minutes',updated_at=now()
  where id=p_job_id and attempts<3
    and (state='queued' or (state='running' and lease_until<now()))
  returning *
$$;
revoke all on function public.claim_vision_job(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_vision_job(uuid,uuid) to service_role;

create or replace function public.finish_vision_job(
  p_job_id uuid,p_token uuid,p_processed_path text,p_result jsonb,p_error_code text
) returns boolean language plpgsql security invoker set search_path=''
as $$
declare v_report uuid; v_owner uuid; v_expected text; v_status text;
begin
  select report_id into v_report from public.vision_jobs where id=p_job_id;
  if not found then return false; end if;
  -- Lock order is report then job, identical to withdrawal/admin retry.
  select user_id,status into v_owner,v_status from public.reports
    where id=v_report for update;
  if not found or v_owner is null or v_status in ('draft','withdrawn') then return false; end if;
  perform 1 from public.vision_jobs where id=p_job_id and state='running'
    and lease_token=p_token and lease_until>now() for update;
  if not found then return false; end if;
  if p_error_code is null then
    if v_owner is null then raise exception 'REPORT_OWNER_REMOVED'; end if;
    v_expected:=v_owner::text||'/'||v_report::text||'/processed.jpg';
    if p_processed_path<>v_expected or p_result is null then
      raise exception 'INVALID_VISION_RESULT'; end if;
    update public.reports set photo_processed_path=p_processed_path where id=v_report;
  end if;
  update public.vision_jobs set state=case when p_error_code is null then 'succeeded' else 'failed' end,
    result=p_result,error_code=p_error_code,lease_token=null,lease_until=null,updated_at=now()
    where id=p_job_id;
  insert into public.audit_events(event_type,entity_id,details)
    values('vision_finished',p_job_id::text,jsonb_build_object('error_code',p_error_code));
  return true;
end $$;
revoke all on function public.finish_vision_job(uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.finish_vision_job(uuid,uuid,text,jsonb,text) to service_role;

-- Moderation and closure publication occur in one transaction with optimistic revision.
create or replace function public.moderate_report(
  p_actor uuid,p_report uuid,p_expected_version integer,p_action text,
  p_reason text,p_close_minutes integer default 0,p_scope text default 'physical'
) returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v public.reports; v_override uuid;
begin
  if not exists(select 1 from private.user_roles where user_id=p_actor
    and role in ('moderator','admin')) then raise exception 'FORBIDDEN'; end if;
  if p_action not in ('approve','reject','resolve') or length(p_reason) not between 5 and 1000
    or p_close_minutes not between 0 and 120 or p_scope not in ('physical','directed') then
    raise exception 'INVALID_REVIEW'; end if;
  select * into v from public.reports where id=p_report for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v.review_version<>p_expected_version then raise exception 'REVISION_CONFLICT'; end if;
  if v.status='draft' or v.status='withdrawn' then raise exception 'INVALID_REPORT_STATE'; end if;
  if p_action='approve' and v.expires_at<=now() then raise exception 'REPORT_EXPIRED'; end if;
  if p_action='approve' and v.photo_original_path is not null and v.photo_processed_path is null then
    raise exception 'PHOTO_PROCESSING'; end if;
  if p_close_minutes>0 and (p_action<>'approve' or v.category<>'blocked') then
    raise exception 'CLOSURE_REQUIRES_BLOCKED_REPORT'; end if;
  update public.reports set
    status=case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'resolved' end,
    reviewed_by=p_actor,review_reason=p_reason,reviewed_at=now(),review_version=review_version+1
    where id=p_report;
  -- Re-review replaces this report's prior closure decision; owner withdrawal cannot do so.
  update public.road_overrides set revoked_at=now() where report_id=p_report and revoked_at is null;
  if p_close_minutes>0 then
    insert into public.road_overrides(graph_id,edge_id,scope,report_id,created_by,reason,valid_until)
    values(v.graph_id,v.edge_id,p_scope,p_report,p_actor,p_reason,
      least(now()+make_interval(mins=>p_close_minutes),v.expires_at))
    returning id into v_override;
  end if;
  insert into public.audit_events(event_type,actor_id,entity_id,details)
    values('report_moderated',p_actor,p_report::text,
      jsonb_build_object('action',p_action,'revision',v.review_version+1,'override_id',v_override));
  return jsonb_build_object('id',p_report,'review_version',v.review_version+1,'override_id',v_override);
end $$;
revoke all on function public.moderate_report(uuid,uuid,integer,text,text,integer,text)
  from public,anon,authenticated;
grant execute on function public.moderate_report(uuid,uuid,integer,text,text,integer,text) to service_role;

-- All nine cells are inserted and validated before publishing a weather run.
create or replace function public.publish_weather_run(
  p_run jsonb,p_frames jsonb
) returns uuid language plpgsql security invoker set search_path=''
as $$
declare v_id uuid; v_count integer; v_cells integer;
begin
  v_id:=(p_run->>'id')::uuid;
  if exists(select 1 from public.weather_runs where id=v_id and state='published') then return v_id; end if;
  insert into public.weather_runs(id,city_id,artifact_id,kind,retrieved_at,source_issued_at,
    valid_from,valid_until,expected_rows,metadata,state)
  values(v_id,p_run->>'city_id',(p_run->>'artifact_id')::uuid,p_run->>'kind',
    (p_run->>'retrieved_at')::timestamptz,(p_run->>'source_issued_at')::timestamptz,
    (p_run->>'valid_from')::timestamptz,(p_run->>'valid_until')::timestamptz,
    (p_run->>'expected_rows')::integer,p_run->'metadata','staging')
  on conflict(id) do nothing;
  insert into public.weather_hourly(run_id,cell_id,requested_point,provider_point,interval_end,precipitation_mm)
  select v_id,f.cell_id,
    gis.st_setsrid(gis.st_makepoint(f.requested_lon,f.requested_lat),4326),
    gis.st_setsrid(gis.st_makepoint(f.provider_lon,f.provider_lat),4326),
    f.interval_end,f.precipitation_mm
  from jsonb_to_recordset(p_frames) as f(cell_id smallint,requested_lon double precision,
    requested_lat double precision,provider_lon double precision,provider_lat double precision,
    interval_end timestamptz,precipitation_mm double precision)
  on conflict(run_id,cell_id,interval_end) do nothing;
  select count(*),count(distinct cell_id) into v_count,v_cells
    from public.weather_hourly where run_id=v_id;
  if v_count<>(p_run->>'expected_rows')::integer or v_cells<>9 then
    raise exception 'INCOMPLETE_WEATHER_RUN'; end if;
  update public.weather_runs set state='published' where id=v_id;
  insert into public.service_status(name,last_success_at,summary)
    values('weather',now(),jsonb_build_object('run_id',v_id))
    on conflict(name) do update set last_success_at=excluded.last_success_at,summary=excluded.summary;
  return v_id;
end $$;
revoke all on function public.publish_weather_run(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.publish_weather_run(jsonb,jsonb) to service_role;

-- Private photo bucket; write scope is intentionally limited to original uploads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('report-photos','report-photos',false,3145728,
  array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;
create policy report_photo_original_insert on storage.objects for insert to authenticated
with check(bucket_id='report-photos' and exists (
  select 1 from public.reports r where r.user_id=(select auth.uid())
    and r.status='draft' and r.created_at>now()-interval '15 minutes'
    and r.photo_original_path=name
));
create policy report_photo_owner_read on storage.objects for select to authenticated
using(bucket_id='report-photos' and exists (
  select 1 from public.reports r where r.user_id=(select auth.uid())
    and (r.photo_original_path=name or r.photo_processed_path=name)
));
-- Reviewers can fetch only processed images, never untrusted originals.
create policy report_photo_reviewer_read on storage.objects for select to authenticated
using(bucket_id='report-photos' and (select private.is_reviewer()) and exists (
  select 1 from public.reports r where r.photo_processed_path=name
));
-- No client UPDATE/upsert or DELETE policy. Server performs replacement/retention.

-- Private-schema RLS as defense in depth, service_role is trusted backend.
alter table private.user_roles enable row level security;
alter table private.quota_buckets enable row level security;
alter table private.runtime_settings enable row level security;
-- Transaction ends after additional RPCs in section11.6.
```

### 10.3 Seed and transactional write rules

Seed `data_sources` with official URLs from §21; include exact license/limitation text, not a generic “open data” assertion. Seed `cities.id='delhi-central'` with `gis.ST_MakeEnvelope(77.190,28.600,77.245,28.655,4326)`. If the predetermined reduced pilot is activated, seed that active rectangle and manifest consistently.

Graph import is a single database transaction: insert staging graph, nodes, edges, turn rules, verify counts/adjacency/geometry/compiled hash, mark published, set city's active graph. Run the import with a PostgreSQL connection from the build operator; never hold a large import inside a route handler. Export artifacts only from the same normalized graph data. `graph_versions.manifest` is the authoritative conversion/preprocessing record.

Draft creation uses the exact `create_report_draft` RPC below to transactionally insert one report, using verified `user.id`, active graph/edge, server `created_at`, observation time within the last three hours, expiry observation+180 min, and server-assigned original path. Browser supplies a stable UUID `client_nonce`, generated once per form submission; server computes SHA256 over canonical validated draft input excluding nonce. Repeating identical nonce/input returns the existing report without another quota charge; a changed input gives409 `IDEMPOTENCY_CONFLICT`. IP quota is checked before RPC; user hour/day quota and active-draft bound are enforced atomically inside it. Include no browser-supplied owner/reviewer/status/photo path. Finalization locks report, confirms ownership/draft state and object metadata, changes status pending, and inserts one `vision_jobs` row when photo exists. Implement finalization in one additional **service-only SQL RPC** whose exact transaction is:

```sql
-- Add to the same contract migration after tables exist.
create or replace function public.create_report_draft(
 p_actor uuid,p_nonce uuid,p_request_sha256 text,p_graph uuid,p_edge text,
 p_lat double precision,p_lon double precision,p_observed timestamptz,
 p_category text,p_note text,p_mime text,p_user_quota_hash text
) returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v public.reports; v_id uuid:=gen_random_uuid(); v_point gis.geometry(Point,4326);
begin
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
 select * into v from public.reports where user_id=p_actor and client_nonce=p_nonce;
 if found then
   if v.request_sha256<>p_request_sha256 then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
   return jsonb_build_object('report_id',v.id,'status',v.status,'path',v.photo_original_path,'mime',v.photo_mime);
 end if;
 if not exists(select 1 from auth.users where id=p_actor) then raise exception 'FORBIDDEN'; end if;
 v_point:=gis.st_setsrid(gis.st_makepoint(p_lon,p_lat),4326);
 if not exists(select 1 from public.cities c join public.graph_versions g on g.id=c.active_graph_id
   where g.id=p_graph and g.state='published' and gis.st_covers(c.supported_bbox,v_point)) then
   raise exception 'POINT_OUTSIDE_PILOT'; end if;
 if not exists(select 1 from public.road_edges e where e.graph_id=p_graph and e.edge_id=p_edge
   and gis.st_dwithin(e.geom::gis.geography,v_point::gis.geography,100)) then
   raise exception 'INVALID_REPORT_EDGE'; end if;
 if p_observed<now()-interval '3 hours' or p_observed>now()+interval '5 minutes' then
   raise exception 'INVALID_OBSERVED_TIME'; end if;
 if p_mime is not null and not coalesce((select (value #>> '{}')::boolean
   from private.runtime_settings where name='photos_enabled'),false) then raise exception 'PHOTOS_DISABLED'; end if;
 if (select count(*) from public.reports where user_id=p_actor and status='draft'
   and created_at>now()-interval '15 minutes')>=5 then raise exception 'DRAFT_QUOTA'; end if;
 if not ((public.consume_quota('draft_user_hour',p_user_quota_hash,5,3600)->>'allowed')::boolean)
   or not ((public.consume_quota('draft_user_day',p_user_quota_hash,20,86400)->>'allowed')::boolean) then
   raise exception 'DRAFT_QUOTA'; end if;
 insert into public.reports(id,user_id,client_nonce,request_sha256,graph_id,edge_id,
   observed_at,expires_at,category,point,note,photo_mime,photo_original_path)
 values(v_id,p_actor,p_nonce,p_request_sha256,p_graph,p_edge,p_observed,p_observed+interval '3 hours',
   p_category,v_point,p_note,p_mime,
   case when p_mime is null then null else p_actor::text||'/'||v_id::text||'/original' end);
 return jsonb_build_object('report_id',v_id,'status','draft',
   'path',case when p_mime is null then null else p_actor::text||'/'||v_id::text||'/original' end,'mime',p_mime);
end $$;
revoke all on function public.create_report_draft(uuid,uuid,text,uuid,text,double precision,double precision,timestamptz,text,text,text,text)
 from public,anon,authenticated;
grant execute on function public.create_report_draft(uuid,uuid,text,uuid,text,double precision,double precision,timestamptz,text,text,text,text)
 to service_role;

create or replace function public.finalize_report(p_actor uuid,p_report uuid,p_has_photo boolean,p_quota_subject_hash text,p_job_config jsonb)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v public.reports; v_job uuid;
begin
  select * into v from public.reports where id=p_report and user_id=p_actor for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v.status='pending' then
    select id into v_job from public.vision_jobs where report_id=p_report;
    return jsonb_build_object('report_id',p_report,'job_id',v_job,'status','pending');
  end if;
  if v.status<>'draft' or v.created_at<now()-interval '15 minutes' or v.expires_at<=now() then
    raise exception 'INVALID_REPORT_STATE'; end if;
  if p_has_photo<>(v.photo_original_path is not null) then raise exception 'PHOTO_STATE_MISMATCH'; end if;
  if p_has_photo and (jsonb_typeof(p_job_config)<>'object' or
    (p_job_config->>'processing_mode') not in ('aws','manual') or
    (p_job_config->>'sanitize_version')<>'sanitize-v1') then raise exception 'INVALID_JOB_CONFIG'; end if;
  if p_has_photo and not ((public.consume_quota('photo_jobs_global',p_quota_subject_hash,100,86400)->>'allowed')::boolean) then
    raise exception 'PHOTO_JOB_QUOTA'; end if;
  update public.reports set status='pending' where id=p_report;
  if p_has_photo then
    insert into public.vision_jobs(report_id,inference_config) values(p_report,p_job_config)
      on conflict(report_id) do update set updated_at=public.vision_jobs.updated_at
      returning id into v_job;
  end if;
  insert into public.audit_events(event_type,actor_id,entity_id,details)
    values('report_submitted',p_actor,p_report::text,jsonb_build_object('job_id',v_job));
  return jsonb_build_object('report_id',p_report,'job_id',v_job,'status','pending');
end $$;
revoke all on function public.finalize_report(uuid,uuid,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.finalize_report(uuid,uuid,boolean,text,jsonb) to service_role;
```

Vercel confirms Storage object existence before calling this RPC; owner cannot replace an uploaded object because client upsert/UPDATE are forbidden. Duplicate finalization returns the existing job. If AWS enqueue fails after this commit, maintenance recovers the queued DB job. There is no distributed transaction pretending SQS and Postgres commit atomically.

RLS views are not necessary. If later added, use `security_invoker=true` and test them. No `user_metadata` role claim, public writable role field, blanket authenticated-row policy, or unrestricted SECURITY DEFINER public RPC is permitted. Supabase's service key bypasses RLS: it belongs only in trusted components; each service-only API must implement the specified owner/role checks itself. [R28–R29]

### 10.4 Relational JSON contracts

JSON fields supplement relational keys; they do not hide new services/entities:

- `graph_versions.manifest`: exact artifact/provenance contract §5.6 plus bounds/counts/restriction warnings.
- `weather_runs.metadata`: provider URL without credentials, returned generation metadata, requested/returned cell metadata, units, transform SHA.
- `vision_jobs.inference_config`: `{schema_version:'1.0',processing_mode:'aws'|'manual',model_id,model_revision,model_sha256,preprocessor_sha256,sanitize_version:'sanitize-v1',worker_build_sha}` from server's committed model manifest; manual mode has null model/hash fields. Strict validator checks exact model ID, full40-character HF revision and64-character SHA hashes for AWS mode. Browser cannot provide it. Retries preserve it.
- `vision_jobs.source_sha256`: first successfully fetched original's hash, pinned under the active lease; changed source bytes fail `SOURCE_HASH_CHANGED`.
- `vision_jobs.result`: exact §7.4 result, or `{advisory:"manual_review",model_id:null,...}` in low-cost fallback.
- On unsaved route inserts, set `user_id=null` even if authenticated; round `effective_at` and `created_at` to UTC hour. Exact response times remain transient to the caller. Saved-history inserts retain exact timestamps under explicit consent.
- `route_requests.request`: consented route request §12; otherwise `{horizon_hours,detour_fraction,save_history:false}` only, with no coordinates.
- `route_requests.result`: consented complete §12 response; otherwise only status, candidate count, computation ms, rounded total lengths/times, ruleset/graph/weather references, and aggregate exposure metrics. No edge sequence, geometry, report-ID list, origin/destination, or precise trip time for unconsented requests.
- `audit_events.details`: allowlisted administrative/job/version facts; no notes, images, tokens, or precise route positions.

Application validators constrain these JSON shapes. Database JSON maximums are additionally enforced by API body/response limits and tests; Postgres arbitrary JSON is not an excuse for unvalidated writes.

## 11. Storage, authentication, and authorization

### 11.1 Storage buckets

Only one Supabase bucket, `report-photos`, is required. It is private with a 3 MiB limit and JPEG/PNG/WebP MIME allowlist. Paths are `{user_uuid}/{report_uuid}/original` and `{user_uuid}/{report_uuid}/processed.jpg`. Original upload uses authenticated `storage.from('report-photos').upload(path,file,{upsert:false,contentType})` with RLS; it is not a public URL and not a backend proxy upload.

Owner may view own evidence. Moderator may view processed review copy only after a role check. Vercel creates a 60-second signed **processed** read URL for an authorized user/reviewer; do not store or log it. Signature expiry is not revocation: if role changes immediately, a previously issued URL can remain usable until its short expiry. No bulk public bucket or user-controlled destination bucket.

Retention: unfinalized drafts/raw images 24 h; originals deleted immediately after successful processing commit; processed images 7 days; structured reports 30 days, then null `user_id`/review actor, replace point with edge midpoint, erase note/review reason/photo paths; no image or personal evaluation record is retained without separate consent. Weather runs/frames older than7 days may be deleted unless referenced by saved history; scenario weather is preserved in versioned fixture assets. Route history 7 days; unconsented aggregate route records 24 h; detailed audit 30 days; S3 redacted audit 30 days. Maintenance calls Storage remove before clearing path fields and retries failures; do not delete `storage.objects` rows by raw SQL because that can orphan physical objects.

### 11.2 Authentication

GitHub OAuth via Supabase is the mandatory online login path. Anonymous Supabase sign-in and password/email signup are disabled in the hackathon configuration. Public route planning uses no identity. GitHub login avoids reliance on limited default email-sending quotas and unconfigured SMTP infrastructure.

Use `@supabase/ssr` PKCE clients, callback `/auth/callback` with code exchange, secure HTTP-only session cookies where the SDK/server flow supports them, SameSite=Lax, Secure in production. Client Storage upload requires the authenticated browser Supabase session; token handling must follow the supported SDK flow. Do not describe all SDK browser-managed auth cookies as inherently inaccessible to JavaScript if the chosen SSR integration does not guarantee that. Avoid duplicate custom JWT stores. Backend uses verified `getClaims` for read identity and `getUser` on mutations; do not trust `getSession()` alone as authorization. [R27]

Fresh reviewer/admin role is read from `private.user_roles` on each privileged write. Browser profile metadata never authorizes moderation. GitHub display name is length-limited and rendered as text. Create/update a `profiles` row server-side at callback with the verified user UUID. Redirect destination is allowlisted (`/plan`, `/report`, `/review`), never a free external `next` URL.

### 11.3 Configuration reproducibility

Commit `supabase/config.toml` for local Auth and Storage configuration. Configure hosted Auth with an idempotent Management API script using deployment-only `SUPABASE_ACCESS_TOKEN`, project ref, GitHub client ID/secret, and the exact production URL. The exact hosted Management API patch is defined in §18 using the documentation verified for this specification; rechecking changed API versions is an implementation compatibility check, not an unresolved architecture decision. Do not assume `supabase db push` also applies hosted Auth configuration.

Create one GitHub OAuth application per environment. Its callback is `https://{supabase_project_ref}.supabase.co/auth/v1/callback`; Supabase then redirects to `{APP_URL}/auth/callback`. Local callback uses the local Supabase Auth URL from the generated local configuration. GitHub application registration is an external account setup prerequisite, not undocumented database configuration.

Production allowed redirect is the exact production callback only. Preview deployments use a separate staging Supabase project and OAuth app; never wildcard production redirects across all Vercel previews. Local tests create users with local admin API and never use a production service key.

### 11.4 Authorization matrix

| Actor | Allowed | Forbidden |
|---|---|---|
| Visitor | Public config/status, scenario list, route planning, sanitized road index | Reports/photos/history/moderation/provider calls |
| GitHub user | Own drafts/reports/job status/private evidence; optional own route history | Other user identity/photos/history; approve/close roads; custom source URLs |
| Moderator | Pending review, processed images, approve/reject/resolve, closure ≤120 min | Assign roles, alter graph/weather/model artifacts, AWS spending controls |
| Admin | Moderator actions plus runtime flags/manual refresh/job replay within quotas | Client-visible secrets; unaudited destructive DB changes |
| Vercel service client | Exact validated API transactions | Trusting a client owner/status/role field; arbitrary SQL/source fetch |
| Lambda vision | Job-claim/read/report-photo/process/finish paths | User-role administration; route recommendations; automatic road closures |
| Lambda ingestion | Weather archive/publish/status | Reports/photos/identity processing |
| Maintenance | Bounded recovery, redacted audit archival, TTL deletion | Unbounded history exports, public photo publication |

Lambda currently uses a scoped Secrets Manager record containing the Supabase backend key. Supabase's service role is broader than these logical responsibilities; it is a conscious trusted-backend compromise for this small build. IAM restricts which secret each function can read, code restricts operations, and no frontend can trigger arbitrary DB commands. A future least-privilege database worker role is a hardening improvement, not claimed as already implemented here.

### 11.5 Backend context, flags, and withdrawal RPCs

Add the following exact functions to the contract migration. They make non-exposed private settings/roles accessible to the **trusted service client** without exposing the private schema through PostgREST.

```sql
create or replace function public.backend_context(p_actor uuid default null)
returns jsonb language sql stable security invoker set search_path=''
as $$
 select jsonb_build_object(
   'role',(select role from private.user_roles where user_id=p_actor),
   'flags',coalesce((select jsonb_object_agg(name,value) from private.runtime_settings),'{}'::jsonb)
 )
$$;
revoke all on function public.backend_context(uuid) from public,anon,authenticated;
grant execute on function public.backend_context(uuid) to service_role;

create or replace function public.set_runtime_flags(p_actor uuid,p_flags jsonb)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare k text; v jsonb;
begin
 if not exists(select 1 from private.user_roles where user_id=p_actor and role='admin') then
   raise exception 'FORBIDDEN'; end if;
 if jsonb_typeof(p_flags)<>'object' then raise exception 'INVALID_FLAGS'; end if;
 for k,v in select key,value from jsonb_each(p_flags) loop
   if k not in ('aws_enabled','vision_enabled','photos_enabled','weather_ingest_enabled')
     or jsonb_typeof(v)<>'boolean' then raise exception 'INVALID_FLAGS'; end if;
   insert into private.runtime_settings(name,value) values(k,v)
     on conflict(name) do update set value=excluded.value,updated_at=now();
 end loop;
 insert into public.audit_events(event_type,actor_id,entity_id,details)
   values('flags_changed',p_actor,'runtime',p_flags);
 return public.backend_context(p_actor);
end $$;
revoke all on function public.set_runtime_flags(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.set_runtime_flags(uuid,jsonb) to service_role;

create or replace function public.withdraw_report(p_actor uuid,p_report uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v public.reports;
begin
 select * into v from public.reports where id=p_report and user_id=p_actor for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 update public.reports r set status='withdrawn',note='',
   point=(select gis.st_lineinterpolatepoint(e.geom,0.5) from public.road_edges e
     where e.graph_id=r.graph_id and e.edge_id=r.edge_id),
   photo_original_path=null,photo_processed_path=null,review_version=review_version+1
   where id=p_report;
 update public.vision_jobs set state='failed',error_code='REPORT_WITHDRAWN',
   lease_token=null,lease_until=null,updated_at=now() where report_id=p_report and state in ('queued','running');
 insert into public.audit_events(event_type,actor_id,entity_id,details)
   values('report_withdrawn',p_actor,p_report::text,'{}');
 return jsonb_build_object('original_path',v.photo_original_path,'processed_path',v.photo_processed_path);
end $$;
revoke all on function public.withdraw_report(uuid,uuid) from public,anon,authenticated;
grant execute on function public.withdraw_report(uuid,uuid) to service_role;
```

Returned withdrawal paths are consumed by the backend for deletion and never returned to the browser. Because an image can be written between withdrawal and deletion, maintenance also removes orphan objects under withdrawn report prefixes. A running worker whose lease was invalidated must remove any processed object it just wrote after a failed finish operation. Existing closure records remain until expiry or reviewer resolution; withdrawal cannot erase an independent moderation safety decision.

### 11.6 Atomic routing context and maintenance RPCs

These are additional SQL in the **same contract migration**, after the baseline tables/functions. Service-only functions are not publicly callable just because they use the public schema. `live_route_context` executes as one SQL statement snapshot; avoid separate REST reads that could pair one weather version with another closure set. Return sanitized public data from the handler, not this internal JSON wholesale. More than2,000 active reports/overrides causes503 `EVIDENCE_VOLUME_UNSUPPORTED`; never silently drop safety evidence to satisfy a query row cap.

```sql
create or replace function public.live_route_context(p_graph uuid)
returns jsonb language plpgsql stable security invoker set search_path=''
as $$
declare v_city text; v_run uuid; v_reports jsonb; v_closures jsonb;
begin
 select city_id into v_city from public.graph_versions
   where id=p_graph and state='published';
 if not found or not exists(select 1 from public.cities
   where id=v_city and active_graph_id=p_graph) then raise exception 'GRAPH_VERSION_MISMATCH'; end if;
 select id into v_run from public.weather_runs
   where city_id=v_city and kind='forecast' and state='published'
   order by retrieved_at desc,id desc limit 1;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into v_reports from (
   select id,edge_id,category,observed_at,expires_at,review_version
   from public.reports where graph_id=p_graph and status='approved' and expires_at>now()
   order by id limit 2001
 ) q;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into v_closures from (
   select id,edge_id,scope,valid_until,report_id from public.road_overrides
   where graph_id=p_graph and revoked_at is null and valid_until>now()
   order by id limit 2001
 ) q;
 if jsonb_array_length(v_reports)>2000 or jsonb_array_length(v_closures)>2000 then
   raise exception 'EVIDENCE_VOLUME_UNSUPPORTED'; end if;
 return jsonb_build_object(
   'captured_at',now(),'graph_id',p_graph,'reports',v_reports,'closures',v_closures,
   'weather_run',(select to_jsonb(w) from public.weather_runs w where id=v_run),
   'weather_frames',coalesce((select jsonb_agg(jsonb_build_object(
       'cell_id',cell_id,'interval_end',interval_end,'precipitation_mm',precipitation_mm)
       order by cell_id,interval_end)
     from public.weather_hourly where run_id=v_run),'[]'::jsonb)
 );
end $$;
revoke all on function public.live_route_context(uuid) from public,anon,authenticated;
grant execute on function public.live_route_context(uuid) to service_role;

create or replace function public.reserve_vision_enqueue(p_job uuid)
returns setof public.vision_jobs language sql security invoker set search_path=''
as $$
 update public.vision_jobs set last_enqueue_at=now(),updated_at=now()
 where id=p_job and attempts<3 and
   (state='queued' or (state='running' and lease_until<now())) and
   (last_enqueue_at is null or last_enqueue_at<now()-interval '5 minutes')
 returning *
$$;
revoke all on function public.reserve_vision_enqueue(uuid) from public,anon,authenticated;
grant execute on function public.reserve_vision_enqueue(uuid) to service_role;

create or replace function public.retry_vision_job(
 p_actor uuid,p_job uuid,p_reason text,p_quota_subject_hash text
) returns uuid language plpgsql security invoker set search_path=''
as $$
declare v_report uuid; v public.reports; j public.vision_jobs;
begin
 if not exists(select 1 from private.user_roles where user_id=p_actor and role='admin') then
   raise exception 'FORBIDDEN'; end if;
 if length(p_reason) not between 5 and 300 then raise exception 'INVALID_RETRY_REASON'; end if;
 select report_id into v_report from public.vision_jobs where id=p_job;
 if not found then raise exception 'NOT_FOUND'; end if;
 select * into v from public.reports where id=v_report for update;
 select * into j from public.vision_jobs where id=p_job for update;
 if j.state<>'failed' or v.status='withdrawn' or v.photo_original_path is null
   or v.created_at<now()-interval '24 hours' then raise exception 'JOB_NOT_RETRYABLE'; end if;
 if exists(select 1 from public.audit_events where event_type='vision_retry'
   and entity_id=p_job::text and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC') then
   raise exception 'RETRY_QUOTA'; end if;
 if not ((public.consume_quota('photo_jobs_global',p_quota_subject_hash,100,86400)->>'allowed')::boolean) then
   raise exception 'PHOTO_JOB_QUOTA'; end if;
 update public.vision_jobs set state='queued',attempts=0,lease_token=null,lease_until=null,
   last_enqueue_at=null,error_code=null,result=null,updated_at=now() where id=p_job;
 insert into public.audit_events(event_type,actor_id,entity_id,details)
   values('vision_retry',p_actor,p_job::text,jsonb_build_object('reason',p_reason));
 return p_job;
end $$;
revoke all on function public.retry_vision_job(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.retry_vision_job(uuid,uuid,text,text) to service_role;

create or replace function public.maintenance_context()
returns jsonb language plpgsql security invoker set search_path=''
as $$
begin
 update public.vision_jobs set state='failed',error_code='ATTEMPTS_EXHAUSTED',
   lease_token=null,lease_until=null,updated_at=now()
 where id in (select id from public.vision_jobs
   where attempts>=3 and (state='queued' or (state='running' and lease_until<now()))
   order by created_at limit 50);
 return jsonb_build_object(
   'flags',(public.backend_context(null)->'flags'),
   'jobs',coalesce((select jsonb_agg(to_jsonb(q)) from (
     select id,report_id from public.vision_jobs where attempts<3 and
       (state='queued' or (state='running' and lease_until<now())) and
       (last_enqueue_at is null or last_enqueue_at<now()-interval '5 minutes')
     order by created_at limit 50) q),'[]'::jsonb),
   'cleanup_reports',coalesce((select jsonb_agg(to_jsonb(q)) from (
     select id,user_id,status,created_at,photo_original_path,photo_processed_path
     from public.reports where
       (photo_original_path is not null and created_at<now()-interval '24 hours') or
       (photo_processed_path is not null and created_at<now()-interval '7 days') or
       (status='withdrawn' and created_at>now()-interval '30 days')
     order by created_at limit 100) q),'[]'::jsonb),
   'audit',coalesce((select jsonb_agg(to_jsonb(q)) from (
     select id,event_type,entity_id,created_at,
       jsonb_strip_nulls(jsonb_build_object(
         'error_code',details->'error_code','job_id',details->'job_id')) as details
     from public.audit_events where archived_at is null
     order by id limit 500) q),'[]'::jsonb)
 );
end $$;
revoke all on function public.maintenance_context() from public,anon,authenticated;
grant execute on function public.maintenance_context() to service_role;

create or replace function public.commit_audit_archive(p_ids bigint[],p_key text)
returns integer language plpgsql security invoker set search_path=''
as $$
declare n integer;
begin
 if cardinality(p_ids) not between 1 and 500 or p_key !~ '^audit/[a-zA-Z0-9/_\.-]+\.json$' then
   raise exception 'INVALID_ARCHIVE_BATCH'; end if;
 update public.audit_events set archived_at=now(),archive_key=p_key
   where id=any(p_ids) and archived_at is null;
 get diagnostics n=row_count;
 return n;
end $$;
revoke all on function public.commit_audit_archive(bigint[],text) from public,anon,authenticated;
grant execute on function public.commit_audit_archive(bigint[],text) to service_role;

create or replace function public.prune_maintenance()
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare n_quota integer; n_routes integer; n_weather integer; n_reports integer; n_audit integer;
begin
 delete from private.quota_buckets where (bucket,subject_hash,window_start) in
   (select bucket,subject_hash,window_start from private.quota_buckets
    where expires_at<now() order by expires_at limit 500);
 get diagnostics n_quota=row_count;
 delete from public.route_requests where id in (select id from public.route_requests
   where (save_history and created_at<now()-interval '7 days') or
     (not save_history and created_at<now()-interval '24 hours')
   order by created_at limit 500);
 get diagnostics n_routes=row_count;
 delete from public.weather_runs where id in (select w.id from public.weather_runs w
   where w.retrieved_at<now()-interval '7 days' and not exists
     (select 1 from public.route_requests r where r.weather_run_id=w.id)
   order by w.retrieved_at limit 100);
 get diagnostics n_weather=row_count;
 update public.reports r set user_id=null,reviewed_by=null,note='',review_reason=null,
   point=(select gis.st_lineinterpolatepoint(e.geom,0.5) from public.road_edges e
     where e.graph_id=r.graph_id and e.edge_id=r.edge_id)
 where r.id in (select id from public.reports where created_at<now()-interval '30 days'
   and user_id is not null and photo_original_path is null and photo_processed_path is null
   order by created_at limit 100);
 get diagnostics n_reports=row_count;
 delete from public.reports where id in (select id from public.reports
   where status='draft' and created_at<now()-interval '24 hours'
     and photo_original_path is null and photo_processed_path is null
   order by created_at limit 100);
 delete from public.audit_events where id in (select id from public.audit_events
   where created_at<now()-interval '30 days' order by created_at limit 500);
 get diagnostics n_audit=row_count;
 return jsonb_build_object('quotas',n_quota,'routes',n_routes,'weather',n_weather,
   'deidentified_reports',n_reports,'audit',n_audit);
end $$;
revoke all on function public.prune_maintenance() from public,anon,authenticated;
grant execute on function public.prune_maintenance() to service_role;
```

Maintenance has a55s absolute work deadline including all HTTP calls. Reserve phase budgets: context/secret≤10s, enqueue≤10s, archive≤10s, cleanup≤20s, prune≤5s; never begin an operation without enough remaining budget for its timeout. Process oldest entries up to count/time bounds, preserve unfinished state for next tick. A context may list50 jobs/100 cleanup candidates but the worker need not finish all in one invocation. Do not naïvely perform50 sequential5s calls under a60s function limit. Update `service_status(name='maintenance')` with safe counts/deadline truncation; repeated cleanup lag is degraded status.

Maintenance procedure: validate invocation → `maintenance_context` → reserve/enqueue up to50 eligible jobs if AWS/vision enabled → serialize redacted audit batch canonical JSON, SHA256 bytes, write `audit/YYYY-MM-DD/{sha256}.json` → `commit_audit_archive` with the **exact IDs included** → bounded Storage cleanup → `prune_maintenance`. An archive object is immutable and commit follows successful put. Per-row `archived_at` is used instead of a high-water identity cursor: a late-committing transaction with a lower sequence ID must not be skipped. Duplicate archives after a crash are permitted; missing events are not. If S3 fails, do not mark any row archived; retry next tick.

Storage cleanup: remove expired known objects through Storage API; only after successful removal conditionally clear the corresponding path where its value still equals the removed path. Mark an expired raw-image job failed `SOURCE_EXPIRED` and invalidate lease in a report-then-job transaction before removing the original; this operation uses the trusted retention script's SQL connection, and runtime maintenance calls the exact RPC below. For withdrawn reports scan their known user/report prefix for ≤2 expected object names; remove race-created orphans. Additionally list ≤100 bucket objects per tick using bounded breadth-first Storage listing; inspect age/path ownership and remove only orphan originals older24 h or processed orphans older7 days. Persist scan state in `service_status(name='storage_scan').summary` as `{schema_version:'1.0',pending_prefixes:[{prefix,offset}],cycle_started_at}`. Start with prefix''/offset0; call Storage `list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}})`; queue returned folders (null object ID) as child prefixes, inspect file objects, advance offset100 if a full page, otherwise pop that prefix. At≤100 returned entries or40s execution stop and persist state. A completed queue resets to root on the next tick; bounded repeated cycles recover skipped entries caused by concurrent deletion. A listing error preserves the cursor. Unknown malformed paths are quarantined for operator review, never deleted blindly. Never delete a young object whose owning report/job is still processing.

```sql
create or replace function public.expire_report_source(p_report uuid)
returns text language plpgsql security invoker set search_path=''
as $$
declare v public.reports;
begin
 select * into v from public.reports where id=p_report for update;
 if not found or v.photo_original_path is null or v.created_at>=now()-interval '24 hours' then return null; end if;
 update public.vision_jobs set state='failed',error_code='SOURCE_EXPIRED',
   lease_token=null,lease_until=null,updated_at=now()
 where report_id=p_report and state in ('queued','running');
 return v.photo_original_path;
end $$;
revoke all on function public.expire_report_source(uuid) from public,anon,authenticated;
grant execute on function public.expire_report_source(uuid) to service_role;

create or replace function public.pin_vision_source(p_job uuid,p_token uuid,p_sha text)
returns boolean language plpgsql security invoker set search_path=''
as $$
declare v public.vision_jobs;
begin
 if p_sha !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_SOURCE_HASH'; end if;
 select * into v from public.vision_jobs where id=p_job and state='running'
   and lease_token=p_token and lease_until>now() for update;
 if not found then return false; end if;
 if v.source_sha256 is not null and v.source_sha256<>p_sha then
   raise exception 'SOURCE_HASH_CHANGED'; end if;
 update public.vision_jobs set source_sha256=p_sha where id=p_job;
 return true;
end $$;
revoke all on function public.pin_vision_source(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.pin_vision_source(uuid,uuid,text) to service_role;
commit;
```

No routine requires runtime `DATABASE_URL`, private-schema Data API exposure, an undocumented cursor, or an unbounded SQL function. State changes affect ≤500 rows per category per run. Bootstrap/import use deployment-only direct PostgreSQL as separately specified.

## 12. API contracts and validation

### 12.1 Common transport/security contract

All application routes are under `/api/v1`. HTTPS only in production. Non-GET requests require same-origin `Origin` against exact `APP_URL` (local development separately allowlisted), `Content-Type: application/json`, body ≤64 KiB, UTF-8, and strict unknown-field rejection. No permissive credentialed CORS. Browser session uses Supabase SSR cookies. API is not a third-party fleet API in this build.

Standard success `{data,meta:{request_id,schema_version:"1.0"}}`. Standard failure:

```json
{"error":{"code":"POINT_OUTSIDE_PILOT","message":"Choose points inside the supported Delhi pilot.","retryable":false},"meta":{"request_id":"uuid","schema_version":"1.0"}}
```

Do not return stack traces, SQL messages, secret paths, credential names/values, or provider request bodies. HTTP: 400 malformed JSON; 401 no valid login; 403 authorized identity lacks privilege/invalid Origin; 404 missing or not-owned resource (same response for IDOR attempts); 409 revision/upload conflict; 413 payload; 422 semantic validation; 429 quota + `Retry-After`; 502 failed external source validation; 503 unavailable DB/graph/upstream; 504 time budget. A job accepted for processing returns 202; ordinary closure/detour infeasibility is a200 product result, not an internal error.

Internal finalization config is loaded from the checked-in `models/manifest.json` included by output tracing. It is not an additional secret/environment key. Config validation occurs before the photo job is created; no photo means no model config dependency.

Server request ID uses UUID; caller-provided tracing ID is accepted only if valid UUID, never embedded raw into logs. Private/route responses `Cache-Control: private,no-store`; public config/landmarks/scenario metadata may use `public,max-age=60`; data status ≤30 s. Do not CDN-cache personalized results, auth callbacks, or token-refresh responses.

### 12.2 Exact validation schemas (TypeScript/Zod)

```ts
import { z } from 'zod';
export const Point = z.object({
  lat:z.number().finite().min(-90).max(90),
  lon:z.number().finite().min(-180).max(180)
}).strict();
export const RouteInput = z.object({
  origin:Point,destination:Point,
  detour_fraction:z.number().finite().min(0).max(0.30).default(0.20),
  horizon_hours:z.union([z.literal(0),z.literal(1),z.literal(3)]).default(0),
  mode:z.enum(['live','scenario']).default('live'),
  scenario_id:z.string().regex(/^[a-z0-9-]{1,64}$/).optional(),
  frame_at:z.string().datetime({offset:true}).optional(),
  save_history:z.boolean().default(false)
}).strict().superRefine((v,c)=>{
  if(v.mode==='scenario' && (!v.scenario_id||!v.frame_at))
    c.addIssue({code:'custom',message:'Scenario and frame required'});
  if(v.mode==='live' && (v.scenario_id||v.frame_at))
    c.addIssue({code:'custom',message:'Live request cannot include scenario fields'});
});
export const ReportDraftInput = z.object({
  client_nonce:z.string().uuid(),
  edge_id:z.string().min(1).max(160),point:Point,
  observed_at:z.string().datetime({offset:true}),
  category:z.enum(['standing_water','heavy_water','blocked','clear']),
  note:z.string().max(500).default(''),
  photo_mime:z.enum(['image/jpeg','image/png','image/webp']).optional()
}).strict();
export const FinalizeInput=z.object({has_photo:z.boolean()}).strict();
export const ModerationInput=z.object({
  expected_version:z.number().int().min(0),
  acknowledged_evidence:z.literal(true),
  action:z.enum(['approve','reject','resolve']),
  reason:z.string().min(5).max(1000),
  close_minutes:z.number().int().min(0).max(120).default(0),
  closure_scope:z.enum(['physical','directed']).default('physical')
}).strict();
export const FlagsInput=z.object({
  aws_enabled:z.boolean().optional(),vision_enabled:z.boolean().optional(),
  photos_enabled:z.boolean().optional(),weather_ingest_enabled:z.boolean().optional()
}).strict().refine(v=>Object.keys(v).length>0);
export const Id=z.string().uuid();
export const BBox=z.tuple([z.number().finite(),z.number().finite(),
  z.number().finite(),z.number().finite()]); // [minLon,minLat,maxLon,maxLat]
```

Additional server checks: current published graph; point inside active rectangle; report point ≤100 m from chosen physical road geometry; observed time ≤now+5 min and ≥now−3 h; scalar strings strip control characters while preserving Unicode; render note as plain text. Request cannot choose graph/model/source URL, observed probability, ownership, moderation role, TTL, or job destination. Schema validators do not replace these authorization/time/geospatial checks.

### 12.3 Endpoint inventory — every processing chain

| Method and route | Auth / validation | Processing + calls + database | Response and failure behavior |
|---|---|---|---|
| GET `/config` | Public, IP quota | Read active city/graph + service-only `backend_context(null)`; return public flags, support bounds, horizon/detour limits, model advisory availability | 200 public config; 503 graph/config mismatch. Never return role/secret/internal env. |
| GET `/status` | Public, IP quota | Read allowlisted `service_status`, latest published weather timestamp; compute stale age; sanitized build/model/version health | 200 `healthy|degraded|unknown` by component. No secret ARNs, stack traces, raw error message. |
| GET `/landmarks?q=...` | Public; q length 0–60 | In-memory committed landmark list, casefold matching; max20, no external geocoding call | 200 `[{id,name,point}]`; empty query gives seeded popular landmarks. |
| GET `/scenarios` | Public | DB public-visible metadata; match committed checksum manifest | 200 metadata; excludes private fixture reports/photos. |
| GET `/segments?bbox=...&horizon_hours=...` | Public; valid pilot-clipped bbox, area≤25 km², horizon 0/1/3 | Same risk engine as routing; fixed graph + live read set; filter bbox; max2,000 edges | GeoJSON ≤1.5 MiB with sanitized index/reasons, no personal report fields; if too large 422 `ZOOM_IN`; unknown weather gives null index. |
| POST `/routes` | Public by default; valid session required if `save_history=true`; `RouteInput` | Atomic quota → read graph/weather/active evidence → routing §6 → store sanitized aggregate or consented full result in `route_requests` | 200 route result incl infeasibility; 422 out-of-pilot/snap failure, 503 DB/graph unavailable, 504 budget. No external model call. |
| GET `/routes/:id` | Authenticated owner; `Id` | User-context SELECT owned saved `route_requests`, immutable original snapshot | 200 full saved response; 404 missing/non-owned/unsaved. Not recomputed as current guidance. |
| GET `/me/routes?cursor=...` | Authenticated; cursor valid UUID/time pair | Owned saved history newest first; keyset pagination, max20 | 200 summaries/cursor; 401 auth; no other user history. |
| DELETE `/routes/:id` | Authenticated owner; same-origin | Service backend conditionally deletes owned saved row, writes sanitized deletion audit | 204; 404 missing/non-owned. Aggregate operational metrics may remain deidentified. |
| POST `/reports` | GitHub user verified with `getUser`; `ReportDraftInput`; quotas | Verify chosen graph edge/proximity; call `create_report_draft` with nonce/canonical request hash/user quota subject; transactional draft + server path; no AWS/model call | 201 `{report_id,status:'draft',upload:{bucket,path,mime,max_bytes}}` or upload null; 422 time/edge, 429 quota. |
| POST `/reports/:id/finalize` | Authenticated owner, `Id`, `FinalizeInput`, idempotent | Confirm draft/storage object metadata; `finalize_report` RPC atomically applies global photo-job quota → if photo, SQS send using OIDC; recoverable enqueue failure leaves DB queued; if AWS/vision unavailable or pinned job mode is manual, sanitize in Vercel with Sharp and complete manual-review job | 202 `{report_id,job_id,status:'pending'}`; 409 image missing/conflict, 422 size/mime; duplicate returns same job. No fabricated CV result. |
| GET `/reports/:id` | Authenticated owner or reviewer | User-context RLS SELECT + linked job; redact reviewer ID for ordinary owner if not needed | 200 status/advisory; 404 IDOR. |
| GET `/me/reports?cursor=...` | Authenticated | Own reports, keyset max20 | 200 paginated summaries; 401 auth. |
| DELETE `/reports/:id` | Authenticated owner; same-origin | `withdraw_report` RPC → Storage remove originals/processed; audit; recovery removes orphans | 204 on successful DB withdrawal even if object cleanup delayed; closure decision persists until reviewer/expiry. |
| GET `/reports/:id/photo` | Authenticated owner or reviewer | Check processed path and role/ownership → Supabase create signed read URL 60 s | 200 `{url,expires_at}`; 409 `PHOTO_PROCESSING`, 404 non-owned, never original for reviewer. No caching/logging URL. |
| GET `/jobs/:id` | Authenticated report owner or reviewer | User-context owned job SELECT | 200 `{state,attempts,advisory,error_code,created_at,updated_at}`; 404 IDOR. No lease token/path/internal exception. |
| GET `/review/reports?status=...&cursor=...` | Reviewer; live DB role | Service SELECT requested pending/approved/rejected/resolved rows; include processed-photo readiness and optimistic version; max20 | 200 review list; 403 role; does not auto-approve. |
| POST `/review/reports/:id/decision` | Reviewer `getUser` + fresh role, `ModerationInput` | For approval require photo processed if attached; rejection/resolution may handle an invalid/unprocessed photo; require `acknowledged_evidence:true` for map/time review; service-only `moderate_report` RPC including audit/closure | 200 updated revision/closure ID; 409 version, 422 expired/category mismatch; no model call. |
| PUT `/admin/flags` | Admin `getUser` + fresh role; `FlagsInput` | `set_runtime_flags` RPC, audit; public config exposes allowlisted behavior only | 200 flags; 403/422; flag change cannot change IAM/cloud infra by itself. |
| POST `/admin/weather-refresh` | Admin; empty body; global limit1/15 min | If AWS enabled invoke ingestion Lambda asynchronously (`InvocationType:'Event'`, SDK call≤5s), passing request_id for status correlation; otherwise same adapter in Vercel → private artifact metadata + atomic `publish_weather_run` without S3 raw archive; explicitly `archive_backend:'none'` | AWS:202 `{refresh_id,accepted:true}`, completion in `/status`; fallback:200 run/status. 502 fallback schema/upstream;503 DB;429 quota. Never relabel historical data live. |
| POST `/admin/jobs/:id/retry` | Admin; failed job UUID; max1 retry/report/day | Storage existence check → `retry_vision_job` service-only RPC (report/job lock, daily retry and global quota, queued state/reset/audit) → choose AWS only when both effective flags and pinned AWS mode allow it; otherwise manual sanitizer fallback | 202; 409 active/already succeeded, 429 retry cap; retry cannot change original evidence/model silently. |

Auth callback is framework route `GET /auth/callback?code=...`, no application body. Supabase validates OAuth/PKCE state and exchanges code; callback creates profile then allowlisted redirect; failure returns generic login error. Logout is `POST /auth/logout`, session sign-out plus redirect, same-origin validation; not a GET side effect.

No AWS endpoint accepts a browser request. The only AWS “endpoints” are IAM-authenticated AWS SDK operations: SQS SendMessage, optional Lambda Invoke, S3 object operations inside trusted roles. There is no public `/predict` URL or anonymous Lambda Function URL.

### 12.4 Route request and response

```json
{
  "origin":{"lat":28.627,"lon":77.217},
  "destination":{"lat":28.645,"lon":77.231},
  "detour_fraction":0.2,
  "horizon_hours":1,
  "mode":"live",
  "save_history":false
}
```

Response's `data` shape:

```ts
type RouteResult = {
 id:string;
 status:'ok'|'no_feasible_route'|'no_lower_risk_option'|'conditions_unknown';
 mode:'live'|'scenario'; scenario_id:string|null; effective_at:string;
 baseline:RouteOption; recommendation:RouteOption|null;
 alternatives:RouteOption[]; over_budget:RouteOption|null;
 comparison:{
   estimated_time_cap_s:number; achieved_detour_fraction:number|null;
   modeled_exposure_reduction_pct:number|null;
   baseline_unavailable:boolean; note_code:string;
 };
 provenance:{
   graph_version:string; graph_sha256:string; ruleset_id:'relative-risk-v1';
   weather_run_id:string|null; weather_retrieved_at:string|null;
   source_issued_at:string|null; accepted_report_ids:string[];
   override_ids:string[]; config_sha256:string;
 };
 search:{candidate_count:number; search_complete:boolean; elapsed_ms:number};
 snaps:{origin:{node_id:string;distance_m:number};destination:{node_id:string;distance_m:number}};
 warnings:string[];
};
type RouteOption = {
 id:'baseline'|'recommended'|'alternative-1'|'alternative-2'|'over-budget';
 edge_ids:string[]; geometry:{type:'LineString';coordinates:[number,number][]};
 distance_m:number; estimated_time_s:number;
 modeled_exposure_m:number|null; uncertainty_exposure_m:number|null;
 high_index_length_m:number|null; evidence_coverage:number|null;
 active_closure_count:number; legal:boolean; within_detour_cap:boolean;
 top_reasons:{code:string;edge_id:string;facts:Record<string,string|number|null>}[];
};
```

Coordinate arrays use [longitude,latitude]. Geometry is connected; simplify display geometry to ≤2 m tolerance without changing scoring/edge IDs. Maximum 3 displayed alternatives plus baseline/over_budget must remain under response cap; truncate reason count to10 and each route to ≤5,000 coordinates. If geometry alone exceeds cap, return 422 `TRIP_TOO_COMPLEX`, not corrupted data. `recommendation` is null when conditions unknown; a closure-aware path can appear in alternatives with risk fields null.

### 12.5 Quotas and abuse controls

Use `consume_quota` with HMAC-SHA256 subject hash and a 32-byte `RATE_LIMIT_HMAC_KEY`. Read IP using `ipAddress(request)` from `@vercel/functions` behind Vercel's controlled ingress; never implement arbitrary caller `X-Forwarded-For` precedence. If undefined in production, fail public expensive mutations with503 `REQUEST_IDENTITY_UNAVAILABLE`, rather than silently sharing a bypass bucket. Local tests inject an explicit fake IP in the test adapter. [R42] Store no raw IP, and expire quota buckets after two windows. Subject input is UTF-8 `user:{uuid}` for authenticated quotas, `ip:{normalized_ip}` for anonymous quotas, and `global:{bucket}` for global limits; bucket name is also a separate primary-key field. Use the same global photo subject for finalization and admin retry. No in-memory counters as the only limiter.

| Operation | Limits |
|---|---|
| Public read endpoints collectively | 120/min/IP; `/segments` additionally30/min/IP |
| Route computation | 20/min/IP and60/hour/IP; global5,000/day |
| Draft reports | 5/hour/user,20/day/user inside draft RPC;20/hour/IP before RPC; max5 active drafts/user (age≤15min) |
| Photo finalization | 10/day/user; **global100 vision jobs/day**; reject before accepting new paid work when exhausted |
| Moderation | 60/min/reviewer; no public access |
| Manual weather refresh | global1/15 min |
| Admin retry | 1/day/report plus global vision cap; audit |
| Original Storage upload | Insert only an existing owned ≤15-min draft; quota limits how many paths can be minted; upsert denied |

All required buckets are checked; consumption can conservatively count failed attempts. Finalization checks an existing job first so normal idempotent retries do not repeatedly consume paid-job capacity. SQL transaction/unique job constraint prevents duplication; occasional conservative quota consumption is acceptable, capacity overshoot is not.

On quota backend failure, fail expensive writes/routes closed with 503; static informational assets remain available. No CAPTCHA vendor, Redis, DynamoDB quota mirror, or paid WAF dependency. Vercel platform firewall/rate controls may complement the DB limiter, but the application contract remains testable without them.

### 12.6 Remaining request/response contracts

These definitions close the non-routing endpoint contract. All shapes below are the `data` payload inside the standard envelope; database column names do not authorize returning raw table rows. Implement result validators with Zod matching these shapes and allowlisted enums. All timestamps are RFC3339 UTC, UUIDs validated, numeric output finite, and unknown fields rejected. GET inputs have no body. DELETE/logout/weather-refresh send `{}` with JSON content type and exact Origin.

```ts
export const EmptyInput=z.object({}).strict();
export const RetryInput=z.object({reason:z.string().min(5).max(300)}).strict();
export const ListQuery=z.object({cursor:z.string().max(256).optional()}).strict();
export const ReviewQuery=ListQuery.extend({
 status:z.enum(['pending','approved','rejected','resolved']).default('pending')
});
export const LandmarkQuery=z.object({q:z.string().max(60).default('')}).strict();
export const SegmentQuery=z.object({
 bbox:z.string().max(160),horizon_hours:z.enum(['0','1','3']).default('0')
}).strict();
```

Parse URL query with a strict single-value map; duplicated parameters or extra names give400. Bbox is four comma-separated finite decimals `[minLon,minLat,maxLon,maxLat]`, min<max on both axes, valid world coordinate ranges and intersects the supported rectangle; clip to that rectangle, reject empty or area>25km². Area guard uses `111320*(maxLat-minLat) * 111320*cos(midLat*pi/180)*(maxLon-minLon)/1e6`; it is an abuse bound, not a geodetic measurement claim. Pagination cursor is base64url of canonical JSON `{created_at:string,id:uuid}`, decoded≤256bytes and schema-checked. Query predicate `(created_at,id)<(cursor.created_at,cursor.id)` with descending order, fixed limit20, read21 for `next_cursor`. The cursor is not authorization; owner/role predicates still apply. No OFFSET for user lists.

```ts
type PointValue={lat:number;lon:number};
type Health='healthy'|'degraded'|'unknown';
type Flags={aws_enabled:boolean;vision_enabled:boolean;photos_enabled:boolean;weather_ingest_enabled:boolean};
type ConfigData={
 schema_version:'1.0';city_id:'delhi-central';city_name:string;
 supported_bbox:[number,number,number,number];graph_version:string;graph_sha256:string;
 ruleset_id:'relative-risk-v1';horizons:[0,1,3];max_detour_fraction:0.3;
 roads_geojson_url:string;landmarks_url:string;
 flags:Flags;vision_available:boolean;build_sha:string;report_photo_max_bytes:3145728;
};
type StatusComponent={status:Health;last_success_at:string|null;last_error_code:string|null};
type StatusData={
 checked_at:string;build_sha:string;graph_version:string;
 components:{database:StatusComponent;graph:StatusComponent;weather:StatusComponent;vision:StatusComponent};
 weather:{run_id:string|null;retrieved_at:string|null;age_minutes:number|null;source_issued_at:string|null;refresh_id:string|null};
};
type Landmark={id:string;name:string;point:PointValue};
type ScenarioMetadata={
 id:string;title:string;kind:'synthetic'|'historical_weather'|'historical_observed';
 start_at:string;end_at:string;description:string;artifact_sha256:string;
 artifact_url:string;preset:{origin:PointValue;destination:PointValue;detour_fraction:number}|null;
};
type ReportStatus='draft'|'pending'|'approved'|'rejected'|'resolved'|'withdrawn';
type JobState='queued'|'running'|'succeeded'|'failed';
type Advisory='flooded_scene_likely'|'non_flooded_scene_likely'|'uncertain'|'manual_review';
type JobData={
 id:string;report_id:string;state:JobState;attempts:number;advisory:Advisory|null;
 scores:{flooded_scene:number;non_flooded:number}|null;model_id:string|null;
 model_revision:string|null;calibrated:false;error_code:string|null;created_at:string;updated_at:string;
};
type ReportData={
 id:string;graph_version:string;edge_id:string;point:PointValue;
 observed_at:string;expires_at:string;category:'standing_water'|'heavy_water'|'blocked'|'clear';
 note:string;status:ReportStatus;review_version:number;review_reason:string|null;
 reviewed_at:string|null;created_at:string;has_photo:boolean;photo_ready:boolean;job:JobData|null;
};
type DraftData={
 report_id:string;status:ReportStatus;
 upload:{bucket:'report-photos';path:string;mime:'image/jpeg'|'image/png'|'image/webp';max_bytes:3145728}|null;
};
type FinalizeData={report_id:string;job_id:string|null;status:'pending'};
type ListData<T>={items:T[];next_cursor:string|null};
type RouteSummary={id:string;created_at:string;mode:'live'|'scenario';status:RouteResult['status'];
 estimated_time_s:number|null;modeled_exposure_m:number|null;graph_version:string;ruleset_id:string};
type ReviewData=ReportData&{reporter_label:'Authenticated contributor'};
type DecisionData={id:string;status:ReportStatus;review_version:number;override_id:string|null};
type PhotoData={url:string;expires_at:string};
type RefreshAccepted={refresh_id:string;accepted:true};
type RefreshComplete={refresh_id:string;run_id:string;retrieved_at:string;archive_backend:'none'};
type RetryData={job_id:string;state:'queued'|'succeeded';processing_mode:'aws'|'manual'};
```

Endpoint mapping: `/config`→ConfigData; `/status`→StatusData; `/landmarks`→Landmark[]; `/scenarios`→ScenarioMetadata[]; `/reports`POST→DraftData; finalization→FinalizeData; reportGET→ReportData; `/jobs/:id`→JobData; own reports→ListData<ReportData>; own routes→ListData<RouteSummary>; reviewer list→ListData<ReviewData>; decision→DecisionData (RPC plus mapped status from approved action); flags→`{flags:Flags}` only; photo→PhotoData; refresh→accepted202 or fallbackcomplete200; retry→RetryData. Route GET returns its saved RouteResult. DELETE routes/reports and logout return204 (logout UI then navigates `/`). If draft nonce repeat is already finalized, return existing status/upload:null and direct UI to the report; never offer upload to a non-draft report.

`/segments` response is GeoJSON FeatureCollection wrapped in `data`: each feature geometry LineString, id=edge_id, properties `{edge_id,name:string|null,risk_index:number|null,evidence_coverage:number,evidence_status:'current'|'unknown',closed:boolean,reasons:{code:string,facts:Record<string,string|number|null>}[]}`; collection includes `provenance:{graph_version,ruleset_id,weather_run_id,captured_at,horizon_hours}` as a permitted foreign member. Query returns whole intersecting edges, not a new cropped routing graph. Private report note/location/identity/photo fields are excluded. All route/segment JSON encoded bytes≤1.5MiB; pagination collections≤64KiB; points and coordinates rounded to six decimals **only for output**, not scoring.

Additional error mapping: SQL `FORBIDDEN`→403; `NOT_FOUND`→404; `REVISION_CONFLICT`/`IDEMPOTENCY_CONFLICT`/`INVALID_REPORT_STATE`/`PHOTO_STATE_MISMATCH`/`JOB_NOT_RETRYABLE`→409; `DRAFT_QUOTA`/`RETRY_QUOTA`/`PHOTO_JOB_QUOTA`→429; photo-not-yet-processed→409 `PHOTO_PROCESSING`; graph mismatch/evidence overflow→503; invalid point/observed-time/edge/review/category/closure→422. SQL errors are mapped from an exact allowlist internally; client receives generic safe text. Unknown SQL exception→503 `DATA_OPERATION_FAILED`, retryable only for idempotent reads/identified operations. `NO_NETWORK_ROUTE`→422; route search truncation with checked candidates→200 partial-search metadata, while total handler deadline before a valid result→504.

Classifier result union: actual result is §7.4 with two finite scores in[0,1] summing to1±1e-6 and exact pinned model identifiers; manual result is `{schema_version:'1.0',advisory:'manual_review',model_id:null,model_revision:null,scores:null,calibrated:false,location_verified:false,depth_estimated:false,latency_ms:measured_number}`. UI never makes up missing scores. Job SELECT uses the explicitly granted columns, never `select('*')` against client-accessible vision jobs. Worker uses trusted service SELECT for lease/internal fields.

Public-read quotas may be skipped on a verified CDN cache hit because the handler is not invoked; expensive routes/mutations are never CDN cached. Rate-limit database failure is503, never permission to bypass limits. Runtime flags are read on write/worker boundaries, not trusted from a previously cached browser config. Hash identifiers from published sources are public; a signed image URL is a short-lived credential and excluded from telemetry.

## 13. AWS resources, IAM, configuration, and budget

### 13.1 Region and exact service selection

Own resources use `ap-south-1` (Mumbai). Copernicus public source reads use its published `eu-central-1` bucket region during build; do not copy whole global DEM tiles/data lakes unnecessarily. S3 output, workers, queue, and secrets share our region. Supabase and Vercel deployment regions should minimize cross-region latency; no AWS–Supabase private network is assumed.

| Service | Why AWS here / why this service | Integration and security | Cost / failure / credit-exit behavior |
|---|---|---|---|
| Lambda ingestion | Reliable frequent schedule independent of a request/browser; avoids a permanent worker and Hobby cron-frequency dependency | Scheduler IAM invokes Python adapter; fixed public source; role writes archive and reads backend secret | Milliseconds/GB-s usage; old run stays valid/stales on failure. Manual Vercel refresh replaces scheduling after credit exit. |
| Lambda vision | Makes an otherwise unserved HF classifier available on pay-per-use CPU; keeps heavy ML binaries outside Vercel request path | SQS event source, bounded image/ORT, private S3 model and Supabase image paths | No idle endpoint bill; pending/manual review on failure. Disable ML, retain Vercel image sanitization/manual moderation after exit. |
| Lambda maintenance | Durable enqueue repair, TTL cleanup, and redacted archive batches without a permanent daemon | Bounded DB RPC/reads, SQS sends, S3 audit writes, Storage deletes | Low scheduled usage; callable build/operator cleanup scripts replace scheduler after exit. |
| S3 | Immutable/hash-addressed raw environmental evidence, model and graph artifacts; separate from mutable app photos | Private public-access block, SSE-S3, no public CDN, immutable keys, lifecycle policies | Small storage/request/egress bill. Required graph/scenarios already bundled; weather/app state already in Supabase. Export retained artifacts before teardown. |
| SQS Standard + DLQ | Absorbs CPU-job bursts and supports at-least-once retries; avoids fragile fire-and-forget HTTP | Vercel IAM sender; only worker consumes; tiny message; encrypted at rest | Low request cost. DB queued status enables recovery; on exit no new SQS jobs, manual processing path. |
| EventBridge Scheduler | 15-min weather and5-min recovery schedules with delivery controls | Explicit scheduler execution role, target function ARNs, UTC, flexible window off | Tiny invocation volume. Disable schedules explicitly on budget stop/exit. |
| Secrets Manager | Prevent Supabase privileged key in Lambda env/template; centralized rotation | Lambda roles can GetSecretValue only this ARN; JSON fields `supabase_url`,`supabase_service_role_key` | Approximately $0.40/secret-month planning allowance plus API calls; can delete after AWS teardown because Vercel retains its own secret. |
| CloudWatch | Actual ingestion/job latency/error/DLQ visibility for operations and judges | Structured, redacted logs; alarm metrics; retention7 days | Avoid noisy payload logging; under1 GB planned. App still has Vercel/status/audit when AWS disabled. |
| IAM/STS OIDC | Short-lived Vercel/GitHub credentials, no long-lived AWS access key in project | Exact project/environment trust and least-privilege actions | No separate IAM charge; failed token exchange leaves durable job for retry. |
| AWS Budgets | Cost awareness against limited credits | Account budget with owner email; no automatic app mutation or promised hard cap | Budget notifications are not an immediate spending cutoff. Operator stop procedure below is required. |

No Amplify, Cognito, DynamoDB, OpenSearch, RDS, Step Functions, SageMaker endpoint, Fargate, EC2, EFS, NAT gateway, Bedrock, SNS/SMS, or API Gateway in the hackathon architecture. Supabase covers application auth/state/geospatial queries, Vercel covers HTTP/UI, one queue and three simple functions cover the required async work.

SageMaker Serverless was considered: it scales to zero but does not support GPU inference. The selected small CPU classifier needs none of its additional endpoint/container/deployment machinery. A larger multimodal GPU model would not become GPU-serverless just by choosing SageMaker Serverless. [R26a]

### 13.2 SQS job contract and recovery

Message body ≤1 KiB:

```json
{"schema_version":"1.0","job_id":"uuid","report_id":"uuid","request_id":"uuid"}
```

No user token, image URL, photo bytes, note, owner UUID, arbitrary model ID, or callback URL in a message. `report_id` must match the queried job's DB report. If not, quarantine as `MESSAGE_MISMATCH`.

Queue: Standard, SSE-SQS managed encryption, retention4 days, visibility720 s (=6×120 s worker timeout), long polling20 s, DLQ retention14 days, `maxReceiveCount=3`. Lambda event source batch size1, `MaximumBatchingWindowInSeconds=0`, `MaximumConcurrency=2`, `FunctionResponseTypes=[ReportBatchItemFailures]`. Account quota must accommodate the mapping; no reserved concurrency allocation that violates a new account's unreserved floor is required. [R31]

Worker sequence: schema → backend flags → `claim_vision_job(job_id,random_uuid)` → if no claim, acknowledge finished/active duplicate; if failed/exhausted no retry → read owned pending report and immutable job config → verify model/revision/artifact/recipe against runtime (mismatch permanently fails `MODEL_VERSION_MISMATCH`) → bounded original fetch and `pin_vision_source` hash → bounded processing → finish with lease token → delete original. Transient source/Storage/S3/network failure leaves leased running state and returns failed batch item; after lease expiry the next delivery can claim. Permanent invalid image marks failed with safe error and acknowledges. On withdrawal, abort and delete any just-created processed object. No cross-user path accepted from message.

A succeeded job's duplicate returns success without inference. A live lease duplicate is acknowledged because an active invocation owns it; maintenance recovers an interrupted invocation after lease expiry. Maintenance every5 min scans at most50 queued/expired-running jobs, oldest first, and re-enqueues only when `last_enqueue_at` older than5 min. Failed attempts≥3 become failed, with audit/status. Before send, call `reserve_vision_enqueue` to update the enqueue timestamp through a conditional DB operation so concurrent repair scans do not flood the queue. A send failure resets/retries conservatively; DB state is still the source of truth.

DLQ messages are investigated via admin/operator script, not automatically re-driven infinitely. `POST /admin/jobs/:id/retry` is the sole app retry path, checks original evidence still exists, enforces daily retry limit, and records who/why retried. It cannot turn a permanently invalid image into a success. Retry checks that the job's pinned model/recipe exists in this deployed release; a version mismatch is409, not silent reprocessing with new weights. Credit-exit manual processing is the explicitly allowed exception: retain original pinned config, return null-model manual result, and audit `processing_mode_changed:'aws_to_manual'` with reason `AWS_DISABLED`/`VISION_UNAVAILABLE`. Never claim that result came from the pinned HF model.

### 13.3 IAM boundaries

**Vercel production role** permits only:

- `sqs:SendMessage` on the vision queue ARN;
- `lambda:InvokeFunction` on ingestion function ARN for authenticated admin refresh.

No S3 write, Secrets Manager read, queue receive/delete, role administration, or Supabase secret retrieval from AWS. Vercel has its own server secret configured in Vercel.

Team-mode OIDC trust, generated from bootstrap inputs:

```json
{
  "Version":"2012-10-17",
  "Statement":[{
    "Effect":"Allow",
    "Principal":{"Federated":"arn:aws:iam::AWS_ACCOUNT_ID:oidc-provider/oidc.vercel.com/VERCEL_TEAM_SLUG"},
    "Action":"sts:AssumeRoleWithWebIdentity",
    "Condition":{"StringEquals":{
      "oidc.vercel.com/VERCEL_TEAM_SLUG:aud":"https://vercel.com/VERCEL_TEAM_SLUG",
      "oidc.vercel.com/VERCEL_TEAM_SLUG:sub":"owner:VERCEL_TEAM_SLUG:project:VERCEL_PROJECT_NAME:environment:production"
    }}
  }]
}
```

Strings in uppercase are deployment inputs, not literal claims. Bootstrap renders them from provided account/team/project values and validates the actual token claims before deploying. Separate preview/staging role/project; never wildcard production across projects or preview environments. Vercel's OIDC helper exchanges token for temporary STS credentials. [R32]

```ts
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider';
import { SQSClient,SendMessageCommand } from '@aws-sdk/client-sqs';
const sqs=new SQSClient({
 region:process.env.AWS_REGION,
 credentials:awsCredentialsProvider({roleArn:process.env.AWS_ROLE_ARN!})
});
await sqs.send(new SendMessageCommand({
 QueueUrl:process.env.AWS_VISION_QUEUE_URL,
 MessageBody:JSON.stringify({schema_version:'1.0',job_id,report_id,request_id})
}));
```

Local backend uses AWS SSO/operator temporary profile in the SDK default credential chain when AWS is enabled; do not attempt Vercel OIDC outside Vercel. Default local development is `AWS_ENABLED=false`. Lambda uses its execution role. GitHub deployment uses GitHub OIDC restricted to `repo:{owner}/{repo}:environment:production`; pull requests receive no production AWS/Supabase secrets. Deployment role needs CloudFormation/SAM/IAM provisioning rights only for the project, while runtime roles stay narrow.

### 13.4 SAM infrastructure contract

Commit `infra/aws/template.yaml` and `samconfig.toml`. The following is the required resource template baseline; required alarms are included and IAM OIDC bootstrap is described immediately after it. All paths are relative to the template.

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: MonsoonRoute serverless environmental data and CPU photo review
Parameters:
  BackendSecretArn: {Type: String}
  BuildSha: {Type: String}
  ModelKey: {Type: String}
  ModelSha256: {Type: String}
  ModelRevision: {Type: String}
  PreprocessorKey: {Type: String}
  PreprocessorSha256: {Type: String}
Globals:
  Function:
    Runtime: python3.12
    Architectures: [x86_64]
    Timeout: 60
    MemorySize: 512
    Environment:
      Variables:
        CITY_ID: delhi-central
        BACKEND_SECRET_ARN: !Ref BackendSecretArn
        LOG_LEVEL: INFO
        BUILD_SHA: !Ref BuildSha
    Tags: {Project: MonsoonRoute}
Resources:
  ArtifactBucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: Retain
    UpdateReplacePolicy: Retain
    Properties:
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        IgnorePublicAcls: true
        BlockPublicPolicy: true
        RestrictPublicBuckets: true
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault: {SSEAlgorithm: AES256}
      VersioningConfiguration: {Status: Enabled}
      LifecycleConfiguration:
        Rules:
          - Id: RawRetention
            Status: Enabled
            Prefix: raw/
            ExpirationInDays: 30
            NoncurrentVersionExpiration: {NoncurrentDays: 7}
          - Id: AuditRetention
            Status: Enabled
            Prefix: audit/
            ExpirationInDays: 30
            NoncurrentVersionExpiration: {NoncurrentDays: 7}
          - Id: AbortIncomplete
            Status: Enabled
            AbortIncompleteMultipartUpload: {DaysAfterInitiation: 1}
  ArtifactTLSOnly:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref ArtifactBucket
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Deny
            Principal: '*'
            Action: s3:*
            Resource: [!GetAtt ArtifactBucket.Arn, !Sub '${ArtifactBucket.Arn}/*']
            Condition: {Bool: {aws:SecureTransport: 'false'}}
  VisionDLQ:
    Type: AWS::SQS::Queue
    Properties: {QueueName: !Sub '${AWS::StackName}-vision-dlq', MessageRetentionPeriod: 1209600, SqsManagedSseEnabled: true}
  VisionQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub '${AWS::StackName}-vision'
      VisibilityTimeout: 720
      MessageRetentionPeriod: 345600
      ReceiveMessageWaitTimeSeconds: 20
      SqsManagedSseEnabled: true
      RedrivePolicy: {deadLetterTargetArn: !GetAtt VisionDLQ.Arn, maxReceiveCount: 3}
  Ingest:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub '${AWS::StackName}-ingest'
      CodeUri: ../../services/weather/
      Handler: handler.lambda_handler
      Environment:
        Variables:
          ARTIFACT_BUCKET: !Ref ArtifactBucket
      Policies:
        - Statement:
            - Effect: Allow
              Action: secretsmanager:GetSecretValue
              Resource: !Ref BackendSecretArn
            - Effect: Allow
              Action: s3:PutObject
              Resource: !Sub '${ArtifactBucket.Arn}/raw/weather/*'
  Vision:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub '${AWS::StackName}-vision'
      CodeUri: ../../services/vision/build/
      Handler: handler.lambda_handler
      Timeout: 120
      MemorySize: 3072
      EphemeralStorage: {Size: 2048}
      Environment:
        Variables:
          ARTIFACT_BUCKET: !Ref ArtifactBucket
          HF_MODEL_ID: prithivMLmods/Flood-Image-Detection
          MODEL_KEY: !Ref ModelKey
          MODEL_SHA256: !Ref ModelSha256
          MODEL_REVISION: !Ref ModelRevision
          PREPROCESSOR_KEY: !Ref PreprocessorKey
          PREPROCESSOR_SHA256: !Ref PreprocessorSha256
          ORT_THREADS: '2'
      Policies:
        - SQSPollerPolicy: {QueueName: !GetAtt VisionQueue.QueueName}
        - Statement:
            - Effect: Allow
              Action: secretsmanager:GetSecretValue
              Resource: !Ref BackendSecretArn
            - Effect: Allow
              Action: s3:GetObject
              Resource: !Sub '${ArtifactBucket.Arn}/models/*'
      Events:
        Queue:
          Type: SQS
          Properties:
            Queue: !GetAtt VisionQueue.Arn
            BatchSize: 1
            FunctionResponseTypes: [ReportBatchItemFailures]
            Enabled: false
            ScalingConfig: {MaximumConcurrency: 2}
  Maintenance:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub '${AWS::StackName}-maintenance'
      CodeUri: ../../services/maintenance/
      Handler: handler.lambda_handler
      Environment:
        Variables:
          ARTIFACT_BUCKET: !Ref ArtifactBucket
          VISION_QUEUE_URL: !Ref VisionQueue
      Policies:
        - SQSSendMessagePolicy: {QueueName: !GetAtt VisionQueue.QueueName}
        - Statement:
            - Effect: Allow
              Action: secretsmanager:GetSecretValue
              Resource: !Ref BackendSecretArn
            - Effect: Allow
              Action: s3:PutObject
              Resource: !Sub '${ArtifactBucket.Arn}/audit/*'
  SchedulerRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal: {Service: scheduler.amazonaws.com}
            Action: sts:AssumeRole
            Condition:
              StringEquals: {aws:SourceAccount: !Ref AWS::AccountId}
              ArnLike:
                aws:SourceArn: !Sub 'arn:${AWS::Partition}:scheduler:${AWS::Region}:${AWS::AccountId}:schedule/default/${AWS::StackName}-*'
      Policies:
        - PolicyName: InvokeProjectSchedules
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action: lambda:InvokeFunction
                Resource: [!GetAtt Ingest.Arn, !GetAtt Maintenance.Arn]
  WeatherSchedule:
    Type: AWS::Scheduler::Schedule
    Properties:
      Name: !Sub '${AWS::StackName}-weather'
      State: DISABLED
      ScheduleExpression: rate(15 minutes)
      ScheduleExpressionTimezone: UTC
      FlexibleTimeWindow: {Mode: 'OFF'}
      Target:
        Arn: !GetAtt Ingest.Arn
        RoleArn: !GetAtt SchedulerRole.Arn
        Input: '{"schema_version":"1.0","action":"capture_weather"}'
        RetryPolicy: {MaximumEventAgeInSeconds: 300, MaximumRetryAttempts: 2}
  MaintenanceSchedule:
    Type: AWS::Scheduler::Schedule
    Properties:
      Name: !Sub '${AWS::StackName}-maintenance'
      State: DISABLED
      ScheduleExpression: rate(5 minutes)
      ScheduleExpressionTimezone: UTC
      FlexibleTimeWindow: {Mode: 'OFF'}
      Target:
        Arn: !GetAtt Maintenance.Arn
        RoleArn: !GetAtt SchedulerRole.Arn
        Input: '{"schema_version":"1.0","action":"maintain"}'
        RetryPolicy: {MaximumEventAgeInSeconds: 300, MaximumRetryAttempts: 2}
  IngestLog:
    Type: AWS::Logs::LogGroup
    Properties: {LogGroupName: !Sub '/aws/lambda/${Ingest}', RetentionInDays: 7}
  VisionLog:
    Type: AWS::Logs::LogGroup
    Properties: {LogGroupName: !Sub '/aws/lambda/${Vision}', RetentionInDays: 7}
  MaintenanceLog:
    Type: AWS::Logs::LogGroup
    Properties: {LogGroupName: !Sub '/aws/lambda/${Maintenance}', RetentionInDays: 7}
  VisionErrorsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '${AWS::StackName}-vision-errors'
      Namespace: AWS/Lambda
      MetricName: Errors
      Dimensions: [{Name: FunctionName, Value: !Ref Vision}]
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 2
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      TreatMissingData: notBreaching
  DLQAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '${AWS::StackName}-vision-dlq'
      Namespace: AWS/SQS
      MetricName: ApproximateNumberOfMessagesVisible
      Dimensions: [{Name: QueueName, Value: !GetAtt VisionDLQ.QueueName}]
      Statistic: Maximum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      TreatMissingData: notBreaching
  WeatherErrorsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '${AWS::StackName}-weather-errors'
      Namespace: AWS/Lambda
      MetricName: Errors
      Dimensions: [{Name: FunctionName, Value: !Ref Ingest}]
      Statistic: Sum
      Period: 900
      EvaluationPeriods: 2
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      TreatMissingData: notBreaching
Outputs:
  ArtifactBucketName: {Value: !Ref ArtifactBucket}
  VisionQueueUrl: {Value: !Ref VisionQueue}
  VisionQueueArn: {Value: !GetAtt VisionQueue.Arn}
  IngestArn: {Value: !GetAtt Ingest.Arn}
  VisionArn: {Value: !GetAtt Vision.Arn}
  MaintenanceArn: {Value: !GetAtt Maintenance.Arn}
  WeatherScheduleName: {Value: !Ref WeatherSchedule}
  MaintenanceScheduleName: {Value: !Ref MaintenanceSchedule}
```

SAM synthesizes separate execution roles with logging permissions plus the policies shown. No `AdministratorAccess` attached to a runtime function. Scheduler trust is restricted by `aws:SourceAccount` and this stack's named schedule ARN prefix. No Lambda resource policy permitting public function invocation.

Deployment sequence resolves S3/model circular bootstrap: deploy infrastructure first with manifest parameter keys that will exist under `models/...`; SQS worker mapping remains disabled by a deployment script until artifacts are uploaded and checked. Upload exact model/processor manifest through deployment role → update manifest parameters → enable mapping → smoke test → enable schedules. Initial schedules are created disabled by setting `State: DISABLED` in both resources during initial bootstrap, then switched to `ENABLED` after graph/city/secret/data readiness. Commit this two-stage enable operation; do not let a schedule run against an empty DB.

The included CloudWatch alarms implement: vision `Errors` sum≥1 for2×5-min periods; DLQ `ApproximateNumberOfMessagesVisible`≥1 for1×5-min; ingestion `Errors`≥1 for2×15-min. Alarm actions can be empty for console visibility; do not add SNS merely for service count. Application status separately computes weather age. An alarm's absence of error does not imply forecast accuracy.

### 13.5 Artifacts and secret bootstrap

Operator creates Secrets Manager record via a secure local file/stdin path, not literal values in shell arguments/logs. Secret JSON: `{"supabase_url":"...","supabase_service_role_key":"..."}`. Bootstrap records only ARN. Rotate by updating secret version, then Vercel backend key separately and checking both; revoke old Supabase key only after workers have switched. Lambda caches secret ≤5 min per warm process. An unavailable/rotated secret is retryable; it does not create anonymous DB access.

The SAM package bucket is the explicitly named private deployment-only S3 bucket provisioned in §18.4; it is a tooling resource, not application state. Apply private/SSE/retention configuration to it and include it in cost inventory. No ECR repository or GPU image is required.

### 13.6 Cost estimates against $100

Planning horizon: **14 days including event**, not an always-on GPU month. Prices are approximations in USD before taxes, with a conservative Mumbai allowance; validate the region calculator/account price at deployment. No free-tier savings assumed. Lambda estimate uses approximately $0.000016667 per GB-second and $0.20/million requests; regional/tier/INIT differences matter. [R33–R35]

| Workload assumption | Approximate credit-consuming cost |
|---|---:|
| 1,344 captures, 0.5 GiB, 10 s/capture | $0.11 compute + negligible requests |
| 4,032 maintenance runs, 0.5 GiB, 5 s | $0.17 compute + negligible requests |
| 1,000 photos, average20 s including ordinary processing at3 GiB | $1.00 compute; allow another $1 for cold starts/retries |
| 2 GiB S3 data/artifacts for14 days, modest PUT/GET | $0.05–$0.30 |
| 0.5–2 GiB model downloads/outbound transfer and cross-cloud calls | $0.10–$1.00 allowance; same-region S3/Lambda has different transfer treatment |
| SQS/scheduler small volumes | <$0.20 allowance |
| One secret + API calls | ~$0.20–$0.50 |
| CloudWatch logs <1 GiB + three standard alarms | $0.50–$2.00 allowance |
| SAM build storage, developer experiments, small overhead | $1–$3 allowance |
| **Expected low-volume project envelope** | **Approximately $5–$10** |
| **Allocated planning reserve** | **$25 total**, retain ≥$75 credit headroom |

Stress ceiling:100 accepted inference units/day (new jobs + authorized retry resets)×14=1,400 units. If **every accepted unit uses three 120-s attempts plus a30-s billed initialization allowance per attempt**, compute is `1400*3*3*(120+30)*0.000016667 ≈ $31.50`. With capped logs/data and no GPU/NAT/idle service, this remains below $100, but is an abnormal failure/abuse scenario requiring early shutdown. Daily quota bounds new/retried work; attempt cap bounds retries. Budget alert20/25 dollars catches divergence before the credit ceiling, but alerts can lag.

For a four-day event and ~100 demo/development photos, normal AWS consumption should be a small fraction of the credits. This is a workload-based estimate, not a guaranteed bill or assurance credits cover every account/service charge. Credit validity/eligibility and unrelated account spending must be checked in AWS Billing.

Vercel/Supabase/HF/NVIDIA fees are **outside AWS credits**. Selected runtime has no paid HF/NIM API calls. Vercel Hobby and Supabase free tier may support a small educational pilot within their current quotas, subject to project eligibility and availability. Do not claim unlimited free production operation.

### 13.7 Cost controls and credit-exit procedure

Required controls: no provisioned concurrency, model endpoints, NAT, paid maps, always-on nodes, or automatic retraining; fixed per-photo bounds; global100/day and per-user quotas; three attempts; SQS concurrency2; logs≤1 KiB/event and7-day retention; raw/audit30-day lifecycle; artifact-cache hashes; no hourly global raster pulls.

AWS Budgets: create a monthly USD25 account budget with owner-controlled notification email, actual thresholds USD10/20/25 and forecast USD25. Account-level budget can include unrelated workloads; if cost-allocation tags are configured, add `Project=MonsoonRoute` filter with a second account-level safety budget. Budget email is an account configuration requirement, not a messaging action performed by this document. Costs/credits reports are inspected daily.

Commit `infra/aws/budgets.json` as a parameterized account bootstrap payload for `boto3.client('budgets',region_name='us-east-1').create_budget` (Budgets is account-level; resource runtime remainsMumbai). Render AWS account and owner email from deployment input. Core `Budget`:

```json
{
 "BudgetName":"MonsoonRouteMonthly",
 "BudgetLimit":{"Amount":"25","Unit":"USD"},
 "TimeUnit":"MONTHLY","BudgetType":"COST",
 "CostTypes":{
   "IncludeTax":true,"IncludeSubscription":true,"UseBlended":false,
   "IncludeRefund":false,"IncludeCredit":false,"IncludeUpfront":true,
   "IncludeRecurring":true,"IncludeOtherSubscription":true,"IncludeSupport":true,
   "IncludeDiscount":true,"UseAmortized":false
 }
}
```

`IncludeCredit:false` is deliberate: alert on consumption before credits offset the bill. NotificationsWithSubscribers contains four entries: ACTUAL/ABSOLUTE_VALUE/GREATER_THAN thresholds10,20,25 and FORECAST/ABSOLUTE_VALUE/GREATER_THAN25; each has `{SubscriptionType:'EMAIL',Address:rendered AWS_BUDGET_EMAIL}`. Bootstrap is idempotent: describe existing budget, compare/update intended budget/notifications and record safe config hash; no duplicate budgets. Owner verifies subscription/alert delivery. Do not configure Budgets actions that can terminate unrelated account resources.

At cost divergence or before credit expiry:

1. Admin sets `aws_enabled=false`, `vision_enabled=false`; keeps `photos_enabled=true` for Vercel sanitization/manual review, unless compute budget also requires no-photo reports.
2. Deploy/CLI sets EventBridge schedules disabled and SQS event-source mapping disabled; stop new AWS calls. A database flag alone does not stop AWS schedule invocation charges.
3. Resolve currently queued jobs through the manual sanitizer or mark failed with visible reason; never drop them without updating status.
4. Use `POST /admin/weather-refresh` from Vercel for manual15-min-rate-limited capture and publish. Automatic unattended capture is absent until scheduling is restored. Within60 min of last capture the planner still has fresh data; thereafter it honestly becomes closure-aware/unknown.
5. Vercel uses `sharp` with `limitInputPixels:4000000`, bounded3-MiB fetch, five-second transform deadline enforced in a local Node worker thread (terminate on timeout; compiled worker included by output tracing), orientation/metadata stripping, processed private copy. Finish the same leased job with `{advisory:'manual_review',model_id:null,calibrated:false}`. The photo classifier is visibly unavailable.
6. Export/archive retained desired model/provenance artifacts; graph, scenarios, and rules already ship in the GitHub/Vercel build. Run operator retention script through trusted backend credentials when scheduled cleanup is disabled.
7. Teardown AWS stack after reviewing retained private S3/secret resources. `DeletionPolicy:Retain` means stack deletion alone does **not** remove bucket charges. Explicitly remove unneeded object versions/bucket/secret after export. Use dry-run inventory before removal.

The core app remains usable for route decisions, reviewed closures, manual reporting, and scenario playback. Automatic weather capture and photo ML are the AWS-dependent enhancements. This is a real reduced-cost operating mode, not a claim all cloud-dependent functionality survives for free.

## 14. Environment variables and secrets

### 14.1 Runtime registry

No variable containing privileged credentials may use a `NEXT_PUBLIC_` prefix. Public flags are returned through `/config`; they cannot override backend flags. Startup validation rejects missing required values, invalid URLs, nonproduction localhost, bad hashes, and accidental server secrets in public values.

| Name | Purpose / value rule | Client-safe? | Configured in | Consumer |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Same project HTTPS URL used for Auth/Storage | Yes | Vercel + local `.env.local` | Browser Supabase client, SSR public client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public project key; not a service key | Yes | Vercel + local | Browser/SSR user-context client |
| `APP_ENV` | `local|ci|staging|production`; production requires HTTPS and hosted project; CI/local allow localhost | Server-only nonsecret | Vercel/local/CI | Env validation, deployment boundaries |
| `FIXTURE_MODE` | Defaults false; true only for isolated build/preview tests with labeled synthetic assets, auth/report/cloud unavailable; rejected in Vercel production | Server-only nonsecret | Local/CI or isolated preview only | Fixture-build adapter; never production authorization |
| `APP_URL` | Exact production Vercel origin, no trailing slash; local development origin separately | Public value but server config | Vercel + local | Origin checks, OAuth redirects, metadata |
| `SUPABASE_URL` | Backend project HTTPS URL; must equal public URL | Public value but server-only config | Vercel; also Secrets Manager JSON for Lambda | Privileged DB/Storage clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged backend key; use legacy service-role JWT for explicit worker REST auth in this baseline | **Server-only secret** | Vercel; Secrets Manager JSON (`supabase_service_role_key`) | Trusted API/worker clients; never browser |
| `RATE_LIMIT_HMAC_KEY` | Random≥32 bytes encoded secret, stable across instances | **Server-only secret** | Vercel | Quota/IP subject hashing |
| `AWS_ENABLED` | Master runtime allow/deny AWS SDK calls (`true` production initially, false local/fallback) | Server-only | Vercel/local | Enqueue, manual refresh provider, fallback selector |
| `AWS_REGION` | `ap-south-1` | Nonsecret server config | Vercel/local; AWS runtime supplies region automatically | AWS SDK clients |
| `AWS_ROLE_ARN` | Exact Vercel federated role ARN | Nonsecret server-only | Vercel production/staging separately | STS/OIDC helper |
| `AWS_VISION_QUEUE_URL` | Queue URL from SAM output | Nonsecret server-only | Vercel | SendMessage |
| `AWS_INGEST_FUNCTION_ARN` | Function ARN from SAM output | Nonsecret server-only | Vercel | Admin InvokeFunction |
| `CITY_ID` | `delhi-central` | Public identifier | Vercel; SAM env | All adapters/routing |
| `GRAPH_VERSION` | Published graph UUID, same as bundled manifest | Public identifier, server config | Vercel build/release env | Graph consistency gate |
| `GRAPH_SHA256` | Full actual compiled hash | Public identifier, server config | Vercel build/release env | Integrity check |
| `RULESET_ID` | Exactly `relative-risk-v1` for this release | Public identifier | Vercel | Risk/route provenance |
| `LOG_LEVEL` | `INFO` production; no secret/payload debug | Nonsecret server config | Vercel + SAM | Structured logging |
| `BACKEND_SECRET_ARN` | AWS secret containing URL/backend key | Nonsecret server-only | SAM parameter→Lambda env | All Lambda secret loaders |
| `ARTIFACT_BUCKET` | Private S3 bucket from output | Nonsecret server-only | SAM env | Ingestion/vision/maintenance |
| `VISION_QUEUE_URL` | Same SQS queue, worker-repair name | Nonsecret server-only | Maintenance Lambda SAM env | Maintenance SendMessage |
| `HF_MODEL_ID` | Exactly `prithivMLmods/Flood-Image-Detection` | Public identifier; server config | Vision SAM env + model manifest | Result provenance |
| `MODEL_REVISION` | Full resolved HF model commit SHA | Public identifier; server config | SAM parameter→vision env | Artifact provenance |
| `MODEL_KEY` | Immutable ONNX S3 key | Nonsecret server-only | SAM parameter→vision env | Model download |
| `MODEL_SHA256` | Hash of exported ONNX, not original safe weights | Public identifier; server config | SAM parameter→vision env | Integrity check |
| `PREPROCESSOR_KEY` | Immutable processor recipe S3 key | Nonsecret server-only | SAM parameter→vision env | Preprocessing download |
| `PREPROCESSOR_SHA256` | Hash of recipe file | Public identifier; server config | SAM parameter→vision env | Integrity check |
| `ORT_THREADS` | `2`; inter-op threads1, sequential execution | Nonsecret server config | Vision SAM env | ONNX session |
| `BUILD_SHA` | Release Git commit; generated at build | Public identifier | Vercel build env / bundled metadata; SAM release metadata | Status/version/audit |

Platform-generated `VERCEL_ENV`, `VERCEL_REGION`, and the Vercel OIDC token supplied to its credential helper are not manually copied secrets. OIDC tokens are sensitive short-lived server credentials; never return/log them. CI `GITHUB_SHA` becomes `BUILD_SHA`; no fallback to an invented commit. `FIXTURE_MODE=true` cannot be combined with hosted production Supabase credentials, AWS calls, or production deploy.

Constants in checked-in `packages/contracts/config.ts` and Python shared config: JSON limit64KiB, photo limit3MiB, pixel cap4M, processed limit512KiB, weather stale60min, route algorithm budgets, quotas, and TTLs. They are not unexplained environment overrides. Python/TypeScript config equivalence is checked by a shared JSON config artifact.

Database runtime flags supplement, but cannot override, `AWS_ENABLED=false`. Effective AWS permission is env master AND DB `aws_enabled`; effective vision also requires `vision_enabled`; photo upload requires `photos_enabled`. Only admin can change DB flags. A client cannot set these through form/query state.

### 14.2 Build/deployment credentials and identifiers

| Name | Purpose | Exposure / configuration | Consumer |
|---|---|---|---|
| `HF_TOKEN` | Optional read-only Hub token for build downloads/rate limits; public model may download without it | Secret, local secure env/GitHub protected environment; **not Lambda/browser** | Model resolver/export script |
| `SUPABASE_PROJECT_REF` | Target hosted project identifier | Nonsecret deployment env | CLI and Management API scripts |
| `SUPABASE_ACCESS_TOKEN` | Management/CLI authentication, narrowly permitted when possible | Deployment-only secret; never API/Lambda | Hosted configuration/type generation/migration workflow |
| `SUPABASE_DB_PASSWORD` | CLI remote database migration password | Deployment-only secret | Supabase CLI deployment; not frontend/runtime |
| `DATABASE_URL` | TLS PostgreSQL connection for trusted graph import/role bootstrap/migration verification; use pooler/session endpoint as appropriate | Deployment-only secret; not browser/runtime | Seed/import and security-test scripts |
| `GITHUB_OAUTH_CLIENT_ID` | GitHub OAuth app identifier | Nonsecret setup value, configure in Supabase Auth/local config | Auth configuration script |
| `GITHUB_OAUTH_CLIENT_SECRET` | GitHub OAuth app secret | Setup-only secret stored in Supabase Auth; never Vercel browser | Auth configuration script |
| `AWS_ACCOUNT_ID` | IAM/budget bootstrap account | Nonsecret deployment env | OIDC/SAM/IAM renderer |
| `AWS_DEPLOY_ROLE_ARN` | GitHub OIDC deployment role | Nonsecret protected GitHub environment | GitHub deploy workflow |
| `AWS_DEPLOY_BUCKET` | Deployment-only private S3 package bucket, generated `monsoonroute-deploy-{account}-ap-south-1` | Nonsecret protected deployment config | SAM packaging/deploy |
| `GITHUB_OWNER` / `GITHUB_REPO` | Exact repository subject inputs for GitHub OIDC trust | Nonsecret bootstrap config | IAM trust renderer |
| `AWS_PROFILE` | Local AWS SSO/temporary operator profile; absent on deployed Vercel | Local-only identifier | Local AWS SDK/CLI |
| `VERCEL_TEAM_SLUG` | Exact OIDC issuer/audience and owner slug | Nonsecret bootstrap input | IAM trust renderer |
| `VERCEL_PROJECT_NAME` | Exact Vercel OIDC subject project name | Nonsecret bootstrap input | IAM trust renderer |
| `VERCEL_ORG_ID` | Vercel CLI target organization ID | Deployment config | Vercel CLI workflow |
| `VERCEL_PROJECT_ID` | Vercel CLI target project ID | Deployment config | Vercel CLI workflow |
| `VERCEL_TOKEN` | Deployment/API token where CLI GitHub deployment is used | Protected deployment-only secret | Vercel CLI, not application |
| `AWS_BUDGET_EMAIL` | Account owner's budget alert recipient | Private deployment config | Budget bootstrap script |
| `ADMIN_USER_ID` | Verified Supabase auth UUID to seed first admin | Nonsecret but private bootstrap input; check against `auth.users` | Role bootstrap SQL/script |
| `KAGGLE_USERNAME` / `KAGGLE_KEY` | Optional legacy Kaggle download authentication, if supported by installed CLI; prefer CLI's current credential mechanism | Optional build-only secrets; never runtime/repo | Optional approved evaluation importer |
| `KAGGLE_API_TOKEN` | Optional current token mechanism when required by chosen pinned Kaggle CLI | Build-only secret; choose supported method, do not set contradictory mechanisms | Optional evaluation importer |

`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` are **not manually configured application secrets**. AWS SDK receives temporary STS/SSO/Lambda-role credentials. If a local process exports temporary session credentials, they expire and remain local; do not commit/reuse them as long-lived deployment keys.

`NVIDIA_API_KEY`, `NIM_MODEL_ID`, `NIM_BASE_URL` are **not required/configured for the hackathon**. If the explicitly future summary feature is later enabled, all are server-only: `NIM_MODEL_ID=meta/llama-3.1-8b-instruct`, `NIM_BASE_URL=https://integrate.api.nvidia.com/v1`, key from an actually authorized working account; the legacy endpoint's current availability must be reverified. Future `NIM_SUMMARY_ENABLED` defaults false. No code silently falls back to OpenAI/Bedrock/another provider.

### 14.3 Secret handling rules

`.env.example` contains names/comments only; `.env.local` and credential JSON are ignored. Use protected GitHub environments; no secrets in PR jobs. Do not log `process.env`, provider headers, cookies, signing URLs, or full SDK error objects. CI scans client assets/source maps for known secret prefixes/test sentinel secrets. The privileged Supabase key's existence in a server environment does not authorize passing it to a client component.

## 15. Frontend and repository architecture

### 15.1 Technology baseline

Next.js16 stable App Router, React19-compatible stable release, TypeScript5, Node22 LTS; MapLibre GL JS, Zod, Supabase JS/SSR, AWS SDK v3, Vercel OIDC provider; Tailwind CSS or plain CSS modules **choose CSS modules for this build** to avoid extra UI-framework setup. Use native accessible form controls with a small checked-in component library. Runtime dependencies are resolved to current supported security-patched versions at event opening and locked exactly with `package-lock.json`; major architecture versions remain as above. Dependency patch updates require CI, not blind upgrades. Next16 removed `next lint`; run ESLint explicitly. [R38]

No shadcn/Radix dependency is needed to deliver this small interface. Use system font stack, no remote font/CDN. Include license/attribution footer and third-party notices. Public static GeoJSON is served by Vercel CDN, not Lambda or an overloaded public tile server. A blank background style plus OSM-derived roads, water context if legally sourced in the same extraction, support boundary, and HTML landmarks is sufficient. Roads are named on hover/selection; no glyph server is hidden in the architecture.

### 15.2 Pages and state

| Page | Required UI |
|---|---|
| `/` | Concise problem, pilot scope, “Plan a route” CTA, honest maturity, four real product differentiators |
| `/plan` | Map + input panel + detour/horizon controls + route cards + evidence sheet + freshness banner + scenario switch |
| `/report` | Login gate, location/road selection, observed time/category, note/photo, privacy notice, status link |
| `/reports/:id` | Owned report state, advisory, timestamps, private image, withdraw action |
| `/review` | Role gate, paginated moderation queue, processed photo, mapped road/time, required reason/version-aware decision |
| `/history` | Optional owned saved journeys, immutable snapshot badge, delete |
| `/methodology` | Relative index formula, graph limitations, data sources, evaluation results with dates/status, no fake accuracy |

Client state: React reducer for planning session; request ID plus AbortController ignores stale responses when user changes inputs; debounced landmark search200 ms; map viewport changes debounce400 ms; no GPS permission unless user explicitly clicks locate, and coordinates are not tracked continuously. Default input is map-click/landmark to avoid false global geocoding claims. Poll owned job every2 s for30 s, every5 s to120 s, then show pending/retry support; stop polling hidden tab/navigation. Status poll every30 s while planning page visible.

URL shares only scenario/landmark preset IDs, not precise user locations or private report IDs. Saved route history requires explicit unchecked-by-default consent. Do not store raw trips in localStorage by default. Bilingual text toggle uses checked-in English/Hindi dictionaries; units stay explicit.

Motion: short150–250 ms panel/route transitions; `prefers-reduced-motion` respected; route paths must remain readable. Loading skeletons, accessible keyboard coordinate fields, error states, no-route state, stale state, and model-unavailable state are mandatory.

### 15.3 Repository structure

```text
monsoonroute/
  app/
    page.tsx
    plan/page.tsx
    report/page.tsx
    reports/[id]/page.tsx
    review/page.tsx
    history/page.tsx
    methodology/page.tsx
    auth/callback/route.ts
    auth/logout/route.ts
    api/v1/                 # each endpoint in §12 has a route.ts
  components/
    MapCanvas.tsx RouteCards.tsx EvidenceSheet.tsx
    ReportForm.tsx ReviewPanel.tsx FreshnessBanner.tsx
  lib/
    server/env.ts auth.ts authorization.ts quotas.ts
    server/supabase.ts aws.ts errors.ts logging.ts
    browser/supabase.ts
  packages/
    contracts/              # Zod and JSON schemas, typed result models
    engine/                 # pure graph/risk/route logic; no network/UI imports
    config/                 # canonical constants + shared JSON
  services/
    weather/handler.py adapters.py requirements.txt
    vision/handler.py inference.py sanitize.py requirements.txt build/
    maintenance/handler.py requirements.txt
  supabase/
    config.toml
    migrations/             # CLI-generated filenames, all SQL above
    seed.sql
    tests/rls.sql rpc.sql storage.sql
  infra/aws/
    template.yaml samconfig.toml
    bootstrap_oidc.py budgets.json
  models/
    manifest.json export.py parity.py
  data/
    manifests/ osm/ hotspots/ terrain/
    scenarios/              # immutable metadata and fixtures, explicit kind
  public/
    pilot/{graph_sha256}/roads.geojson landmarks.json
    scenarios/{artifact_sha256}/{scenario_id}.json
  artifacts/
    graph.json graph-manifest.json scenario-index.json
  evaluation/
    datasets/ metrics/ evaluate_routes.py evaluate_vision.py
  scripts/
    capture_osm.py build_graph.py build_terrain.py import_graph.py
    configure_supabase.mjs bootstrap_roles.py
    build_demo_scenarios.py check_artifacts.py retention.py
    deploy_aws.sh smoke.mjs aws_credit_exit.py
  tests/
    unit/ integration/ security/ e2e/ fixtures/
  .github/workflows/
    ci.yml deploy.yml
  docs/
    source-of-truth.md runbook.md data-provenance.md
    evaluation.md architecture.md THIRD_PARTY_NOTICES.md
  proxy.ts                 # supported SSR auth refresh + CSP nonce, no privileged DB key
  next.config.ts vercel.json package.json package-lock.json
  pyproject.toml uv.lock .env.example README.md
```

This is one application plus three small AWS functions, not a microservice fleet. Python shared config/HTTP utilities are bundled into functions at build, not hosted as another service. `packages/engine` exports `loadGraph`, `validateGraph`, `scoreEdges`, `generateCandidates`, `compareRoutes`; `packages/contracts` exports all request/result validators. All endpoint routes call service methods rather than duplicating business logic in React handlers.

## 16. Reliability, observability, and threat model

### 16.1 Network and timeout policy

| Boundary | Timeout / retry | Recovery |
|---|---|---|
| Vercel→Supabase reads |3-s connect,5-s request; one jittered retry for network/5xx within total deadline |503 unknown/unavailable; no fabricated empty evidence |
| Vercel→Supabase writes/RPC |5 s; retry only idempotent operation with stable identifier/expected revision |Read back ownership/version before retry; do not double-moderate |
| Vercel→SQS/STS |3-s connect,5-s operation; one bounded retry |DB queued job + maintenance outbox repair;202 pending with enqueue degradation |
| Weather→provider |§5 bounded10-s attempts,35-s total |Keep previous run, store error/freshness status |
| Worker→S3 model |30-s total download, bounded content length/hash |Cache verified file; transient failure retries, hash mismatch permanent quarantine |
| Worker→Supabase Storage |10-s bounded fetch≤3MiB, one retry |Queue/lease recovery; unsafe image fails closed |
| Model inference |Measured30-s target, worker120-s hard invocation |Failed/manual review visible; no auto-closure |
| Public browser→API |15-s ordinary UI timeout;55s for60s manual-processing/capture handlers; no blind mutation retry |Offer explicit retry with stable report finalization ID |

Use exponential backoff with jitter, bounded retries, and no retry for validation/auth/hash/format failures. Supabase is the app's indispensable state service; if unavailable, live planning fails rather than treating missing closures as open roads. Static scenario assets can render an explanatory offline preview, but server-generated recommendations are unavailable until DB/graph readiness returns.

### 16.2 Logs and status

Structured JSON fields: event, request_id, build_sha, job_id/report_id where appropriate, graph/ruleset/model revision, duration_ms, candidate_count, status/error_code, attempt, external_service, archive hash. Log no raw coordinates, notes, photos, cookies, keys, signed URLs, or OAuth codes. User UUIDs remain in limited database audit when required, not broad CloudWatch traces.

Metrics: route p50/p95/timeout/infeasible rates; weather capture age and errors; vision queue age/job latency/error/retry count; DLQ depth; report-to-route refresh latency; closure crossings prevented in controlled scenarios; monthly cost. Use existing platform metrics/log queries and DB `service_status`; custom metrics are optional only if justified by an operational need. Do not add a paid observability vendor.

`/status` is sanitized health, not scientific validation. An admin review panel may show job archive hashes and CloudWatch timestamps/region, but never tokens/secret ARNs. For recorded judge proof show AWS console invocation/log and S3 object separately with account IDs/secrets redacted.

### 16.3 Threat model

| Threat / trust boundary | Required control | Residual limitation |
|---|---|---|
| Fake/sybil reports |GitHub identity, quotas, manual review, source time, independent closure decisions |GitHub account is not proof of location; determined attackers can create accounts |
| False-clear poisoning |Clear report cannot lower relative score; closures need reviewer |Moderator can still make a wrong judgment; evidence is not field truth |
| IDOR/BOLA |Owner predicates, reviewer live roles, RLS,404 for non-owned objects |Service key bypasses RLS, so backend checks remain essential |
| Role escalation |No role in user_metadata, no client role writes, private role table |Trusted admin/DB credential compromise remains high impact |
| Prompt injection |No LLM/tool execution in mandatory workflow; notes rendered text |Future NIM summaries need isolated data-only prompts and schema checks |
| SSRF |Fixed data hosts; worker builds private Storage path from owned DB record; no user URL |Trusted operator source configuration must remain reviewed |
| Malicious/decompression-bomb photo |Byte sniff, size/pixel bounds, bounded decode, format allowlist, no animation |No uploaded file is made public or executed; content moderation is human |
| EXIF/location privacy |Orientation transform then metadata stripping, private processed copy, short URLs |Visible faces/plates may remain; images are private, not anonymized by an invented face model |
| Secret exposure |Server-only env, OIDC roles, scoped secret read, asset scanning, redacted logs |Broad Supabase backend key is a trusted-core secret; rotate on compromise |
| Cost abuse |Atomic limits, owned draft paths, no upsert, queue concurrency/attempt caps, budget runbook |Budget alerts lag; no claim of an automatic zero-overshoot spend cap |
| Partial ingestion |Validate whole capture, atomic publish, previous run preserved |Provider errors/forecast uncertainty still possible |
| Duplicate/out-of-order queue |Lease tokens, idempotent finish, short bounded state machine |SQS delivers at least once, not exactly once |
| Graph corruption/turn gaps |Pinned extraction, hashes, turn-state routing, conservative excluded unsupported ways |OSM can be incomplete/incorrect and graph restrictions reduce coverage |
| Replay leakage into live |Mode-scoped read sets and persistent banner, separate fixture IDs |Human presentation must also identify synthetic examples |
| False safety inference |Risk-index language, unknown state, limitations, no depth/vehicle guarantee |Unvalidated decision aid should not guide emergency or hazardous water crossing |
| OAuth callback/CSRF |PKCE/SDK state, exact redirect allowlist, same-origin mutation checks |XSS can compromise a session; CSP/plain-text rendering minimize attack surface |

### 16.4 Recovery runbook

Weather stale: inspect capture logs → verify upstream schema/status → admin manual refresh → retain unknown state until a valid publish. Model failure: inspect export/hash/parity/job error → manual review → restore only after smoke test. DB schema mismatch: stop writes → rollback application to compatible release → apply forward fix; do not drop production tables to recover. Queue backlog: check worker/mapping/lease/errors → keep quota → admin retry bounded jobs → no infinite redrive. Secret compromise: disable provider/worker actions → rotate Supabase/backend secret and deployment keys → review audit/roles → re-enable after ownership tests. Graph update: stage new graph/artifacts → validate hashes/reachability/restrictions → atomic activate + compatible app release; do not mix old report edges with new graph silently.

## 17. Tests, ML evaluation, and reproducibility

### 17.1 Release gates

A green frontend build alone is insufficient. Release requires graph/data integrity, authorization tests against local Supabase, route invariants, end-to-end flows, deployed provider/OIDC smoke tests, and the relevant inference gates. The manual-review fallback has its own acceptance tests; a release using it MUST display `vision_available:false` and exclude an ML-performance claim.

| Layer | Mandatory tests / fixtures | Pass criterion |
|---|---|---|
| Contracts | Every body/query/result schema; extra keys, NaN/Infinity, coordinate reversal, overlong text, bad UUID/cursor, unsupported horizon, photo MIME | Invalid input rejected before cloud/database/model mutation |
| Risk engine | Exact formula reference cases; missing D; stale/weather boundary30/60 min; future interval convention; age clamp; expired report; clear/positive conflict; C vs R distinction | Numerical tolerance1e-8; stale comparison null; clear never lowers R |
| Graph | Oneway±1, roundabout, shared-node vs crossing lines, bridge/tunnel, via-node only/no restrictions, unsupported conditional/via-way exclusion, physical reverse edges | No invented crossing, illegal direction/turn, or evidence propagation to unrelated piece |
| Routing | Disconnection, same snap node, detour0, closure on baseline/both directions, directed exception, no feasible path, zero baseline exposure, timeout/search budget, ties/overlap | Every recommended path legal/connected/closure-free, T≤Tcap+1e-6; deterministic ties; no global-optimum claim |
| Database | Clean reset runs full migration+seed, composite FKs, invalid statuses/expiries, unique photo job, atomic weather publish rollback | Expected constraints hold; partial capture never published |
| RLS / storage | Anonymous, userA, userB, moderator, removed moderator; direct REST tables/RPC/storage calls, upsert/delete/upload prefix attacks | No cross-user/private read or client application mutation; service-only RPC denied to all user JWTs |
| Concurrent writes | Two finalizations, two review decisions same revision, quota race100 contenders, duplicate worker, expired lease/stale finish, withdrawal vs finish, retry vs finish | One job/one accepted revision; quota cap not exceeded; invalid lease cannot commit; no deadlock or resurrected photo |
| AWS adapter | Exact SQS JSON, ignored unknown message fields, failed item responses, reserved enqueue, disabled flags, STS deny, artifact hash mismatch | Recoverable state persists; no arbitrary ARN/path/user URL; invalid model quarantined |
| Image processing | JPEG/PNG/WebP, falsely named files, EXIF rotation, animated image, >4M pixels, >3MiB, metadata strip, output≤512KiB | Unsafe input fails; correct oriented RGB; bounded processed copy; raw not public |
| Weather | Malformed arrays/cells/time/unit; duplicate capture; provider coordinates; 429/retry; failed archive; DB failure | Whole capture valid before publish; failed fetch does not reset age |
| Privacy/retention | Withheld history, withdraw with racing worker, raw24h/processed7d, user deletion/path cleanup, redacted archive, late-committing audit ID | No unconsented coordinates/photo in logs/history/archive; cleanup retry works; no skipped archive event |
| Frontend/E2E | Mobile/desktop, keyboard forms, reduced motion, EN/HI, public plan, login/report/upload/job/review/reroute/history/delete | Complete observable journey; no stale response replacing newer request |
| Deployment | Actual AWS OIDC restricted claims, Lambda ZIP/memory/time, schedule enable/disable, Supabase hosted settings, graph hash parity, live weather | Gates recorded with timestamps and versions; no secret in client bundle |

Use Vitest for TS unit/contract tests, pytest for Python image/weather adapters, Playwright for E2E, and SQL/HTTP integration scripts against disposable local Supabase. Unit tests mock external boundaries, not the routing/risk implementation. Security tests MUST use real anon/user JWTs against the database and Storage, not only mock an owner check. No test helper/login bypass route ships in production.

Property tests: generate ≥200 small directed graphs with known legal transitions, closures and positive nonnegative weights; compare shortest-time Dijkstra with exhaustive legal loopless paths when graph size≤8 nodes. For full candidate routing, assert invariants and reproduce its declared candidate set; do not expect it to equal the globally optimal constrained route on every generated graph. Store any failure seed as a regression fixture.

### 17.2 Measurable engineering and demo outputs

Record results in `evaluation/metrics/release.json` with build/date, graph/model hashes, environment/region, test counts, and evidence files. The methodology page renders this file and labels absent measurements `not measured`.

- ≥50 pilot OD cases: route success/infeasibility, baseline/alternative duration, distance, X/U/J, achieved detour, candidate count, search truncation, closure crossings. Use reproducible seeded sample pairs and identify synthetic hazards.
- Backend target: warm `/routes` p95≤3 s at10 concurrent users, hard route-handler deadline30 s; run50 measured requests after5 warmups. Report cold latency separately. No assumed100k-user benchmark.
- Report→reviewed closure→next route target≤10 s after review response without a stale evidence cache; poll result and record timestamps. This is app propagation, not field detection latency.
- Vision: at least20 deployed jobs after export parity, warm/cold p50/p95, peak memory/duration and error count. Cold target<110 s, warm inference≤30 s. Queue wait and inference time reported separately.
- Cost: actual AWS estimate from Billing/Cost Explorer when available, plus invocations/durations × rate model; billing may lag. Do not turn a short demo into a definitive month bill.
- Public scorecards: only measured values; no author-model accuracy, emissions avoided, “safe route,” or lives-saved estimate.

### 17.3 Photo evaluation

For any labeled independent/uncertain-independent evaluation set, publish dataset version/license, class counts, acquisition method, near-duplicate groups, train-overlap uncertainty and number of ambiguous exclusions. Use scene/storm/geography grouping; freeze test labels before comparing thresholds. A small convenience sample is an engineering check and must be identified as such.

Report confusion matrix, flooded-class precision/recall/F1, balanced accuracy, AUROC/AUPRC when both labels exist, and advisory coverage/error for thresholds0.2/0.8. Report flooded-scene false-negative rate explicitly. Bootstrap95% intervals by scene group (1,000 resamples) when sample size supports it; otherwise show counts and avoid spurious precision. Compare: selected FP32 classifier; optional int8 only if deployed; generic CLIP zero-shot baseline only as an offline experiment if its actual inference is implemented. No unexecuted baseline scores.

Scores remain uncalibrated. Rivers/lakes, wet asphalt, night scenes and screenshots form an OOD stress set; the classifier can be confidently wrong. An image assessment neither approves a report nor closes a road. The mandatory human gate remains even if measured image precision is high.

### 17.4 Road-risk and route-outcome evaluation

IMPLEMENT FOR HACKATHON: deterministic engine tests, controlled scenarios, route legality/detour metrics and modeled exposure reduction. These prove implementation behavior, not actual waterlogging prediction quality.

FUTURE SCOPE: collect independent geocoded positive **and verified-negative** road observations across ≥5 distinct storms and held-out spatial groups. Features at decision time may use only information available then. Hold out entire storm events; also report spatial holdout. Preserve one untouched final test set. Thresholds/weights calibrated only on dev storms, never on test labels. Comparing a model with its own input reports is circular; remove label leakage and record evidence cutoffs.

For labeled risk ranking report AUPRC (class imbalance), AUROC, positive precision/recall at fixed coverage and ordinal correlation with verified severity. Do not compute Brier/ECE for this heuristic and imply probability calibration. If a future calibrated model is trained, then measure Brier, reliability/ECE and discrimination against the deterministic baseline. For actual route benefit measure independently observed flooded/closed meters on both routes at comparable event/time, detour and abstention; bootstrap by storm. Do not use X reduction as ground truth for fewer actual hazard encounters.

### 17.5 Reproducibility pack

Commit source manifests, normalized graph and fixture hashes, ruleset/config JSON, full HF revision/artifact hashes, exact JS/Python locks, seeds, transformations and generated result schemas. Large private images/weights do not belong in the public GitHub repository; publish only permitted derived artifacts and instructions to resolve the exact public model revision. Any retained raw source requiring restrictions remains in private storage with a recorded source/hash. The public graph derivative carries OSM attribution/ODbL notices. Archive weather data retain source attribution/license.

No live data or private photo is required for ordinary PR CI. Deployed smoke tests require real credentials and are separate; checked-in fixtures must never be mistaken for current live service output.

## 18. Deployment and CI/CD

### 18.1 Preconditions and versions

At event opening create a **new public GitHub repository** with license, source attribution and first project implementation commit. Local prerequisites: Node22, Python3.12, npm, `uv`, Docker for Supabase/SAM build, AWS CLIv2 + SAM CLI, a pinned Supabase CLI dev dependency. Resolve security-patched dependency versions once, save exact `package-lock.json`/`uv.lock`, and use `npm ci`/`uv sync --frozen` thereafter. Record CLI versions in `docs/runbook.md`. Never execute downloaded model remote code.

Account prerequisites: Vercel project/subdomain; new Supabase project; GitHub OAuth app; AWS account with valid credits and Mumbai Lambda/Scheduler/SQS/STS quotas. These require account owners; no credentials are assumed to exist. The deploying agent must obtain values through the existing authorized account configuration or ask only for unavailable account values. This document does not purchase a paid plan or provision services.

Use production stack name `monsoonroute-prod`, region `ap-south-1`, tags `Project=MonsoonRoute,Environment=production`. For staging use a separate Supabase project/Vercel project, stack `monsoonroute-staging`, isolated roles/flags/data. Do not give arbitrary Vercel PR previews production keys. If a second free Supabase project is unavailable, previews use local/fixture mode and production deployment waits for a protected release; no additional paid plan is implied.

### 18.2 Local Supabase configuration and seeds

Required `supabase/config.toml` (remaining generated local service settings may use CLI defaults):

```toml
project_id = "monsoonroute"
[api]
enabled = true
port = 54321
schemas = ["public"]
extra_search_path = ["public", "extensions"]
max_rows = 2000
[db]
port = 54322
major_version = 15
[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]
jwt_expiry = 900
enable_signup = true
enable_anonymous_sign_ins = false
[auth.email]
enable_signup = false
[auth.external.github]
enabled = true
client_id = "env(GITHUB_OAUTH_CLIENT_ID)"
secret = "env(GITHUB_OAUTH_CLIENT_SECRET)"
[storage]
enabled = true
file_size_limit = "3MiB"
```

CI uses a separate checked-in local configuration with GitHub provider disabled; disposable admin-created, confirmed users and local Auth password signin provide test sessions. This is confined to local Supabase; hosted production email/phone login remains disabled. Integration tests never forge a JWT with a production signing key. App tests receive a legitimate local SDK session; no production test-auth endpoint.

Commit `supabase/seed.sql`:

```sql
insert into public.cities(id,name,supported_bbox) values
 ('delhi-central','Central Delhi',gis.st_makeenvelope(77.190,28.600,77.245,28.655,4326));
insert into public.data_sources(id,name,source_url,license,limitations) values
 ('osm','OpenStreetMap','https://www.openstreetmap.org/copyright','ODbL 1.0',
  array['Contributor data may be incomplete','Pilot excludes unsupported restrictions']),
 ('copernicus-dem','Copernicus DEM GLO-30','https://registry.opendata.aws/copernicus-dem/',
  'Copernicus DEM terms; retain exact linked license in source manifest',
  array['Surface elevation, not roadway water depth','Bridge/tunnel uncertainty']),
 ('delhi-traffic-police','Delhi Traffic Police June 2025 newsletter',
  'https://traffic.delhipolice.gov.in/sites/default/files/uploads/2025/NEWSLETTER-JUNE-25.pdf',
  'Official publication; extract reviewed location facts with source attribution; no blanket redistribution claim',
  array['No complete geocoded 57-location label set']),
 ('open-meteo-forecast','Open-Meteo forecast','https://open-meteo.com/en/docs','CC BY 4.0 + API usage terms',
  array['Numerical model precipitation, not street sensors','Issuance metadata may be absent']),
 ('open-meteo-archive','Open-Meteo historical weather','https://open-meteo.com/en/docs/historical-weather-api',
  'CC BY 4.0 + API usage terms',array['Reanalysis does not prove road flooding']),
 ('hf-flood-classifier','Hugging Face flood photo classifier',
  'https://huggingface.co/prithivMLmods/Flood-Image-Detection','Apache-2.0 model tag; archive card/license',
  array['Author performance not independently verified','Training-data linkage uncertainty']);
```

The seed does not activate a graph or pretend a curated hotspot exists. `source_artifacts.license_review` controls each actual imported artifact. `capture_osm.py`, `build_terrain.py`, `build_graph.py`, `import_graph.py` run in sequence; graph import publishes one transaction. `bootstrap_roles.py` checks `ADMIN_USER_ID` exists in `auth.users`, inserts/upserts private admin role, and audits assignment; only deployment/operator DB credentials may run it. It does not assign the first arbitrary person who signs up.

### 18.3 Hosted Supabase configuration — exact Management API contract

`scripts/configure_supabase.mjs` reads deployment secrets, validates URL/ref, sends `Authorization: Bearer SUPABASE_ACCESS_TOKEN`, never logs headers/body/secrets, and patches:

```text
PATCH https://api.supabase.com/v1/projects/{SUPABASE_PROJECT_REF}/config/auth
Content-Type: application/json
```

```json
{
  "site_url":"APP_URL rendered value",
  "uri_allow_list":"APP_URL/auth/callback rendered value",
  "disable_signup":false,
  "jwt_exp":900,
  "external_github_enabled":true,
  "external_github_client_id":"GITHUB_OAUTH_CLIENT_ID rendered value",
  "external_github_secret":"GITHUB_OAUTH_CLIENT_SECRET rendered value",
  "external_email_enabled":false,
  "external_phone_enabled":false,
  "external_anonymous_users_enabled":false
}
```

OAuth signup must remain allowed while direct email/phone/anonymous login is disabled. Supabase callback URL in the GitHub app is `https://{ref}.supabase.co/auth/v1/callback`. Configure the separate staging GitHub app accordingly; never put its GitHub secret in frontend environment variables. Confirm provider settings through a redacted allowlisted GET comparison, not a full secret-bearing response dump. [R39]

```text
PATCH https://api.supabase.com/v1/projects/{SUPABASE_PROJECT_REF}/postgrest
```

```json
{"db_schema":"public","db_extra_search_path":"public,extensions","max_rows":2000}
```

This endpoint is `/postgrest`, **not** `/config/postgrest`. `gis`/`private` stay unexposed; SQL calls GIS functions with qualified names. [R40]

`supabase link --project-ref ...` and `supabase db push` apply migrations/seed through the CLI or a versioned deployment script. Confirm whether the pinned CLI automatically pushes seed; run the checked-in seed explicitly once with recorded release if needed. SQL migrations are forward-only, applied once; seed handles a fresh project and is not repeatedly replayed to create duplicates. Hosted settings and bucket SQL are both required. Generate `database.types.ts` from the applied schema and diff it against committed types.

### 18.4 AWS provisioning and model deployment sequence

1. Using AWS SSO/temporary operator credentials, verify account/region/credits, quotas, create private deployment package bucket `monsoonroute-deploy-{AWS_ACCOUNT_ID}-ap-south-1` (SSE-S3, block all public access, TLS-only policy, abort incomplete uploads1day, packaged-code expiration30days). It is a **deployment-only S3 bucket**, not duplicated application storage. Add its small usage to S3 estimate; explicitly clean old package versions on teardown. Set `AWS_DEPLOY_BUCKET` to this generated name.
2. Create Secrets Manager `monsoonroute/backend` with the §13.5 JSON. No secret literal in shell history/CLI args. Record `BACKEND_SECRET_ARN` securely in deployment config.
3. Resolve/export/evaluate model locally or in protected build CI. Commit revision/hash/recipe manifest; keep large ONNX private. Produce source manifest, FP32 parity output, image bounds tests, model package-size report.
4. `sam validate --lint --template-file infra/aws/template.yaml`; build compatible wheels/code (`sam build --use-container` is allowed as a transient build process). Verify zipped/layer uncompressed≤250MiB and no PyTorch/Transformers in runtime.
5. `sam deploy` to `monsoonroute-prod` with package bucket, `CAPABILITY_IAM`, region, parameters BackendSecretArn/BuildSha/ModelKey/ModelSha256/ModelRevision/PreprocessorKey/PreprocessorSha256. Outputs feed Vercel. Template creates **disabled** schedules and disabled SQS mapping.
6. Upload immutable model/processor to ArtifactBucket `models/{model_revision}/{artifact_sha256}.onnx` and corresponding recipe JSON. Verify download hash; no overwrite of a different model at a stable key. Complete secret/graph/city/source readiness before invoking functions.
7. Invoke ingestion via CLI/IAM; verify nine cells published and raw archive hash. Invoke vision synchronously with a real SQS-shaped test event referencing a prepared owned report/job; verify export/cold/warm gates and original deletion. A synchronous test is not an anonymous prediction endpoint.
8. Discover SQS event-source mapping UUID by `list-event-source-mappings` filtered to VisionArn+VisionQueueArn; require exactly one. Enable with `update-event-source-mapping --uuid ... --enabled`; submit actual queued job and confirm SQS delivery/lease/result/fallback and withdrawal races.
9. For each schedule use `get-schedule` → change only State toENABLED → `update-schedule` with required name/schedule expression/flexible window/target (do not send read-only ARN/creation metadata). A script constructs the exact allowed input fields from GET. Confirm next invocation/log/DB status, then finish public demo smoke.
10. Any subsequent SAM deployment resets those resources toDISABLED as specified; the release script reruns readiness/smoke and explicitly re-enables them. Failure leaves them disabled. No unnoticed spend against a half-deployed system.

`samconfig.toml` commits stack name/region/capabilities/package-bucket input without secrets; secret ARN is nonsecret but deployment-specific. Parameters/hashes are generated from checked-in manifests, never guessed. Do not insert zero hashes just to enable a failing worker. Bootstrap environment values may be placeholders until actual account resource creation; generated identifiers are exact once stack outputs exist.

### 18.5 Deployment IAM and OIDC bootstrap

Runtime IAM is §13. GitHub trust for the deploy role:

```json
{
  "Version":"2012-10-17",
  "Statement":[{
    "Effect":"Allow",
    "Principal":{"Federated":"arn:aws:iam::AWS_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"},
    "Action":"sts:AssumeRoleWithWebIdentity",
    "Condition":{"StringEquals":{
      "token.actions.githubusercontent.com:aud":"sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub":"repo:GITHUB_OWNER/GITHUB_REPO:environment:production"
    }}
  }]
}
```

Create GitHub and Vercel OIDC providers through an operator bootstrap using exact HTTPS issuer/audience and the AWS IAM-supported certificate thumbprint/validation procedure; do not hardcode an obsolete certificate fingerprint. This is one-time account provisioning. No PR subject/wildcard repository trust. Vercel production trust is the exact §13.3 contract.

The protected GitHub deployment role is an infrastructure administrator **for this project**, not a runtime role. Commit rendered policy JSON with these allowed actions/resources:

| Actions | Exact resource pattern / condition |
|---|---|
| CloudFormation `CreateChangeSet,ExecuteChangeSet,DescribeChangeSet,DescribeStacks,DescribeStackEvents,DescribeStackResources,GetTemplate,UpdateStack,CreateStack` | `arn:aws:cloudformation:ap-south-1:{account}:stack/monsoonroute-prod/*` (staging uses its own role/prefix) |
| CloudFormation `ValidateTemplate,ListStacks` | `*` (read/validation API requires account scope) |
| IAM `CreateRole,DeleteRole,GetRole,TagRole,PutRolePolicy,DeleteRolePolicy,GetRolePolicy,ListRolePolicies,AttachRolePolicy,DetachRolePolicy,ListAttachedRolePolicies,UpdateAssumeRolePolicy` | `arn:aws:iam::{account}:role/monsoonroute-prod-*` only; SAM-generated roles must match stack prefix |
| IAM `PassRole` | Same role prefix; `iam:PassedToService` in `lambda.amazonaws.com,scheduler.amazonaws.com` |
| Lambda `CreateFunction,UpdateFunctionCode,UpdateFunctionConfiguration,GetFunction,GetFunctionConfiguration,DeleteFunction,TagResource,UntagResource,ListTags,AddPermission,RemovePermission` | `arn:aws:lambda:ap-south-1:{account}:function:monsoonroute-prod-*`; give functions explicit `FunctionName` with stack prefix |
| Lambda `CreateEventSourceMapping,UpdateEventSourceMapping,DeleteEventSourceMapping` | `Resource:'*'` with `Condition:{ArnEquals:{'lambda:FunctionArn':'arn:aws:lambda:ap-south-1:{account}:function:monsoonroute-prod-vision'}}`; verify queue target matches stack. This condition is documented by AWS. [R43] |
| Lambda `GetEventSourceMapping,ListEventSourceMappings` | `Resource:'*'` read-only discovery; filter by exact function/queue in script, require one matching mapping. Never grant these operations to Vercel/browser. |
| SQS `CreateQueue,DeleteQueue,GetQueueAttributes,SetQueueAttributes,TagQueue,UntagQueue,ListQueueTags,GetQueueUrl` | `arn:aws:sqs:ap-south-1:{account}:monsoonroute-prod-*`; explicit queue names |
| S3 `CreateBucket,DeleteBucket,GetBucketLocation,GetBucketPolicy,PutBucketPolicy,DeleteBucketPolicy,GetEncryptionConfiguration,PutEncryptionConfiguration,GetBucketPublicAccessBlock,PutBucketPublicAccessBlock,GetBucketVersioning,PutBucketVersioning,GetLifecycleConfiguration,PutLifecycleConfiguration,GetBucketTagging,PutBucketTagging,ListBucket` | `arn:aws:s3:::monsoonroute-prod-*` and exact deployment package bucket |
| S3 `GetObject,PutObject,DeleteObject` | Those bucket object ARNs only; CI artifact upload/package, not private photo Storage |
| Scheduler `CreateSchedule,UpdateSchedule,GetSchedule,DeleteSchedule` | `arn:aws:scheduler:ap-south-1:{account}:schedule/default/monsoonroute-prod-*` |
| Logs `CreateLogGroup,DeleteLogGroup,DescribeLogGroups,PutRetentionPolicy,TagResource,UntagResource,ListTagsForResource` | Project log group ARNs; describe may need `*` |
| CloudWatch `PutMetricAlarm,DeleteAlarms,DescribeAlarms,TagResource,UntagResource,ListTagsForResource` | Project alarm ARNs; read/put APIs requiring `*` allowed with project names validated in script |
| Secrets Manager `DescribeSecret` | Exact backend secret ARN; deployment CI does **not** read the Supabase secret value from AWS |

The included SAM template gives each function, queue, schedule, and alarm its exact stack-prefixed name matching those policies. The artifact bucket generated CloudFormation name begins with stack prefix; package bucket is explicit. Operators create the secret/OIDC providers/budget once, outside CI; application deployment has no IAM-provider, billing, EC2, GPU, NAT, or unrelated service privileges.

If the actual SAM-generated resource policy needs an additional action, investigate the CloudTrail/CloudFormation denial and update the checked-in narrow policy. Do not “fix” deployment with `AdministratorAccess`. All project prefix/ARN rendering is unit-tested and actual deploy-role denied access to an unrelated queue/function is smoke-tested. This account-specific least-privilege rendering is an implementation task with specified boundaries, not an invented general cloud service.

### 18.6 Vercel configuration

`vercel.json`:

```json
{
  "$schema":"https://openapi.vercel.sh/vercel.json",
  "framework":"nextjs",
  "regions":["bom1"],
  "installCommand":"npm ci",
  "buildCommand":"npm run build"
}
```

Each App Router handler exports `runtime='nodejs'`, `preferredRegion='bom1'`, `maxDuration=30`; admin weather-refresh and report-finalize/admin-retry handlers export60 to permit the bounded manual fallback. Actual AWS enqueue is fast/asynchronous. Do not configure Edge runtime for Node/AWS/Sharp. Enable supported Fluid Compute in project settings; verify available region and plan restrictions. Ordinary handlers remain30s; the three named capture/manual-processing exceptions use60s and a50s internal work deadline. No WebSocket/background-loop dependency.

`next.config.ts` traces only required server graph/manifest files for API handlers and excludes offline model/data tooling. Use `outputFileTracingIncludes` for server graph assets; validate `.vercel/output` contains them and stays<100MiB uncompressed. Static roads/scenarios/landmarks are under `public/`. Never bundle ONNX/PyTorch/DEM/raw photos into Vercel.

Security headers: CSP `default-src 'self'`; scripts self plus Next-supported nonce strategy; `connect-src 'self' https://{ref}.supabase.co`; images self/blob/data and same Supabase HTTPS host; `worker-src 'self' blob:` for MapLibre; `object-src 'none'`; `base-uri 'self'`; `frame-ancestors 'none'`; restricted `form-action`; Referrer-Policy `strict-origin-when-cross-origin`; X-Content-Type-Options `nosniff`; Permissions-Policy disallow camera/microphone and allow geolocation only self; HSTS supplied by HTTPS deployment. MapLibre workers must be packaged self-hosted. OAuth navigation may leave origin but does not authorize arbitrary script/connect hosts. Verify CSP with the actual Next/MapLibre build; no permanent wildcard/unsafe-eval in production.

Use nonce-bearing dynamic server layouts if required by Next CSP; do not combine an untested strict static CSP with inline Next scripts. Browser route rendering reads API results, not server secrets. Production Vercel subdomain is assigned by project setup and stored as exact `APP_URL`; no custom-domain purchase. Hobby usage must meet its current personal/noncommercial eligibility; commercial scaling is a future paid-plan decision. [R24,R41]

### 18.7 GitHub workflows

CI (`.github/workflows/ci.yml`) runs on PR/push without production secrets. Pin action releases to reviewed immutable commit SHAs when committing implementation; tags below identify the intended actions, not an excuse to leave them unpinned. Use explicit read-only permissions.

```yaml
name: ci
on: [pull_request, push]
permissions:
  contents: read
jobs:
  contracts-and-engine:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: '22', cache: npm}
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit
      - run: npm run check:artifacts
      - run: npm run build:fixture
  python-adapters:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: '3.12'}
      - run: python -m pip install uv
      - run: uv sync --frozen --group test
      - run: uv run pytest tests/unit/python
  database-security-e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: '22', cache: npm}
      - run: npm ci
      - run: cp supabase/config.ci.toml supabase/config.toml
      - run: npx supabase start
      - run: npx supabase db reset
      - run: npm run test:integration
      - run: npm run test:security
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - if: always()
        run: npx supabase stop --no-backup
```

Integration scripts read `supabase status -o json` through a child process, mask local keys before optional logs, and create a temporary env file ignored by Git. `build:fixture` uses only checked-in mock/fixture environment with AWS disabled and no production Supabase key. `test:e2e` starts local Next through Playwright's `webServer` configuration. The GitHub-auth online smoke is separately performed against staging; CI checks callback state/error/redirect logic with supported test doubles.

Required npm scripts: `lint`→ESLint app/packages/tests; `typecheck`→tsc noEmit; `test:unit`→Vitest; `test:integration`/`test:security`→local DB/HTTP scripts; `test:e2e`→Playwright; `check:artifacts`→manifest/schema/hash/config parity; `build:fixture`→validated test-mode Next build; `build`→normal Next build; `start`→next start. Test mode is compile-time/local and fails startup if enabled with a production Supabase URL.

Deployment (`.github/workflows/deploy.yml`) uses `workflow_dispatch`, protected environment `production`, `permissions: contents:read,id-token:write`, concurrency `monsoonroute-production` with `cancel-in-progress:false`. Steps: checkout selected tested commit → rerun relevant CI gates → Node/Python/CLI setup → `aws-actions/configure-aws-credentials` using `AWS_DEPLOY_ROLE_ARN`, regionMumbai and GitHub OIDC → database migration/configuration/graph consistency → build/package/model gates → SAM deploy disabled resources → upload artifacts → deploy Vercel → provider/auth/security smoke → enable mapping/schedules → final app smoke → publish release metrics. Pin all actions/CLI versions in implementation.

Vercel CLI flow: `vercel pull --yes --environment=production` (protected token/org/project), `vercel build --prod`, `vercel deploy --prebuilt --prod`. Runtime secrets are configured per environment through Vercel project settings/API/CLI from the protected secret store, never written into a public artifact. Auto-publishing a main push before DB/cloud readiness is disabled; one protected workflow controls the release. Staging deploys use isolated credentials.

Rollback: redeploy previous compatible Vercel release; disable new schedules/mapping if needed; leave DB migrations intact and fix forward. A breaking migration requires a staged expand/contract release; do not revert by dropping data. Graph releases must preserve old graph rows until reports/history expire or be explicitly archived/remapped by reviewed migration. Do not delete/retire the active graph before deploying its replacement.

## 19. Implementation roadmap and judging demonstration

### 19.1 Build order and ownership

The event dates are8–11 October2026; synchronize the actual opening/deadline with organizer instructions. Do not start project implementation early to satisfy this roadmap. Planning/tool familiarity before opening is permitted under the reviewed rules. Estimate60–80 focused person-hours for this scoped system, with a2–4-person team reducing elapsed time; these are planning estimates, not a promise of completion by a solo first-time cloud developer. Build one vertical slice first and integrate continuously.

| Event phase | Deliverable / order | Completion gate |
|---|---|---|
| Day1 opening, first4h | Repo/locks/CI, local Supabase migrations+RLS, auth contracts, seed, source manifests | Clean reset/security smoke; no dashboard-only state |
| Day1, next6–10h | OSM/terrain graph pipeline, frozen graph, base map, shortest legal route, weather adapter+atomic context | Correct direction/turns, graph hashes, live capture validated |
| Day2, first6–8h | Risk engine, bounded candidate routing, detour/explanations, scenarios, polished route cards | Invariants and controlled scenario route tradeoff pass |
| Day2, parallel/next6–8h | Authenticated report/private upload, photo sanitizer, HF export+parity, AWS disabled-resource deploy | Owned upload/RLS, exact ONNX result, CPU gates or visible manual fallback |
| Day3, first6–8h | SQS processing/recovery, moderation/closures, retention/audit, IAM OIDC integration | Report→review→closure→reroute; duplicate/withdrawal/quota tests |
| Day3, next4–6h | Mobile/EN-HI/accessibility, status/failure/history, performance measurement, deployment CI | Full E2E and secrets scan; actual cloud smoke |
| Final event day, reserve≥4–6h | Fresh full dry run, record≤3min video, write-up/README, source/AI tool credits, final deployed URL/repo submission | Video plays publicly/unlisted as required; app works; deadline verified |

If a two-person team: one owns frontend/routing, one Supabase/AWS/inference; both review security and integrate day1. Four-person split: UI, routing/data, DB/security, AWS/vision. This is a suggested human work allocation, not an agent delegation instruction. The coding agent may execute sequentially from this document.

Priorities under time pressure: keep correct graph/routing, evidence labels, auth/RLS, real weather/AWS ingestion, moderation and the complete journey. Apply the already specified manual-photo fallback if export fails. Cut optional saved-history polish/extra landmarks/extra scenario animations first; do not cut authorization, stale-state behavior, privacy, closure exclusion, or claim honesty. If a mandatory feature is omitted, update the release capability list and submission; do not silently call the full specification implemented.

### 19.2 Scenario generation — reliable demonstration without fake live data

`scripts/build_demo_scenarios.py` loads the actual pilot graph, uses seed20261008 and deterministic sorted landmark/node candidates, enumerates legal OD pairs with baseline distance1–6km, and seeks a pair with a distinct closure-free alternative within30% estimated detour. Evaluate candidates with the exact engine/config, not a separate easier routing implementation. For a selected pair choose one physical piece on baseline absent from alternative and assign a synthetic reviewed positive/closure fixture. Freeze origin/destination snapped node IDs, weather frames, virtual timestamps, fixtures and expected metrics in a hashed scenario file.

Create three public scenarios:

1. `dry-control`: synthetic zero rainfall, no positive report/closure; no fabricated lower-risk improvement.
2. `monsoon-tradeoff`: synthetic forcing with baseline evidence/closure and valid alternative. Record the minimum feasible detour; show one lower cap that is infeasible and a permitted cap≤30% that is feasible. If graph topology cannot supply such a pair, choose another pair; if none exists after exhaustive bounded pilot search, fail demo generation and show a truthful closure-infeasibility scenario instead. Do not draw a disconnected shortcut.
3. `historical-weather-2024-07-31`: real frozen archive weather from the stated date range, with **historical-weather** label. Unless independent road evidence exists, do not add an actual-historical-flood label. Any injected road reports remain visibly synthetic.

All scenario fixtures use private/non-user synthetic identifiers; no real report owner/photo is embedded in public assets. Live mode reads real DB runs/reports; scenario mode never promotes fixtures into live tables. Replay virtual clock and slider stay visibly labeled. The generated manifest includes exact result metrics; no hardcoded improvement percentage is displayed before measurement.

### 19.3 Recorded submission flow, maximum3minutes

| Video time | What judges see | Evidence / narration |
|---|---|---|
| 0:00–0:20 | Delhi pilot map and ordinary trip | “Waterlogging evidence needs a route decision. This pilot compares modeled exposure within your detour budget.” State relative index maturity. |
| 0:20–0:55 | Labeled monsoon-tradeoff scenario, baseline/closure, detour control, feasible alternative | Show baseline unavailable where closed; display actual computed detour and modeled exposure reduction, not safety assurance. |
| 0:55–1:15 | Evidence panel, source age, missing terrain, reason codes | Distinguish rainfall grid, recurrent hotspot and reviewed observation; hashes/ruleset visible. |
| 1:15–1:55 | Switch explicitly to live workflow; signed-in report→private upload→queued/completed advisory | Show actual Lambda job and ONNX model revision. If waiting is edited out, label elapsed job time; never imply instantaneous inference. Manual fallback must be identified if used. |
| 1:55–2:20 | Moderator checks image/map/time, approves or closes; fresh route reflects closure | Model assists; human decides. The exact report/closure ID traces to next decision snapshot. |
| 2:20–2:40 | AWS proof: weather capture Lambda log/S3 archive + SQS vision invocation, sanitized admin status | Real execution in Mumbai, no secrets/account identifiers shown. Architectural arrow alone is insufficient AWS proof. |
| 2:40–3:00 | Stale-data/credit-exit behavior, engineering measurements, repo/deployed URL | “No calibrated road flood probability claimed; correct detour/closure behavior measured. Serverless usage estimated5–10USD for this workload.” Show measured release metrics and limitations. |

If live weather is dry during filming, say so. Use labeled replay to show the risk tradeoff; live provider capture/report path still works. Team-owned test report can be submitted with an explicit test-note and removed after recording; never inject a false public closure in live data for the sake of filming. Demonstrate closure publication in isolated staging with `demo/test` label, and identify that environment. Production live operations must use genuine evidence or no test closure.

The event judges the video rather than a live call. Still deploy a functioning Vercel subdomain and leave it accessible with scope/freshness/capability banners. Public users must not be able to invoke paid cloud actions without the specified authentication/quotas.

### 19.4 Submission write-up contract

README/write-up includes: problem and pilot users; exact implemented feature list; architecture/service rationale; source and model IDs/revisions/licenses; AWS role/cost explanation; deployment URL; ≤3min video URL; measured engineering metrics; limitations/calibration status; reproducibility/deployment instructions; team contributions; AI coding-tool use and third-party credits. Link this source-of-truth document and implementation commit. Exclude credentials, private photos, user identities and unreleased data. Verify every judge-facing claim against measured release data or a linked source.

## 20. Feasibility register, limitations, and future scope

### 20.1 Implementation feasibility assessment

| Requirement / risk | Final resolution | Actual validation status before implementation |
|---|---|---|
| Vercel has no GPU/model-weight headroom suitable for this classifier | Route computation only; photos direct to Supabase; CPU model in async Lambda/S3 | Platform limits verified; app bundle/performance remain release tests |
| Selected model lacks direct HF inference | Full safe-weight→FP32ONNX→S3→Lambda path with pinned recipe/parity | Hub absence verified; export/invocation not executed in this research |
| No maintained GPU server | All three functions managed CPU, scale to zero; no endpoint idle bill | Lambda capability verified; account quotas must pass |
| Road-level rain/probability unsupported | Relative index with explicit gridded-source/coverage/freshness, no local accuracy claim | Honest engineering method specified; field calibration absent |
| Incomplete official/Kaggle labels | Only reviewed named hotspots; optional licensed photo evaluation; no invented road training | Data gaps documented; exact Kaggle archive inspection remains optional import gate |
| Too-long CPU request / upload payload |3MiB direct Storage upload, async job120s, Vercel routes30s, weather fallback60s | Limits/design checked; deployment measurements mandatory |
| Cross-cloud DB ownership / service-key bypass | Strict API predicates, role RPCs, RLS, no client writes, tested owner isolation | Schema/RPC/security contract supplied; local SQL/security execution required |
| Queue duplicate/crash/withdraw | Report→job locks, expiring lease, idempotent finalize, outbox repair, bounded attempts | State-machine specified; concurrency integration tests mandatory |
| Coherent route snapshot | One stable DB RPC for weather/evidence/closures, same ruleset for map/routes | SQL specified; live concurrency smoke required |
| AWS OIDC / secret handling | Project/environment-restricted temporary STS; separate Lambda secret IAM | Official integration verified; actual token claims/IAM smoke required |
| Credit exhaustion | Manual capture/sanitization/review, schedule/mapping disable, retained artifact teardown | Exact reduced mode specified; no free unlimited-runtime promise |
| No mandatory NIM endpoint | Deterministic templates sufficient; no deprecated-free endpoint dependence | Current catalog reviewed; no authenticated NIM request claimed |
| Reliable judging | Frozen labeled scenarios plus actual live/staging cloud journey | Demo generator/recording gates defined; no demo run claimed |
| Reproducible infrastructure | Versioned SQL/config/scripts/SAM/role policies/env registry | Structural specification check only; real deploy/migration tests are implementation work |

This is implementation-ready architecture with explicit algorithms, schema/security, interfaces, resource configurations and decision rules. Account-generated UUIDs/ARNs/URLs, model revision resolved by exact procedure, and measured timings cannot truthfully be manufactured in a research document. They are reproducible build outputs and release checks, not major architecture choices left open. Do not report this specification as a deployed or field-validated system.

### 20.2 Known limitations

- Small pilot and conservative graph exclusions; OSM restrictions and access may be incomplete. No turn-by-turn/live navigation, emergency-use approval, or vehicle-depth advice.
- Coarse surface elevation and gridded precipitation do not resolve curb height, drainage capacity, blocked drains or street water depth. The heuristic weights are not hydraulics or calibrated probabilities.
- Sparse reports and absence of dry-road negatives constrain evaluation. GitHub identity, EXIF stripping and classifier output do not prove physical location/time/authenticity.
- Human review adds delay; reviewed evidence can be mistaken. Reports/closures expire by policy and are not proof of reopening; future horizon remains uncertain.
- CPU classifier may misclassify unusual scenes and is not independently validated for Delhi; no photo causes an automatic closure or score change.
- Candidate routing is bounded and may miss a better feasible path. Static durations are not traffic predictions.
- Multi-cloud networking and the broad Supabase backend key create trusted-core risk despite narrow code/IAM boundaries. Hosted keys/quotas/terms may change.
- AWS credit assumptions depend on valid credit eligibility and no unrelated spending. Free noncommercial tiers have quotas and may pause/limit projects. Live provider downtime causes abstention/degradation.

### 20.3 FUTURE SCOPE — excluded from mandatory build

| Capability | Evidence / prerequisite before adding |
|---|---|
| Calibrated supervised road-risk model | Event/time/edge labels with verified negatives, leakage controls, storm/spatial holdout; compare deterministic baseline before promoting ML |
| Citywide Delhi / other Indian cities | Licensed data, scalable graph packaging/partitioning, local validation; not merely extending bbox without tests |
| Drainage/hydraulic simulation and depth | Drainage/curb/DEM resolution, rainfall/runoff boundary conditions, calibrated field data and specialist review |
| Radar/IMERG/IMD integration | Verified product access/license/units/latency and measured incremental benefit; no invented live street resolution |
| Full OSM via-way/time-dependent restrictions and live traffic | Correct richer routing state, legal/source access and new performance tests |
| Independently validated ground-photo segmentation/OOD rejection | Suitable HF model/dataset/task input, verified inference path, pixel labels and threshold validation |
| Fleet bulk routing/API/commercial pilot | Ten+ interviews, rights/terms/paid tiers, privacy contracts, measured route outcomes and support operations |
| NIM narrative translation/summaries | A currently authorized working NVIDIA model endpoint, privacy/schema/prompt-injection testing, bounded cost; deterministic explanation remains fallback |
| Least-privilege DB worker roles | Dedicated JWT/DB role integration compatible with PostgREST/Storage, granular grants and audited rotation; remove broad service role only after tests |
| Automatic credit-exit workflows / managed notifications | Authorized notification destinations and actual budget-event mechanism; budget alert is not an instant kill switch |
| Mobile turn-by-turn/emergency support | Independent safety/human-factors review, mapping/navigation licensing, field validation and legal operating requirements |

No future row may appear as “implemented” in the hackathon demo. Adding one changes this source-of-truth contract, schemas/tests/cost assumptions where relevant, and release capability metadata.

### 20.4 Coding-agent handoff / definition of done

Implement **IMPLEMENT FOR HACKATHON** exactly; use SQL blocks together as one versioned migration, source/graph/model procedures, request/result contracts, env registry and SAM resource names. Preserve scientific labels, model human-review boundary, ownership and closure invariants. Update this document only with explicit, recorded resolution of an incompatibility and the evidence for it; do not silently swap providers or invent a dataset.

Done means: clean repo bootstrap; migrations/config/seed reproducible; no dashboard-only table/policy; protected secrets and no client leakage; legal graph+risk routing; actual weather capture/provenance; authenticated private report+sanitization; working CPU classifier **or declared gated manual fallback**; review/closure/reroute; job retry/retention/audit; public deployment; relevant test/evaluation gates recorded; cost controls/exit tested; public repo/write-up and≤3min video with actual AWS execution. Mandatory features intentionally removed under a deadline must be explicitly marked as incomplete before handing off/submitting.

## 21. Research source registry

The two supplied Markdown reports are the input corpus; this R-series independently identifies current sources because their S-series mapping was inconsistent. Sources were reviewed on4October2026 unless a row explicitly states retrieval limitations. Official service documentation establishes supported capability, not a successfully executed account deployment. Vendor product pages establish advertised capability, not independent accuracy or superiority. Linked model pages establish a current listing, not authenticated serving success. Pricing is time/region/account dependent.

| Ref | Primary source | What it supports / limitation |
|---|---|---|
| R01 | [Environmental Hacks event](https://www.wemakedevs.org/aws/env) | Event dates, team size and AWS-focused event context; exact deadline checked at submission. |
| R02 | [Official hackathon rules](https://www.wemakedevs.org/aws/rules) | Start-clock rule, planning permission, public repo/write-up/video, video≤3min, no live judging, AI credits and recruitment conditions. |
| R03 | [Organizer announcement](https://www.wemakedevs.org/blogs/announcing-environmental-hacks) | Heat & Water track/organizer context; rules prevail over promotional wording. |
| R04 | [Delhi Traffic Police June2025 newsletter](https://traffic.delhipolice.gov.in/sites/default/files/uploads/2025/NEWSLETTER-JUNE-25.pdf) |445 hotspots/57 recurrent locations and named examples; no complete geocoded label file. |
| R05 | [Google Flood Hub flash-flood model](https://support.google.com/flood-hub/answer/16811681?hl=en) | Flash-flood documentation including20×20km outputs; not road-depth truth. |
| R06 | [Fathom Global Flood Map](https://www.fathom.global/product/global-flood-map/) | Existing licensed flood-map product; vendor capability description. |
| R07 | [Chennai Flood Monitor SDSS](https://chennaifloodmonitor.tn.gov.in/Master/AboutUs) | Indian institutional forecast/spatial decision support context. |
| R08 | [FloodMapp NowCast](https://www.floodmapp.com/nowcast) | Vendor flooded-road/RoadSafe example; flood-aware routing predates this project. |
| R09 | [Computational Urban Science road-flood research](https://link.springer.com/article/10.1007/s43762-023-00082-1) | Feature fusion/repeated fivefold evaluation; not event-separated validation attributed here. |
| R10 | [Previsico transport application](https://previsico.com/en-us/applications/transport-infrastructure), [API](https://previsico.com/intel-platform/api) | Existing transport flood intelligence/API; vendor evidence. |
| R11 | [Open-Meteo forecast API](https://open-meteo.com/en/docs) | Hourly precipitation units/preceding-hour convention and supported query fields. |
| R12 | [Open-Meteo usage terms](https://open-meteo.com/en/terms) | Noncommercial free endpoint limits, attribution and licensing/paid-use boundary. |
| R13 | [Open-Meteo historical weather API](https://open-meteo.com/en/docs/historical-weather-api) | Archive/reanalysis query path, not road flood labels. |
| R14 | [OSM Overpass API documentation](https://wiki.openstreetmap.org/wiki/Overpass_API) | Bounded build-time extraction; public server limits. |
| R15 | [OSM copyright/licensing](https://www.openstreetmap.org/copyright) | ODbL derivative/attribution boundary. |
| R16 | [AWS Copernicus DEM registry](https://registry.opendata.aws/copernicus-dem/) | Public S3 dataset/bucket/region/license links; offline terrain input. |
| R17 | [NHESS crowdsourced road-flood research](https://nhess.copernicus.org/articles/23/1/2023/) | Crowdsourced/precipitation/topographic evidence and observation limitations. |
| R17a | [NASA IMERG](https://gpm.nasa.gov/data/imerg), [V07 technical documentation](https://gpm.nasa.gov/resources/documents/imerg-v07-technical-documentation) | Early latency/grid context; exact future product adapter not assumed. |
| R18 | [Selected HF classifier](https://huggingface.co/prithivMLmods/Flood-Image-Detection) | Published input/labels/author metrics/model tag and no current Inference Provider deployment. |
| R19 | [Selected model files](https://huggingface.co/prithivMLmods/Flood-Image-Detection/tree/main) | Safe weights/config/processor presence and approximate model file size; actual revision must be pinned. |
| R20 | [SigLIP2 ONNX model](https://huggingface.co/onnx-community/siglip2-base-patch16-224-ONNX), [SigLIP2 paper](https://arxiv.org/abs/2502.14786) | General encoder comparison; no binary flood head or direct provider assumption. |
| R20a | [CLIP model card](https://huggingface.co/openai/clip-vit-base-patch32) | Generic zero-shot baseline, deployment/card limitations. |
| R21 | [Qwen3-VL8B](https://huggingface.co/Qwen/Qwen3-VL-8B-Instruct) | Current Featherless AI provider listing; not an authenticated smoke test or flood benchmark. |
| R22 | [HF Inference Providers documentation](https://huggingface.co/docs/inference-providers/en/index) | Hub model and supported provider route are distinct; billing/provider availability matters. |
| R23 | [Kaggle Roadway Flooding Image Dataset](https://www.kaggle.com/datasets/saurabhshahane/roadway-flooding-image-dataset) | Dataset listing exists; dynamic page did not expose a verifiable file/schema/license contract to this research. Optional gated evaluation only. |
| R23a | [Kaggle Rainfall in India](https://www.kaggle.com/datasets/rajanand/rainfall-in-india) | Historical aggregate dataset candidate; dynamic file details not verified. No Delhi event-road label claim. |
| R23b | [Kaggle Urban Flood Modelling data](https://www.kaggle.com/competitions/urban-flood-modelling/data) | Page warns upload incomplete/exploratory; rejected as turnkey label set. |
| R24 | [Vercel Function limits](https://vercel.com/docs/functions/limitations) | Payload/bundle/memory/duration limits; project plan/region still checked at deploy. |
| R25 | [NVIDIA model catalog](https://build.nvidia.com/meta/llama-3_1-8b-instruct), [NIM endpoint reference](https://docs.api.nvidia.com/nim/reference/meta-llama-3_1-8b-infer) | Legacy free endpoint marked deprecated, documented request path; no working account call claimed. |
| R26 | [Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html) | CPU memory/time/zip/temp-storage constraints and new-account quotas. |
| R26a | [SageMaker Serverless Inference](https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints.html) | Serverless inference limitations including no GPU; alternative rejected. |
| R27 | [Supabase SSR client guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client) | Supported user-context server/browser clients and verified authentication flow. |
| R28 | [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | RLS/privileged-service boundary; policies still require real security tests. |
| R29 | [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control) | Private bucket/object policy and service-key boundaries. |
| R30 | [Supabase changelog](https://supabase.com/changelog) | Current extension-version management change; don't assume old extension pins apply. |
| R31 | [Lambda with SQS configuration](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html) | Visibility timeout, batch response and queue integration requirements. |
| R32 | [Vercel AWS OIDC](https://vercel.com/docs/oidc/aws), [OIDC reference](https://vercel.com/docs/oidc/reference) | Team issuer/audience/exact production subject and temporary credential helper. |
| R33 | [Lambda pricing](https://aws.amazon.com/lambda/pricing/) | GB-second/request method; region/account calculation required. |
| R34 | [S3 pricing](https://aws.amazon.com/s3/pricing/) | Storage/operations/transfer estimate boundary. |
| R35 | [SQS pricing](https://aws.amazon.com/sqs/pricing/) | Small-volume queue cost estimate boundary. |
| R36 | [Secrets Manager pricing](https://aws.amazon.com/secrets-manager/pricing/) | Secret/API call recurring cost. |
| R37 | [EventBridge Scheduler documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/using-eventbridge-scheduler.html) | Managed schedules/IAM targets/retry controls. |
| R38 | [Next.js16 release](https://nextjs.org/blog/next-16) | Stable major baseline; explicit ESLint rather than removed `next lint`. |
| R39 | [Supabase Auth Management API](https://supabase.com/docs/reference/api/v1-update-auth-service-config) | Exact hosted Auth field names; secrets not printed. |
| R40 | [Supabase PostgREST Management API](https://supabase.com/docs/reference/api/v1-update-postgrest-service-config) | Correct `/postgrest` patch route/schema/row-limit fields. |
| R41 | [Supabase pricing](https://supabase.com/pricing), [Vercel Hobby terms](https://vercel.com/docs/plans/hobby) | Free-tier/eligibility boundaries, not an unlimited-production promise. |
| R42 | [Vercel Functions helper reference](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package) | Documented `ipAddress(request)` helper; controlled ingress assumption. |
| R43 | [AWS Lambda function-scoped IAM guidance](https://docs.aws.amazon.com/lambda/latest/dg/permissions-user-function.html) | Exact event-source-mapping FunctionArn condition and read-only discovery boundary. |

Specification validation on4October2026:21 numbered sections,33 balanced fenced blocks, all11 JSON blocks/2 YAML blocks/1 TOML block parsed,48 registered research sources with no unresolved R reference,18 public application tables and18 service-only public RPCs checked for explicit grants/revokes, and SAM's two schedules/SQS mapping checked disabled at bootstrap. These are structural checks, not SQL execution, security-test success or deployed runtime evidence.

Research limitations that must remain visible: no authenticated HF/NIM/provider smoke, no dataset download/license acceptance, no ONNX export or deployed model timing, no executed Supabase migration or AWS deployment, no interviewed-user findings or road-outcome validation. The specification supplies those execution/evaluation gates so the implementation can establish them without inventing evidence.
