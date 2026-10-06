#!/usr/bin/env python3
"""BG-register history: classify moves, derive the field-delta rule, check it against ROM, count consumers.
usage: bgHistoryAnalyze.py PROBE_DIR OUT_DIR     (PROBE_DIR = bgHistoryRun.sh output)   -> OUT_DIR/{states,move-effects,tracker-check,units,consumers}.json + stdout summary
Consumer signature = every IO/scroll register the three reducers (or neighbours) can read, i.e. all of bgHistoryProbe's fields except the BG0 scroll registers/vars (battle-text BG, toggles 0/160 with menus) and the
OAM alloc bitmap (sprite-order tracker's job): dispcnt, bg0-3cnt, bg1-3 h/vofs, win0/1 h/v, winin/out, mosaic, bld*, BG1-3 X/Y vars, software matrices sha."""
import json, sys, glob, collections
from pathlib import Path
D, OUT = Path(sys.argv[1]), Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
DROP = {"bg0hofs", "bg0vofs", "var:BG0_X", "var:BG0_Y", "bitmap"}
def cs(s): return {k: v for k, v in s.items() if k not in DROP}
runs = {}
for f in sorted(glob.glob(str(D / "*.json"))):
    try: runs[Path(f).stem] = json.load(open(f))
    except Exception: pass
states, ids = [], {}
def sid(s):
    k = json.dumps(s, sort_keys=True)
    if k not in ids: ids[k] = len(states); states.append(s)
    return ids[k]
def sub(b, k):
    return sid(cs(b[k])) if b.get(k) else None
def skey(b):  # move 0 = status / stat-change / end-turn bodies: the script pointer + stat arg identify the unit
    return "" if b["move"] != 0 else "%x:%d,%d" % (b["scriptPtr"], b["args0"][0], b["args0"][1])
GATE = 30
bodies = []  # flat rows
for n, r in runs.items():
    bs = r["bodies"]
    for i, b in enumerate(bs):
        p = bs[i - 1] if i else None
        bodies.append({"scn": n, "i": i, "move": b["move"], "side": "player" if b["attacker"] == 0 else "opponent", "sk": skey(b), "act": sid(cs(b["act"])), "e1": sub(b, "e1"), "e30": sub(b, "e30"),
                       "prevE1": sub(p, "e1") if p else None, "prevE30": sub(p, "e30") if p else None, "prevMove": p["move"] if p else None, "prevSide": ("player" if p["attacker"] == 0 else "opponent") if p else None,
                       "gap": b["start"] - p["end"] if p and p["end"] is not None else None, "start": b["start"], "end": b["end"]})
S0 = 0
for b in bodies:
    if b["i"] == 0 and b["scn"].startswith("mechanic-") and b["act"] != 0: pass
first = [b for b in bodies if b["i"] == 0]
fcount = collections.Counter(b["act"] for b in first)
fnames = collections.defaultdict(list)
for b in first:
    if b["act"] != 0: fnames[b["act"]].append(b["scn"])
FIELDS = list(states[0].keys())
# ---- per (move, side, sk) field effect from act -> e30 (bodies with an e30)
obs = collections.defaultdict(list)
for b in bodies:
    if b["e30"] is not None: obs[(b["move"], b["side"], b["sk"])].append((b["act"], b["e30"], b["e1"]))
def fx(k):
    """per-field effect: keep | set v | map {act: e30} (depends on prior) | mixed"""
    o = obs[k]; eff = {}
    for f in FIELDS:
        pairs = {(states[a][f], states[e][f]) for a, e, _ in o}
        if all(a == e for a, e in pairs): eff[f] = ["keep"]
        elif len({e for _, e in pairs}) == 1: eff[f] = ["set", next(iter(pairs))[1]]
        else:
            m = collections.defaultdict(set)
            for a, e in pairs: m[a].add(e)
            eff[f] = ["map", {str(a): sorted(e)[0] for a, e in m.items()}] if all(len(v) == 1 for v in m.values()) else ["mixed", sorted(map(str, pairs))[:6]]
    return eff
effects = {k: fx(k) for k in obs}
def klass(eff):
    ks = {v[0] for v in eff.values()}
    if ks == {"keep"}: return "unchanged"
    if "mixed" in ks: return "mixed"
    if "map" in ks: return "depends-on-prior"
    return "sets-fixed(+keeps)"
