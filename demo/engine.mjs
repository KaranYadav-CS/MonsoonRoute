import { PILOT_BBOX } from './constants.mjs';
const finite = (v) => Number.isFinite(v);
const clip = (v) => Math.max(0, Math.min(1, v));
export function haversine(a, b) { const r = 6371008.8, k = Math.PI / 180, p1 = a.lat * k, p2 = b.lat * k, dp = (b.lat - a.lat) * k, dl = (b.lon - a.lon) * k, s = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2; return 2 * r * Math.asin(Math.min(1, Math.sqrt(s))); }
export function inPilot(p) { return finite(p.lat) && finite(p.lon) && p.lon >= PILOT_BBOX[0] && p.lon <= PILOT_BBOX[2] && p.lat >= PILOT_BBOX[1] && p.lat <= PILOT_BBOX[3]; }
export function validateGraph(g) { if (!/^[a-f0-9]{64}$/.test(g.sha256))
    throw Error('GRAPH_HASH_INVALID'); const ids = new Set(); const nodes = new Set(); for (const n of g.nodes) {
    if (nodes.has(n.id) || !finite(n.lat) || !finite(n.lon))
        throw Error('NODE_INVALID');
    nodes.add(n.id);
} for (const e of g.edges) {
    if (ids.has(e.id) || !nodes.has(e.from) || !nodes.has(e.to) || e.from === e.to || !(e.time_s > 0) || !(e.length_m > 0) || e.geom.length < 2 || e.length_m > 105 || !finite(e.time_s) || !finite(e.length_m))
        throw Error('EDGE_INVALID');
    ids.add(e.id);
} for (const t of g.turn_restrictions) {
    if (!ids.has(t.from_edge) || !ids.has(t.to_edge))
        throw Error('TURN_INVALID');
    const a = g.edges.find(x => x.id === t.from_edge), b = g.edges.find(x => x.id === t.to_edge);
    if (a.to !== t.via_node || b.from !== t.via_node)
        throw Error('TURN_TOPOLOGY_INVALID');
} return true; }
export function risk(edge, weather, reports, now, graphCapturedAt) {
    const age = weather ? (now.getTime() - Date.parse(weather.retrieved_at)) / 60000 : Infinity;
    const valid = weather && Number.isFinite(age) && age >= 0 && age <= 60 && [weather.r1_past, weather.r3_past, weather.r1_future, weather.r3_future].every(x => finite(x) && x >= 0 && x <= 300);
    if (!valid)
        return { risk_index: null, evidence_coverage: null, status: 'unknown', reasons: ['WEATHER_STALE'] };
    const H = clip(edge.hotspot_factor), D = clip(edge.depression_factor ?? 0.5), U = edge.underpass ? 1 : 0;
    const S = 0.6 * H + 0.25 * D + 0.15 * U;
    const F = Math.max(clip(weather.r1_past / 10), clip(weather.r3_past / 25), clip(weather.r1_future / 10), clip(weather.r3_future / 25));
    let E = 0, L = 0;
    const reasons = [];
    for (const r of reports) {
        if (r.edge_id !== edge.id || !r.approved)
            continue;
        const minutes = (now.getTime() - Date.parse(r.observed_at)) / 60000;
        if (!finite(minutes) || minutes < 0 || minutes > 180)
            continue;
        const weight = { standing_water: 0.35, heavy_water: 0.70, blocked: 1, clear: 0 }[r.category];
        E = Math.max(E, weight * Math.exp(-minutes / 60));
        L = Math.max(L, minutes <= 60 ? 1 : 0.5);
    }
    const W = age <= 30 ? 1 : 0.5, T = edge.terrain_valid ? 1 : 0, G = (now.getTime() - Date.parse(graphCapturedAt)) / 86400000 <= 30 ? 1 : 0.5;
    if (H > 0)
        reasons.push('RECURRENT_HOTSPOT');
    if (F > 0)
        reasons.push('MODEL_RAIN_RECENT');
    if (edge.underpass)
        reasons.push('UNDERPASS');
    if (E > 0)
        reasons.push('REVIEWED_POSITIVE_REPORT');
    if (!edge.terrain_valid)
        reasons.push('TERRAIN_MISSING');
    if (!weather.source_issued_at)
        reasons.push('SOURCE_ISSUANCE_UNKNOWN');
    return { risk_index: clip(.05 + .65 * S * F + .15 * F + .60 * E), evidence_coverage: clip(.4 * W + .2 * T + .2 * G + .2 * L), status: 'known', reasons };
}
export function nearest(g, p) { if (!inPilot(p))
    throw Error('POINT_OUT_OF_PILOT'); const xs = g.nodes.map(n => ({ ...n, distance: haversine(p, n) })).sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id)); if (!xs.length || xs[0].distance > 120)
    throw Error('POINT_NOT_ON_NETWORK'); return { node_id: xs[0].id, distance_m: xs[0].distance }; }
