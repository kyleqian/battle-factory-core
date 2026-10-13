#!/usr/bin/env python3
"""rst139 exposure summary (docs/rst139-ordinary-row-rest.md): aggregates rst139Exposure.ts shards (e0..e9.jsonl).
Row classes: body / faint / switch / ordinary / menu-* / resolution-<phase>. "Presented non-body" = ordinary + menu-* + the resolution
handoff phases. At stake = the opponent sprite visible, not the doll, species rest != 0; split by the tracked opponent state.
  python3 tools/integration/rst139ExposureSummary.py <shard-dir> <out.json>"""
import glob, json, os, sys
from collections import defaultdict
src, out = sys.argv[1], sys.argv[2]
battles = []
for p in sorted(glob.glob(os.path.join(src, "e*.jsonl"))):
    battles += [json.loads(l) for l in open(p) if l.strip()]
battles.sort(key=lambda b: b["seed"])
def group(cls):
    if cls == "body": return "body"
    if cls in ("faint", "switch"): return cls
    if cls == "ordinary": return "ordinary"
    if cls.startswith("menu-"): return "menu"
    return "handoff" if cls in ("resolution-confirm-handoff", "resolution-next-command-handoff") else "other:" + cls
frames = defaultdict(int); bat = defaultdict(set); species_rest = {}
for b in battles:
    for k, n in b["counts"].items():
        cls, cmd, opp, rest, st, vis, doll, player, pst = k.split("|")
        g = group(cls)
        if opp not in ("?",): species_rest[opp] = int(rest)
        nz = int(rest) != 0
        if g in ("ordinary", "menu", "handoff"):
            key = (g, opp if nz else "(rest 0)", st if nz else "-", "visible" if vis == "v" and doll == "-" else "hidden/doll")
            frames[key] += n; bat[key].add(b["seed"])
        frames[("all", g)] += n; bat[("all", g)].add(b["seed"])
nonzero = sorted(s for s, r in species_rest.items() if r != 0)
rows = [{"group": k[0], "opponent": k[1], "oppState": k[2], "sprite": k[3], "frames": frames[k], "battles": len(bat[k])}
        for k in sorted(frames) if k[0] != "all"]
totals = {k[1]: {"frames": frames[k], "battles": len(bat[k])} for k in sorted(frames) if k[0] == "all"}
stake = [r for r in rows if r["opponent"] != "(rest 0)" and r["sprite"] == "visible"]
summary = {
    "battles": len(battles), "ended": sorted({b["end"] for b in battles}), "frames": sum(b["frames"] for b in battles),
    "speciesWithNonzeroRestSeen": {s: species_rest[s] for s in nonzero},
    "speciesSeen": len(species_rest),
    "totalsByGroup": totals,
    "atStake": {
        "idle": {"frames": sum(r["frames"] for r in stake if r["oppState"] == "idle"),
                 "battles": len({s for k in frames if k[0] != "all" and k[1] != "(rest 0)" and k[2] == "idle" and k[3] == "visible" for s in bat[k]})},
        "zeroed": {"frames": sum(r["frames"] for r in stake if r["oppState"] == "zeroed"),
                   "battles": len({s for k in frames if k[0] != "all" and k[1] != "(rest 0)" and k[2] == "zeroed" and k[3] == "visible" for s in bat[k]})},
        "unknown": {"frames": sum(r["frames"] for r in stake if r["oppState"] == "unknown"),
                    "battles": len({s for k in frames if k[0] != "all" and k[1] != "(rest 0)" and k[2] == "unknown" and k[3] == "visible" for s in bat[k]})},
    },
    "seedsAtStake": {st: sorted({s for k in frames if k[0] != "all" and k[1] != "(rest 0)" and k[2] == st and k[3] == "visible" for s in bat[k]})
                     for st in ("idle", "zeroed", "unknown")},
    "rows": rows,
}
json.dump(summary, open(out, "w"), indent=1)
print(f"battles {len(battles)}; nonzero-rest species seen: {summary['speciesWithNonzeroRestSeen']}")
for r in stake: print(f"  {r['group']:9s} {r['opponent']:8s} {r['oppState']:8s} frames {r['frames']:7d} battles {r['battles']}")
print("at stake:", json.dumps(summary["atStake"]))