MV = {0: "STATUS/STAT(0)", 14: "SWORDS_DANCE", 33: "TACKLE", 45: "GROWL", 63: "HYPER_BEAM", 94: "PSYCHIC", 150: "SPLASH", 318: "SILVER_WIND", 244: "PSYCH_UP", 315: "OVERHEAT"}
table = {}
for k, eff in sorted(effects.items(), key=lambda kv: (kv[0][0], kv[0][1], kv[0][2])):
    nonkeep = {f: v for f, v in eff.items() if v[0] != "keep"}
    table[f"{k[0]}/{k[1]}" + (f"/{k[2]}" if k[2] else "")] = {"move": k[0], "side": k[1], "statKey": k[2], "n": len(obs[k]), "class": klass(eff), "nonKeep": nonkeep}
cls = collections.Counter(v["class"] for v in table.values())
# ---- predictor: field-level (state is the signature dict)
def predict(state, key, which="e30"):
    if key not in effects: return None
    s = dict(states[state]); eff = effects[key]
    for f, v in eff.items():
        if v[0] == "set": s[f] = v[1]
        elif v[0] == "map":
            a = str(states[state][f]) if False else None
            m = v[1]; cur = None
            for ak, ev in m.items():
                pass
    return s
# map-effects are keyed by state ids: re-derive per field value instead
def build_effects(rows, end="e30"):
    ob = collections.defaultdict(list)
    for b in rows:
        if b[end] is not None: ob[(b["move"], b["side"], b["sk"])].append(b)
    ef = {}
    for k, o in ob.items():
        e = {}
        for f in FIELDS:
            pairs = {(states[b["act"]][f], states[b[end]][f]) for b in o}
            if all(a == z for a, z in pairs): continue
            m = collections.defaultdict(set)
            for a, z in pairs: m[a].add(z)
            if len({z for _, z in pairs}) == 1: e[f] = ("set", next(iter(pairs))[1])
            elif all(len(v) == 1 for v in m.values()): e[f] = ("map", {a: next(iter(v)) for a, v in m.items()})
            else: e[f] = ("mixed", None)
        ef[k] = e
    return ef
def apply(ef, key, state):
    if key not in ef: return None
    s = dict(states[state])
    for f, (t, v) in ef[key].items():
        if t == "set": s[f] = v
        elif t == "map":
            if s[f] not in v: return None
            s[f] = v[s[f]]
        else: return None
    return json.dumps(s, sort_keys=True)
rows_by_scn = collections.defaultdict(list)
for b in bodies: rows_by_scn[b["scn"]].append(b)
def check(ef_for, label):
    """tracker: S0 at first body; after each body apply the effect (to the predicted state); at every later activation compare with the ROM signature."""
    c = collections.Counter(); miss = []
    for n, rs in rows_by_scn.items():
        ef = ef_for(n); cur = json.dumps(states[S0], sort_keys=True); known = True
        for b in rs:
            if b["i"] > 0:
                rom = json.dumps(states[b["act"]], sort_keys=True)
                if not known: c["unknown"] += 1
                elif cur == rom: c["exact"] += 1
                else:
                    c["wrong"] += 1; miss.append({"scn": n, "i": b["i"], "move": b["move"], "side": b["side"], "prevMove": b["prevMove"], "prevSide": b["prevSide"], "gap": b["gap"],
                                                  "diff": {f: [json.loads(cur)[f], states[b["act"]][f]] for f in FIELDS if json.loads(cur)[f] != states[b["act"]][f]}})
                cur = json.dumps(states[b["act"]], sort_keys=True); known = True  # re-sync to ROM: 1-step check (counts each pair once)
            nxt = apply(ef, (b["move"], b["side"], b["sk"]), b["act"]) if True else None
            if nxt is None: known = False
            else: cur = nxt; known = True
    return c, miss
full = build_effects(bodies)
c1, miss1 = check(lambda n: full, "in-sample")
def loso(n):
    return build_effects([b for b in bodies if b["scn"] != n])
