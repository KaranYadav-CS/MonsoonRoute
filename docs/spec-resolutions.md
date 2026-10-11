# Verified implementation resolutions — 11 October 2026

The supplied v1.1 specification hash was verified as `08c5fa6e520286b25db6bafdbbfd2648d826a1c01dc9ca780a244ca564d5ad98`. The current user's final-execution instruction replaces the old per-phase pause sequence.

## Current road-network size

The real 11 October Overpass snapshot, conservatively filtered and normalized at genuine junctions and ≤100 m geometry intervals, has 20,434 directed edges and 10,200 nodes in the predefined reduced pilot and its 0.010° buffer. The directed-edge ceiling is increased from 20,000 to 21,000 to preserve complete connectivity; the node ceiling remains 15,000. The search remains bounded at two seconds and 150,000 expansions. Production publication requires measured route and bundle checks. No invented connecting edges or arbitrary deletion of connecting roads is used.

## Actual upstream model input

The pinned classifier revision defines 224×224 RGB, bilinear resizing and mean/std `[0.5,0.5,0.5]`, rather than the specification's assumed 512×512 input. The deployed pinned ONNX artifact and processor retain the actual source shape. Advisory output remains uncalibrated, with human review required. Engineering parity and runtime receipts do not establish Delhi field accuracy.

## Existing accounts

The owner explicitly selected Supabase email/password authentication in this final execution. Email login, signup and recovery are retained. GitHub connects the source repository and is not an app login provider. No account is promoted without the owner's explicit identification. The database remains in Seoul; AWS workers and Vercel functions remain in Mumbai.
