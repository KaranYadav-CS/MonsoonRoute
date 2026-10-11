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
export function risk(edge, weather, reports, now, graphCapturedAt, capturedAt = now) {
    const age = weather ? (capturedAt.getTime() - Date.parse(weather.retrieved_at)) / 60000 : Infinity;
    const valid = weather && Number.isFinite(age) && age >= 0 && age <= 60 && [weather.r1_past, weather.r3_past, weather.r1_future, weather.r3_future].every(x => finite(x) && x >= 0 && x <= 300);
    if (!valid)
        return { risk_index: null, evidence_coverage: null, status: 'unknown', reasons: ['WEATHER_STALE'] };
    const H = clip(edge.hotspot_factor), D = clip(edge.depression_factor ?? 0.5), U = edge.underpass ? 1 : 0;
    const S = 0.6 * H + 0.25 * D + 0.15 * U;
    const F = Math.max(clip(weather.r1_past / 10), clip(weather.r3_past / 25), clip(weather.r1_future / 10), clip(weather.r3_future / 25));
    let E = 0, L = 0;
    const reasons = [];
    let positive = false, clear = false;
    for (const r of reports) {
        if (r.edge_id !== edge.id || !r.approved || (r.expires_at && Date.parse(r.expires_at) <= now.getTime()))
            continue;
        const rawMinutes = (now.getTime() - Date.parse(r.observed_at)) / 60000;
        if (!finite(rawMinutes) || rawMinutes < -5 || rawMinutes > 180)
            continue;
        const minutes = Math.max(0, rawMinutes);
        const weight = { standing_water: 0.35, heavy_water: 0.70, blocked: 1, clear: 0 }[r.category];
        positive ||= weight > 0;
        clear ||= r.category === 'clear';
        E = Math.max(E, weight * Math.exp(-minutes / 60));
        L = Math.max(L, minutes <= 60 ? 1 : 0.5);
    }
    const W = age <= 30 ? 1 : 0.5, T = edge.terrain_valid ? 1 : 0, G = (capturedAt.getTime() - Date.parse(graphCapturedAt)) / 86400000 <= 30 ? 1 : 0.5;
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
    if (!L)
        reasons.push('NO_LOCAL_OBSERVATION');
    if (positive && clear)
        reasons.push('CONFLICTING_REPORTS');
    if (G < 1)
        reasons.push('GRAPH_OLD');
    return { risk_index: clip(.05 + .65 * S * F + .15 * F + .60 * E), evidence_coverage: clip(.4 * W + .2 * T + .2 * G + .2 * L), status: 'known', reasons };
}
export function nearest(g, p) { if (!inPilot(p))
    throw Error('POINT_OUT_OF_PILOT'); const xs = g.nodes.map(n => ({ ...n, distance: haversine(p, n) })).sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id)); if (!xs.length || xs[0].distance > 120)
    throw Error('POINT_NOT_ON_NETWORK'); return { node_id: xs[0].id, distance_m: xs[0].distance }; }
