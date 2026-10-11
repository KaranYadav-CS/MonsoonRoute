# Authority and provenance

1. `MonsoonRoute_Implementation_Specification.md` supplied by the user is canonical; its revision R1–R9 supersedes historical wording.
2. `Plan-2.md` defines P0–P5 order; user explicitly overrides the P4 GitHub mutations with **offline ZIP only**.
3. P1 AWS, P2 Vercel and P3 Supabase packages are source of verified prior cloud facts; they are not imported as a running API.
4. GitHub source baseline inspected read-only `KaranYadav-CS/MonsoonRoute` at commit `35d0e21c2004254f40522c9e24dacf8a36792534` (2026-10-10). Contributors `segrasevanon` must retain credit. This ZIP is not a derived `git clone`, because the connector cannot export binary assets to the local workspace. Original Frontend tree assets are not included; see inventory and constraints.
5. Any generated design or synthetic test content in this package is new P4 work and does **not** certify production weather, risk or safe routes.
