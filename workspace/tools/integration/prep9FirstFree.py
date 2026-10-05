#!/usr/bin/env python3
"""prep9: replay the ROM sprite/task spawn logs against a first-free allocator seeded with the baseline at activation (occupied sprite slots / active tasks of the activation snapshot).
A spawn is first-free if its slot is the lowest free slot given the occupancy at that frame (frees of the same frame applied before OR after the spawns: a spawn passes if either order explains it).
usage (workspace root): python3 tools/integration/prep9FirstFree.py [run=r1] > tools/integration/fixtures/prep9-first-free.json"""
import json, glob, sys
from pathlib import Path
RUN = sys.argv[1] if len(sys.argv) > 1 else "r1"; FX = Path("tools/integration/fixtures")
out = {"run": RUN, "scenarios": {}}; tot = {"sprite": [0, 0], "task": [0, 0]}
for f in sorted(glob.glob(str(FX / f"prep9-probes/{RUN}/*.json"))):
    d = json.load(open(f)); n = Path(f).stem
    if d["activation"] is None: continue
    act = d["snapshots"]["act"]; res = {}
    for kind, size, ev_add, ev_del, base in (("sprite", 64, "sprite+", "sprite-", set(map(int, act["sprites"]))), ("task", 16, "task+", "task-", set(map(int, act["tasks"])))):
        occ = set(base); bad = []; total = 0
        frames = sorted({s["f"] for s in d["spawns"] if s["kind"] in (ev_add, ev_del) and s["f"] > d["activation"]})
        for fr in frames:
            adds = sorted(s["slot"] for s in d["spawns"] if s["f"] == fr and s["kind"] == ev_add); dels = [s["slot"] for s in d["spawns"] if s["f"] == fr and s["kind"] == ev_del]
            def check(pre, post):
                o = set(pre); ok = True
                for s in adds:
                    if min(x for x in range(size) if x not in o) != s: ok = False
                    o.add(s)
                return ok
            before_free = check(occ - set(dels), None); after_free = check(occ, None)
            total += len(adds)
            if not (before_free or after_free): bad.append({"frame": fr - d["activation"], "adds": adds, "occupied": sorted(occ)})
            occ = (occ | set(adds)) - set(dels)
        res[kind] = {"spawns": total, "violations": bad}; tot[kind][0] += total; tot[kind][1] += len(bad)
    out["scenarios"][n] = res
out["totals"] = {k: {"spawns": v[0], "violationFrames": v[1]} for k, v in tot.items()}
print(json.dumps(out, indent=1))
