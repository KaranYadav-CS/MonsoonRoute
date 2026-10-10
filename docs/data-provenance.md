# Data provenance / availability

- Source registry and licenses are present in `supabase/seed.sql`, but no reviewed OSM road graph was present in the private GitHub scaffold or provided files. Real graph import is **NOT IMPLEMENTED** and all dependent API routes fail closed.
- `scripts/capture_osm.py` computes a source SHA when explicitly supplied externally and a license flag is affirmed. It does **not** fabricate OSM geometries or solve turn-restriction extraction.
- `scripts/build_graph.py` validates an already extracted graph for topology and edge geometry bounds; not a full OSM PBF extraction.
- Copernicus DEM input, terrain sampling and Delhi Traffic Police reviewed geocodes are missing. No historical scenarios are published.
- Open-Meteo is a weather **model**, not a road rain gauge or floodwater sensor; code validates nine-cell request shape but its ingestion pipeline is inactive.
- No model license file, immutable model revision or verified ONNX artifact was retrieved. Pretrained classifier availability is metadata only.
