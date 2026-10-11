#!/usr/bin/env python3
"""idle94 (S10A timing fidelity): lead / trail of every live adapter x side against the ROM move-script body.

  lead N  = (ROM frame shown on production age 0) - (ROM activation, the gAnimScriptActive rising edge)
          = windowStart - ageOffset - activationFrame = -shadowRow   (live row i = ROM windowStart + i, live age = i + ageOffset;
            tools/integration/liveAdapterFramebuffer.ts verifyLiveAdapterFramebuffer, the issue142 ledger convention)
  trail   = (ROM first inactive frame, `cleanupFrame`) - (ROM frame of production age D, D = the production command duration)
          = cleanupFrame - (windowStart - ageOffset + D) = tailFirstAge - D
  D       = the production duration on the base: the census's live move-animation commands of that move / side (mode); without
            census coverage, the ledger's own `duration` (issue142-shadow-rows.json renders production's duration at that time).

Sources (read-only, committed): tools/integration/fixtures/issue142-shadow-rows.json (236 rows: activation, window, ageOffset,
cleanup, duration), issue142-shadow-rows-extra.json (341 rows; cleanup only for 28), multihit-shadow-rows.json (21 rows),
the issue142ActivationProbe.py receipts (`intervals[].start/end`, 212 files under tools/integration/fixtures + docs) for the ROM first
inactive frame of extra rows, and census-activation/summary.json for the ids no ledger row carries.
usage: idle94Table.py <out-dir> [census.jsonl]   (writes table.json, table.tsv, summary.json)
"""
import collections, glob, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
os.chdir(ROOT)
out_dir = sys.argv[1]
census_path = sys.argv[2] if len(sys.argv) > 2 else None
load = lambda p: json.load(open(p))

st = load("docs/animation-integration-live-status.json")
live = {}
for bucket in ("implementedAdapters", "faithfulRandomAdapters", "faithfulTimingAdapters"):
    for a in st[bucket]:
        live[a["id"]] = (a["move"][5:], bucket)
assert len(live) == 276, len(live)

# ROM probe receipts: basename -> intervals
receipts = {}
for p in sorted(glob.glob("tools/integration/fixtures/**/*.json", recursive=True) + glob.glob("docs/*.json")):
    try:
        d = load(p)
    except Exception:
        continue
    if isinstance(d, dict) and isinstance(d.get("intervals"), list):
        receipts.setdefault(os.path.basename(p), (p, d["intervals"]))

def scenario_of(row):
    sc = (row.get("sources") or {}).get("scenario")
    if sc:
        return sc
    fx = (row.get("sources") or {}).get("fixture") or row.get("fixture")
    if not fx or not os.path.exists(fx):
        return None
    d = load(fx)
    if "scenario" not in d and "sourceFixture" in d and os.path.exists(d["sourceFixture"]):
        d = {**load(d["sourceFixture"]), **d}
    return d.get("scenario")

def cleanup_from_receipt(row, move_id):
    sc = scenario_of(row)
    if not sc:
        return None, None
    hit = receipts.get(os.path.basename(sc))
    if not hit:
        return None, None
    path, iv = hit
    bodies = [x for x in iv if x.get("move") == move_id and x.get("start") == row["activationFrame"] and x.get("end") is not None]
    return (bodies[0]["end"], path) if bodies else (None, None)