function search(g, start, goal, closed, risks, lambda, exclude, maxExpansions = 150000) {
    const adj = new Map();
    for (const e of g.edges) {
        if (closed.has(e.id) || exclude?.has(e.id))
            continue;
        const xs = adj.get(e.from) || [];
        xs.push(e);
        adj.set(e.from, xs);
    }
    for (const xs of adj.values())
        xs.sort((a, b) => a.id.localeCompare(b.id));
    const banned = new Set(g.turn_restrictions.map(t => `${t.from_edge}|${t.to_edge}`));
    const q = [{ node: start, prev: '', path: [], cost: 0, visited: new Set([start]) }];
    const best = new Map();
    let expansions = 0;
    while (q.length) {
        q.sort((a, b) => a.cost - b.cost || a.path.join('|').localeCompare(b.path.join('|')));
        const s = q.shift();
        const k = s.node + '|' + s.prev;
        if ((best.get(k) ?? Infinity) < s.cost - 1e-9)
            continue;
        if (s.node === goal)
            return { path: s.path, complete: true, expansions };
        if (++expansions > maxExpansions)
            return { path: null, complete: false, expansions };
        for (const e of adj.get(s.node) || []) {
            if (s.visited.has(e.to) || banned.has(s.prev + '|' + e.id))
                continue;
            const rr = risks.get(e.id);
            const penalty = rr?.risk_index === null || rr?.risk_index === undefined ? 0 : lambda * (e.length_m / 10) * (rr.risk_index + 0.25 * (1 - (rr.evidence_coverage ?? 0)));
            const cost = s.cost + e.time_s + penalty;
            const key = e.to + '|' + e.id;
            if (cost < (best.get(key) ?? Infinity) - 1e-9) {
                best.set(key, cost);
                q.push({ node: e.to, prev: e.id, path: [...s.path, e.id], cost, visited: new Set([...s.visited, e.to]) });
            }
        }
    }
    return { path: null, complete: true, expansions };
}
function option(g, path, risks, closed, cap) { const m = new Map(g.edges.map(e => [e.id, e])); let distance = 0, time = 0, X = 0, U = 0, H = 0, C = 0, known = true; const geom = []; for (const id of path) {
    const e = m.get(id);
    if (!e)
        throw Error('EDGE_MISSING');
    distance += e.length_m;
    time += e.time_s;
    const r = risks.get(id);
    if (!r || r.risk_index === null || r.evidence_coverage === null)
        known = false;
    else {
        X += e.length_m * r.risk_index;
        U += e.length_m * (1 - r.evidence_coverage);
        C += e.length_m * r.evidence_coverage;
        if (r.risk_index >= .5)
            H += e.length_m;
    }
    geom.push(...(geom.length ? e.geom.slice(1) : e.geom));
} return { edge_ids: path, distance_m: distance, estimated_time_s: time, modeled_exposure_m: known ? X : null, uncertainty_exposure_m: known ? U : null, high_index_length_m: known ? H : null, evidence_coverage: known && distance > 0 ? C / distance : null, geometry: { type: 'LineString', coordinates: geom }, active_closure_count: path.filter(x => closed.has(x)).length, legal: true, within_detour_cap: time <= cap + 1e-6 }; }
export function compareRoutes(g, origin, destination, detourFraction, weather, reports, closed, now = new Date(), captured_at = new Date().toISOString()) {
    const started = Date.now();
    validateGraph(g);
    if (!(detourFraction >= 0 && detourFraction <= .30))
        throw Error('DETOUR_INVALID');
    const src = nearest(g, origin), dst = nearest(g, destination);
    if (src.node_id === dst.node_id)
        throw Error('TRIP_TOO_SHORT');
    const risks = new Map(g.edges.map(e => [e.id, risk(e, weather, reports, now, captured_at)]));
    const empty = new Set();
    const base = search(g, src.node_id, dst.node_id, empty, risks, 0);
    if (!base.path)
        throw Error('NO_NETWORK_ROUTE');
    const baselineTime = base.path.reduce((a, id) => a + g.edges.find(x => x.id === id).time_s, 0);
    const cap = baselineTime * (1 + detourFraction);
    const baseline = option(g, base.path, risks, closed, cap);
    const conditionsKnown = g.edges.every(e => risks.get(e.id)?.risk_index !== null);
    const candidates = [];
    const unique = new Set();
    let complete = base.complete;
    for (const lam of (conditionsKnown ? [0, .5, 1, 2, 4, 8, 16, 32] : [0])) {
        const s = search(g, src.node_id, dst.node_id, closed, risks, lam);
        complete &&= s.complete;
        if (s.path && !unique.has(s.path.join(','))) {
            unique.add(s.path.join(','));
            candidates.push(option(g, s.path, risks, closed, cap));
        }
    }
    const feasible = candidates.filter(c => c.within_detour_cap);
    const order = (a, b) => ((a.modeled_exposure_m ?? 0) + .25 * (a.uncertainty_exposure_m ?? 0)) - ((b.modeled_exposure_m ?? 0) + .25 * (b.uncertainty_exposure_m ?? 0)) || a.estimated_time_s - b.estimated_time_s || a.edge_ids.join(',').localeCompare(b.edge_ids.join(','));
    feasible.sort(order);
    let status = 'no_lower_risk_option';
    let recommendation = null;
    let over_budget = null;
    if (!feasible.length) {
        status = 'no_feasible_route';
        over_budget = candidates.filter(x => !x.within_detour_cap).sort((a, b) => a.estimated_time_s - b.estimated_time_s)[0] ?? null;
    }
    else if (!conditionsKnown)
        status = 'conditions_unknown';
    else {
        const best = feasible[0];
        if (((best.modeled_exposure_m ?? Infinity) < (baseline.modeled_exposure_m ?? Infinity) - 1e-6) && (((best.modeled_exposure_m ?? 0) + .25 * (best.uncertainty_exposure_m ?? 0)) < ((baseline.modeled_exposure_m ?? 0) + .25 * (baseline.uncertainty_exposure_m ?? 0)) - 1e-6)) {
            status = 'ok';
            recommendation = best;
        }
    }
    const reduction = status === 'ok' && baseline.modeled_exposure_m && recommendation?.modeled_exposure_m !== null ? 100 * (baseline.modeled_exposure_m - recommendation.modeled_exposure_m) / baseline.modeled_exposure_m : null;
    return { status, baseline, recommendation, alternatives: feasible.filter(c => c !== recommendation).slice(0, 2), over_budget, comparison: { estimated_time_cap_s: cap, achieved_detour_fraction: recommendation ? recommendation.estimated_time_s / baselineTime - 1 : null, modeled_exposure_reduction_pct: reduction, baseline_unavailable: baseline.active_closure_count > 0, note_code: status.toUpperCase() }, search: { candidate_count: candidates.length, search_complete: complete, elapsed_ms: Date.now() - started }, snaps: { origin: src, destination: dst }, warnings: conditionsKnown ? [] : ['WEATHER_STALE', 'CONDITIONS_UNKNOWN'] };
}
