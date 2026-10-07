#!/usr/bin/env python3
"""prep28: merge the weight rank (prep28Rank.py) with the route-scan blocker counts (prep28RouteBlock.ts json files) -> ranked-gaps.json.
usage: python3 tools/integration/prep28Aggregate.py OUT.json rank.json rb-0.json [rb-1.json ...]"""
import json, sys, collections
out, rank, *rbs = sys.argv[1:]
rk = json.load(open(rank)); blk = collections.Counter(); cons = collections.defaultdict(collections.Counter); tot = 0; known = 0; dec = 0
for f in rbs:
    d = json.load(open(f)); tot += d["consumerBodies"]; known += d["known"]; dec += len(d["declined"])
    for k, v in d["blockers"].items():
        blk[k] += v["total"]
        for c, n in v["consumers"].items(): cons[k][c] += n
rows = []
for r in rk["rows"]:
    k = str(r["move"]); r["routeBlocked"] = blk.get(k, 0); r["blockedConsumers"] = dict(cons.get(k, {}))
    rows.append(r)
json.dump({"routeScan": {"consumerLaterBodies": tot, "known": known, "declined": dec, "otherCause": blk.get("other", 0)}, **{k: v for k, v in rk.items() if k != "rows"}, "rows": rows}, open(out, "w"), indent=1)
print(tot, known, dec, blk.get("other", 0))
rows.sort(key=lambda r: (-r["routeBlocked"], -r["weight"]))
for r in rows[:25]: print(r["move"], r["name"], r["side"], r["weight"], r["verdict"], r["routeBlocked"], r["blockedConsumers"])