# leave-one-scenario-out is heavy (780 rebuilds) but bodies is 2k rows: fine
c2, miss2 = check(loso, "loso")
# ---- chained (no ROM resync): pure tracker from S0 with in-sample rule
def chained(ef_for):
    c = collections.Counter(); miss = []
    for n, rs in rows_by_scn.items():
        ef = ef_for(n); cur = json.dumps(states[S0], sort_keys=True); known = True; dead = False
        for b in rs:
            if b["i"] > 0:
                rom = json.dumps(states[b["act"]], sort_keys=True)
                if not known: c["unknown"] += 1
                elif cur == rom: c["exact"] += 1
                else: c["wrong"] += 1
            nxt = apply(ef, (b["move"], b["side"], b["sk"]), json.loads(json.dumps(0)) if False else None) if False else None
            if known:
                st = ids.get(cur); nxt = apply(ef, (b["move"], b["side"], b["sk"]), st) if st is not None else None
            else: nxt = None
            if nxt is None: known = False
            else: cur = nxt
    return c
# chained needs state ids for predicted dicts; register them
def apply_id(ef, key, sd):
    if key not in ef: return None
    s = dict(sd)
    for f, (t, v) in ef[key].items():
        if t == "set": s[f] = v
        elif t == "map":
            if s[f] not in v: return None
            s[f] = v[s[f]]
        else: return None
    return s
def chain_check(ef_for):
    c = collections.Counter(); miss = []
    for n, rs in rows_by_scn.items():
        ef, ef1 = ef_for(n); cur = dict(states[S0]); cur1 = cur
        for b in rs:
            rom = states[b["act"]]
            if b["i"] > 0:
                cur = cur1 if (b["gap"] is not None and b["gap"] < GATE) else cur30
                if cur is None: c["unknown"] += 1
                elif cur == rom: c["exact"] += 1
                else:
                    c["wrong"] += 1; miss.append({"scn": n, "i": b["i"], "move": b["move"], "side": b["side"], "prevMove": b["prevMove"], "gap": b["gap"], "diff": {f: [cur[f], rom[f]] for f in FIELDS if cur[f] != rom[f]}})
            k = (b["move"], b["side"], b["sk"]); a = cur
            cur30 = apply_id(ef, k, a) if a is not None else None; cur1 = apply_id(ef1, k, a) if a is not None else None
            cur = cur30
    return c, miss
full1 = build_effects(bodies, "e1")
c3, miss3 = chain_check(lambda n: (full, full1))
c4, miss4 = chain_check(lambda n: (loso(n), build_effects([b for b in bodies if b["scn"] != n], "e1")))
# ---- ROM-truth chain / unit resets
chain = collections.Counter(); chainmiss = []
for b in bodies:
    if b["i"] == 0 or b["gap"] is None: continue
    ref = b["prevE30"] if b["gap"] >= GATE else b["prevE1"]
    if ref is None: continue
    eq = ref == b["act"]; chain[("gap>=30" if b["gap"] >= GATE else "gap<30", eq)] += 1
    if not eq: chainmiss.append({"scn": b["scn"], "i": b["i"], "prev": b["prevMove"], "move": b["move"], "gap": b["gap"], "diff": {f: [states[ref][f], states[b["act"]][f]] for f in FIELDS if states[ref][f] != states[b["act"]][f]}})
# between-body non-move units: per scenario kind
unit = collections.defaultdict(collections.Counter)
for m in chainmiss:
    unit[m["scn"].split("-")[1] if m["scn"].startswith("mechanic-") else m["scn"].split("-")[0]][tuple(sorted(m["diff"]))] += 1
# e1 vs e30 differences per move
e1e30 = collections.Counter()
for b in bodies:
    if b["e1"] is not None and b["e30"] is not None: e1e30[(b["move"], b["e1"] == b["e30"])] += 1
# ---- consumers
CONS = {315: "OVERHEAT", 318: "SILVER_WIND", 244: "PSYCH_UP"}
READS = {315: ["dispcnt", "bg1cnt", "bg1hofs", "bg1vofs", "win0h", "win0v", "bldcnt", "bldalpha", "bldy", "matricesSha"],
         318: ["dispcnt", "bg1cnt", "bg2cnt", "bg1hofs", "bg1vofs", "win0h", "win0v", "bldcnt", "bldalpha", "bldy", "matricesSha"],
         244: ["bg1cnt", "bg2cnt", "bg1hofs", "bg1vofs", "bldcnt", "bldalpha", "bldy", "matricesSha"]}