entries = []  # one per ledger row (variants kept)
for path, key_id in (("tools/integration/fixtures/issue142-shadow-rows.json", "id"),
                     ("tools/integration/fixtures/issue142-shadow-rows-extra.json", "id"),
                     ("tools/integration/fixtures/multihit-shadow-rows.json", "moveId")):
    for r in load(path)["rows"]:
        mid = r[key_id]
        if r.get("activationFrame") is None or r.get("windowStart") is None:
            continue
        e = {"id": mid, "move": r["move"], "side": r["orientation"], "variant": r.get("variant") or (f"hit{r['hit']}" if "hit" in r else None),
             "activationFrame": r["activationFrame"], "windowStart": r["windowStart"], "ageOffset": r.get("ageOffset") or 0,
             "lead": r["windowStart"] - (r.get("ageOffset") or 0) - r["activationFrame"], "ledger": os.path.basename(path),
             "ledgerDuration": r.get("duration"), "cleanupFrame": r.get("cleanupFrame"), "cleanupSource": os.path.basename(path) if r.get("cleanupFrame") is not None else None,
             "fixture": (r.get("sources") or {}).get("fixture") or r.get("fixture"), "activationSource": (r.get("sources") or {}).get("activation")}
        if e["cleanupFrame"] is None:
            c, src = cleanup_from_receipt(r, mid)
            if c is not None:
                e["cleanupFrame"], e["cleanupSource"] = c, src
        entries.append(e)
# ids with no ledger row: census-activation/summary.json (issue142ActivationProbe.py receipts vs the accepted window, presentationAge 0)
have = {(e["id"], e["side"]) for e in entries}
ca = load("tools/integration/fixtures/census-activation/summary.json")
ca = ca.get("rows", ca)
name_to_id = {v[0]: k for k, v in live.items()}
for r in ca:
    mid = name_to_id.get(r.get("move"))
    if mid is None or r.get("activation") is None or not r.get("window"):
        continue
    pp, po = r["probe"].find("-player-"), r["probe"].find("-opponent-")   # slug <move>-<attacker side>-<mon>-<other side>-<mon>
    side = "player" if pp >= 0 and (po < 0 or pp < po) else "opponent"
    if (mid, side) in have:
        continue
    age0 = r["window"]["start"] - ((r.get("appStage") or {}).get("presentationAge") or 0)
    entries.append({"id": mid, "move": r["move"], "side": side, "variant": r["probe"], "activationFrame": r["activation"], "windowStart": r["window"]["start"],
                    "ageOffset": 0, "lead": age0 - r["activation"], "ledger": "census-activation/summary.json", "ledgerDuration": None,
                    "cleanupFrame": r.get("scriptEnd"), "cleanupSource": "census-activation/summary.json" if r.get("scriptEnd") is not None else None,
                    "fixture": None, "activationSource": "census-activation (issue142ActivationProbe.py)"})

# census durations / coverage per (id, side)
cen = collections.defaultdict(lambda: {"commands": 0, "frames": 0, "live": 0, "liveFrames": 0, "durations": collections.Counter()})
if census_path:
    for line in open(census_path):
        if not line.strip():
            continue
        c = json.loads(line)
        if c.get("kind") != "move" or c.get("moveId") not in live:
            continue
        k = (c["moveId"], c["side"])
        b = cen[k]
        b["commands"] += 1; b["frames"] += c["frames"]
        if c["status"] == "live":
            b["live"] += 1; b["liveFrames"] += c["liveFrames"]; b["durations"][c["frames"]] += 1

table = []
for mid, (name, bucket) in sorted(live.items()):
    for side in ("player", "opponent"):
        rows = [e for e in entries if e["id"] == mid and e["side"] == side]
        b = cen.get((mid, side))
        durs = dict(sorted(b["durations"].items())) if b else {}
        dmode = max(b["durations"].items(), key=lambda kv: (kv[1], -kv[0]))[0] if b and b["durations"] else None
        leads = sorted({e["lead"] for e in rows})
        trails = []
        for e in rows:
            D = dmode if dmode is not None else e["ledgerDuration"]
            e["D"] = D; e["Dsource"] = "census mode" if dmode is not None else ("ledger duration" if D is not None else None)
            e["trail"] = (e["cleanupFrame"] - (e["windowStart"] - e["ageOffset"] + D)) if (e["cleanupFrame"] is not None and D is not None) else None
            e["romBody"] = (e["cleanupFrame"] - e["activationFrame"]) if e["cleanupFrame"] is not None else None
            if e["trail"] is not None:
                trails.append(e["trail"])
        table.append({"id": mid, "move": name, "bucket": bucket, "side": side, "leads": leads, "trails": sorted(set(trails)),
                      "flag": bool(rows) and (any(l != 0 for l in leads) or any(t != 0 for t in trails)),
                      "rows": rows, "census": {"commands": b["commands"] if b else 0, "frames": b["frames"] if b else 0,
                                               "live": b["live"] if b else 0, "liveFrames": b["liveFrames"] if b else 0, "liveDurations": durs}})