class MinHeap {
    items = [];
    less(a, b) { return a.cost < b.cost - 1e-9 || (Math.abs(a.cost - b.cost) <= 1e-9 && a.path.join('|') < b.path.join('|')); }
    push(s) { const a = this.items; a.push(s); let i = a.length - 1; while (i > 0) {
        const p = (i - 1) >> 1;
        if (!this.less(a[i], a[p]))
            break;
        [a[i], a[p]] = [a[p], a[i]];
        i = p;
    } }
    pop() { const a = this.items, first = a[0], last = a.pop(); if (a.length && last) {
        a[0] = last;
        let i = 0;
        while (true) {
            let k = i;
            const l = i * 2 + 1, r = l + 1;
            if (l < a.length && this.less(a[l], a[k]))
                k = l;
            if (r < a.length && this.less(a[r], a[k]))
                k = r;
            if (k === i)
                break;
            [a[k], a[i]] = [a[i], a[k]];
            i = k;
        }
    } return first; }
}
function network(g) {
    const edges = new Map(g.edges.map(e => [e.id, e]));
    const adj = new Map();
    for (const e of g.edges) {
        const list = adj.get(e.from) || [];
        list.push(e);
        adj.set(e.from, list);
    }
    for (const list of adj.values())
        list.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    return { edges, adj, banned: new Set(g.turn_restrictions.map(t => t.from_edge + '|' + t.to_edge)), degree: new Map([...adj].map(([n, e]) => [n, e.length])) };
}
function delay(net, node, previous) { return previous && (net.degree.get(node) || 0) >= 3 ? 5 : 0; }
function search(net, start, goal, closed, risks, lambda, budget, exclude = new Set(), blockedNodes = new Set(), previous = '') {
    const heap = new MinHeap();
    heap.push({ node: start, prev: previous, path: [], cost: 0, visited: new Set([start]) });
    const best = new Map();
    let checked = 0;
    while (heap.items.length) {
        if (budget.remaining-- <= 0 || ((checked++ & 63) === 0 && Date.now() >= budget.deadline)) {
            budget.complete = false;
            return null;
        }
        const state = heap.pop();
        const key = state.node + '|' + state.prev;
        if ((best.get(key) ?? Infinity) < state.cost - 1e-9)
            continue;
        if (state.node === goal)
            return state.path;
        const incoming = net.edges.get(state.prev), outgoing = net.adj.get(state.node) || [];
        for (const e of outgoing) {
            if (closed.has(e.id) || exclude.has(e.id) || blockedNodes.has(e.to) || state.visited.has(e.to) || net.banned.has(state.prev + '|' + e.id))
                continue;
            if (incoming?.physical_key && e.physical_key === incoming.physical_key && outgoing.some(x => x.physical_key !== incoming.physical_key && !net.banned.has(state.prev + '|' + x.id)))
                continue;
            const r = risks.get(e.id);
            const penalty = r?.risk_index == null ? 0 : lambda * e.length_m / 10 * (r.risk_index + .25 * (1 - (r.evidence_coverage ?? 0)));
            const cost = state.cost + e.time_s + delay(net, state.node, state.prev) + penalty;
            const nextKey = e.to + '|' + e.id;
            if (cost < (best.get(nextKey) ?? Infinity) - 1e-9) {
                best.set(nextKey, cost);
                heap.push({ node: e.to, prev: e.id, path: [...state.path, e.id], cost, visited: new Set([...state.visited, e.to]) });
            }
        }
    }
    return null;
}
function pathTime(net, path) { return path.reduce((total, id, i) => { const e = net.edges.get(id); return total + e.time_s + delay(net, e.from, i ? path[i - 1] : ''); }, 0); }
function option(net, path, risks, closed, cap) {
    let distance = 0, X = 0, U = 0, H = 0, C = 0, known = true;
    const geometry = [];
    const visited = new Set();
    for (let i = 0; i < path.length; i++) {
        const e = net.edges.get(path[i]);
        if (!e)
            throw Error('EDGE_MISSING');
        if (i === 0)
            visited.add(e.from);
        if (visited.has(e.to) || (i && net.edges.get(path[i - 1]).to !== e.from) || net.banned.has((i ? path[i - 1] : '') + '|' + e.id))
            throw Error('ILLEGAL_PATH');
        visited.add(e.to);
        distance += e.length_m;
        const r = risks.get(e.id);
        if (r?.risk_index == null || r.evidence_coverage == null)
            known = false;
        else {
            X += e.length_m * r.risk_index;
            U += e.length_m * (1 - r.evidence_coverage);
            C += e.length_m * r.evidence_coverage;
            if (r.risk_index >= .5)
                H += e.length_m;
        }
        geometry.push(...(geometry.length ? e.geom.slice(1) : e.geom));
    }
    const time = pathTime(net, path);
    return { edge_ids: path, distance_m: distance, estimated_time_s: time, modeled_exposure_m: known ? X : null, uncertainty_exposure_m: known ? U : null, high_index_length_m: known ? H : null, evidence_coverage: known && distance > 0 ? C / distance : null, geometry: { type: 'LineString', coordinates: geometry }, active_closure_count: path.filter(id => closed.has(id)).length, legal: true, within_detour_cap: time <= cap + 1e-6 };
}
export function compareRoutes(g, origin, destination, detourFraction, weather, reports, closed, now = new Date(), captured_at = new Date().toISOString(), context = {}) {
    const started = Date.now();
    validateGraph(g);
    if (!(detourFraction >= 0 && detourFraction <= .30))
        throw Error('DETOUR_INVALID');
    const src = nearest(g, origin), dst = nearest(g, destination);
    if (src.node_id === dst.node_id)
        throw Error('TRIP_TOO_SHORT');
    const net = network(g), physical = new Map();
    for (const e of g.edges)
        if (e.physical_key) {
            const list = physical.get(e.physical_key) || [];
            list.push(e.id);
            physical.set(e.physical_key, list);
        }
    const expandedReports = reports.flatMap(report => { const key = net.edges.get(report.edge_id)?.physical_key; return (key ? physical.get(key) || [report.edge_id] : [report.edge_id]).map(edge_id => ({ ...report, edge_id })); });
    const captured = context.capturedAt || now;
    const reportMap = new Map();
    for (const report of expandedReports) {
        const rows = reportMap.get(report.edge_id) || [];
        rows.push(report);
        reportMap.set(report.edge_id, rows);
    }
    const risks = new Map(g.edges.map(e => [e.id, risk(e, context.weatherByEdge?.get(e.id) ?? weather, reportMap.get(e.id) || [], now, captured_at, captured)]));
    const budget = { deadline: Date.now() + (context.maxSearchMs ?? 2000), remaining: 150000, complete: true };
    const base = search(net, src.node_id, dst.node_id, new Set(), risks, 0, budget);
    if (!base)
        throw Error(budget.complete ? 'NO_NETWORK_ROUTE' : 'ROUTE_SEARCH_TIMEOUT');
    const baselineTime = pathTime(net, base), cap = baselineTime * (1 + detourFraction), baseline = option(net, base, risks, closed, cap);
    const conditionsKnown = [...risks.values()].every(r => r.risk_index !== null);
    const paths = new Map();
    const add = (p) => { if (p)
        paths.set(p.join('|'), p); };
    if (!baseline.active_closure_count)
        add(base);
    const quickest = search(net, src.node_id, dst.node_id, closed, risks, 0, budget);
    add(quickest);
    if (conditionsKnown) {
        for (const lambda of [.5, 1, 2, 4, 8, 16, 32]) {
            if (!budget.complete)
                break;
            add(search(net, src.node_id, dst.node_id, closed, risks, lambda, budget));
        }
    }
    // Yen loopless shortest-duration paths on the same turn-expanded graph.
    if (conditionsKnown && quickest) {
        const accepted = [quickest], pool = new Map();
        for (let k = 1; k < 12 && budget.complete; k++) {
            const last = accepted[k - 1];
            for (let i = 0; i < last.length && budget.complete; i++) {
                const root = last.slice(0, i), spurNode = i ? net.edges.get(last[i - 1]).to : src.node_id;
                const exclusions = new Set();
                for (const path of accepted)
                    if (root.every((id, j) => path[j] === id) && path[i])
                        exclusions.add(path[i]);
                const rootNodes = new Set(root.map(id => net.edges.get(id).from));
                const spur = search(net, spurNode, dst.node_id, closed, risks, 0, budget, exclusions, rootNodes, i ? last[i - 1] : '');
                if (spur) {
                    const candidate = [...root, ...spur], key = candidate.join('|');
                    if (!accepted.some(p => p.join('|') === key))
                        pool.set(key, candidate);
                }
            }
            if (!pool.size)
                break;
            const next = [...pool.values()].sort((a, b) => pathTime(net, a) - pathTime(net, b) || a.join('|').localeCompare(b.join('|')))[0];
            pool.delete(next.join('|'));
            accepted.push(next);
            add(next);
        }
    }
    const candidates = [...paths.values()].map(path => option(net, path, risks, closed, cap));
    const feasible = candidates.filter(c => c.within_detour_cap && !c.active_closure_count);
    const objective = (c) => (c.modeled_exposure_m ?? 0) + .25 * (c.uncertainty_exposure_m ?? 0);
    const order = (a, b) => objective(a) - objective(b) || a.estimated_time_s - b.estimated_time_s || a.edge_ids.join('|').localeCompare(b.edge_ids.join('|'));
    feasible.sort(order);
    let status = 'no_lower_risk_option', recommendation = null, over_budget = null;
    if (!feasible.length) {
        status = 'no_feasible_route';
        over_budget = candidates.filter(c => !c.within_detour_cap && !c.active_closure_count).sort((a, b) => a.estimated_time_s - b.estimated_time_s)[0] ?? null;
    }
    else if (!conditionsKnown)
        status = 'conditions_unknown';
    else if (objective(feasible[0]) < objective(baseline) - 1e-6 && feasible[0].modeled_exposure_m < baseline.modeled_exposure_m - 1e-6) {
        status = 'ok';
        recommendation = feasible[0];
    }
    const dominates = (a, b) => a.estimated_time_s <= b.estimated_time_s && ((a.modeled_exposure_m ?? 0) <= (b.modeled_exposure_m ?? 0)) && ((a.uncertainty_exposure_m ?? 0) <= (b.uncertainty_exposure_m ?? 0)) && (a.estimated_time_s < b.estimated_time_s || (a.modeled_exposure_m ?? 0) < (b.modeled_exposure_m ?? 0) || (a.uncertainty_exposure_m ?? 0) < (b.uncertainty_exposure_m ?? 0));
    const alternatives = feasible.filter(c => c !== recommendation && !feasible.some(a => a !== c && dominates(a, c))).slice(0, 2);
    const reduction = status === 'ok' && baseline.modeled_exposure_m > 0 && recommendation ? 100 * (baseline.modeled_exposure_m - recommendation.modeled_exposure_m) / baseline.modeled_exposure_m : null;
    return { status, baseline, recommendation, alternatives, over_budget, comparison: { estimated_time_cap_s: cap, achieved_detour_fraction: recommendation ? recommendation.estimated_time_s / baselineTime - 1 : null, modeled_exposure_reduction_pct: reduction, baseline_unavailable: baseline.active_closure_count > 0, note_code: status.toUpperCase() }, search: { candidate_count: candidates.length, search_complete: budget.complete, elapsed_ms: Date.now() - started }, snaps: { origin: src, destination: dst }, warnings: conditionsKnown ? [] : ['WEATHER_STALE', 'CONDITIONS_UNKNOWN'] };
}