cons = {}
for mv, nm in CONS.items():
    for side in ("player", "opponent"):
        rows = [b for b in bodies if b["move"] == mv and b["side"] == side]
        if not rows: continue
        lat = [b for b in rows if b["i"] > 0]
        # classify later bodies: rule predicts the full consumer signature, or only the read fields
        ex = {"firstBodies": len(rows) - len(lat), "firstBodiesAtS0": sum(1 for b in rows if b["i"] == 0 and b["act"] == 0), "laterBodies": len(lat), "distinctLaterReadSignatures": len({json.dumps({f: states[b["act"]][f] for f in READS[mv]}, sort_keys=True) for b in lat}),
              "readFieldsDifferingFromS0": sorted({f for b in lat for f in READS[mv] if states[b["act"]][f] != states[0][f]})}
        cons[f"{nm}/{side}"] = ex
# per-scenario later-body exactness restricted to read fields (chained, in-sample and loso)
def consumer_exact(ef_for):
    res = collections.defaultdict(collections.Counter)
    for n, rs in rows_by_scn.items():
        ef, ef1 = ef_for(n); cur = dict(states[S0]); cur1 = cur
        for b in rs:
            if b["i"] > 0: cur = cur1 if (b["gap"] is not None and b["gap"] < GATE) else cur30
            if b["i"] > 0 and b["move"] in CONS:
                rom = states[b["act"]]; key = f"{CONS[b['move']]}/{b['side']}"
                if cur is None: res[key]["unknown"] += 1
                elif all(cur[f] == rom[f] for f in READS[b["move"]]): res[key]["exact"] += 1
                else: res[key]["wrong"] += 1
            k2 = (b["move"], b["side"], b["sk"]); a = cur
            cur30 = apply_id(ef, k2, a) if a is not None else None; cur1 = apply_id(ef1, k2, a) if a is not None else None; cur = cur30
    return {k: dict(v) for k, v in res.items()}
cons_in = consumer_exact(lambda n: (full, full1)); cons_loso = consumer_exact(lambda n: (loso(n), build_effects([b for b in bodies if b["scn"] != n], "e1")))
(OUT / "states.json").write_text(json.dumps({"fields": FIELDS, "S0": states[0], "nStates": len(states), "states": {f"S{i}": {k: [states[0][k], v] for k, v in s.items() if states[0][k] != v} for i, s in enumerate(states)},
    "firstBodyActivation": {f"S{k}": v for k, v in fcount.items()}, "firstBodyNotS0": {f"S{k}": v for k, v in fnames.items()}}, separators=(",", ":")))
(OUT / "move-effects.json").write_text(json.dumps({"classCounts": dict(cls), "rows": table}, separators=(",", ":")))
(OUT / "tracker-check.json").write_text(json.dumps({"scenarios": len(runs), "bodies": len(bodies), "laterBodies": sum(1 for b in bodies if b["i"] > 0),
    "oneStepInSample": dict(c1), "oneStepLeaveOneScenarioOut": dict(c2), "chainedInSample": dict(c3), "chainedLeaveOneScenarioOut": dict(c4),
    "chainRomTruth": {str(k): v for k, v in chain.items()}, "e1VsE30": {str(k): v for k, v in e1e30.items()},
    "missesChainedInSample": miss3, "missesOneStepInSample": miss1, "missesChainedLOSO_first60": miss4[:60], "romChainMisses": chainmiss}, separators=(",", ":")))
(OUT / "units.json").write_text(json.dumps({"romChainMissesByScenarioKindAndRegisters": {k: {",".join(r): n for r, n in v.items()} for k, v in unit.items()}}, separators=(",", ":")))
(OUT / "consumers.json").write_text(json.dumps({"reads": {CONS[k]: v for k, v in READS.items()}, "scenarioBodies": cons, "chainedInSample": cons_in, "chainedLOSO": cons_loso}, indent=0, separators=(",", ":")))
print("scenarios", len(runs), "bodies", len(bodies), "later", sum(1 for b in bodies if b["i"] > 0), "states", len(states)); print("first-body act states", dict(fcount), {k: v for k, v in fnames.items()})
print("move/side/stat keys", len(table), dict(cls)); print("one-step in-sample", dict(c1), "LOSO", dict(c2)); print("chained in-sample", dict(c3), "LOSO", dict(c4))
print("ROM chain (act == prev end30/e1)", {str(k): v for k, v in chain.items()}); print("e1 vs e30", {str(k): v for k, v in e1e30.items() if not k[1]})
print("consumers", json.dumps(cons)); print("cons chained in-sample", cons_in); print("cons LOSO", cons_loso)
print("misses (chained in-sample):", len(miss3))
for m in miss3[:25]: print("  ", m)
print("units:", {k: {",".join(r): n for r, n in v.items()} for k, v in unit.items()})