def agg(f):
    xs = [t for t in table if f(t)]
    return {"adapterSides": len(xs), "moves": len({t["id"] for t in xs}), "censusCommands": sum(t["census"]["commands"] for t in xs),
            "censusLive": sum(t["census"]["live"] for t in xs), "censusLiveFrames": sum(t["census"]["liveFrames"] for t in xs),
            "leadFramesInCensus": sum(t["census"]["live"] * (t["leads"][0] if len(t["leads"]) == 1 else 0) for t in xs)}
summary = {
    "adapters": len(live), "adapterSides": len(table),
    "noLedgerRow": [(t["id"], t["move"], t["side"]) for t in table if not t["rows"]],
    "leadKnown": agg(lambda t: bool(t["leads"])),
    "leadZero": agg(lambda t: t["leads"] == [0]),
    "leadPositive": agg(lambda t: bool(t["leads"]) and any(l > 0 for l in t["leads"])),
    "leadNegative": agg(lambda t: bool(t["leads"]) and any(l < 0 for l in t["leads"])),
    "leadMixedVariants": [(t["id"], t["move"], t["side"], t["leads"]) for t in table if len(t["leads"]) > 1],
    "trailKnown": agg(lambda t: bool(t["trails"])),
    "trailZero": agg(lambda t: t["trails"] == [0]),
    "trailNonZero": agg(lambda t: any(x != 0 for x in t["trails"])),
    "flagged": agg(lambda t: t["flag"]),
    "leadHistogram": dict(sorted(collections.Counter(l for t in table for l in t["leads"]).items())),
    "trailHistogram": dict(sorted(collections.Counter(x for t in table for x in t["trails"]).items())),
    "census": census_path is not None,
}
os.makedirs(out_dir, exist_ok=True)
json.dump({"schema": "idle94-lead-trail/v1", "summary": summary, "table": table}, open(os.path.join(out_dir, "table.json"), "w"), indent=1)
with open(os.path.join(out_dir, "table.tsv"), "w") as f:
    f.write("id\tmove\tbucket\tside\tlead\ttrail\tflag\tcensusLive\tcensusLiveFrames\tliveDurations\tactivation\twindowStart\tageOffset\tcleanup\tD\tDsource\tledger\tcleanupSource\n")
    for t in table:
        r0 = t["rows"][0] if t["rows"] else {}
        f.write("\t".join(str(x) for x in (t["id"], t["move"], t["bucket"].replace("Adapters", ""), t["side"],
                ",".join(map(str, t["leads"])) or "n/a", ",".join(map(str, t["trails"])) or "n/a", int(t["flag"]),
                t["census"]["live"], t["census"]["liveFrames"], json.dumps(t["census"]["liveDurations"]).replace(" ", ""),
                r0.get("activationFrame"), r0.get("windowStart"), r0.get("ageOffset"), r0.get("cleanupFrame"), r0.get("D"), r0.get("Dsource"),
                r0.get("ledger"), r0.get("cleanupSource"))) + "\n")
json.dump(summary, open(os.path.join(out_dir, "summary.json"), "w"), indent=1)
print(json.dumps({k: summary[k] for k in ("adapterSides", "leadKnown", "leadPositive", "leadNegative", "trailKnown", "trailNonZero", "flagged")}))
print("leadHistogram", summary["leadHistogram"]); print("trailHistogram", summary["trailHistogram"]); print("noLedgerRow", summary["noLedgerRow"])
