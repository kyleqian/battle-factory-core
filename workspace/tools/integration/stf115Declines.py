#!/usr/bin/env python3
"""stf115 (docs/stf115-struggle-declines.md): the Struggle 165 declines of a census (liveShareCensus.ts --commands= merged jsonl, e.g.
stg107Census.sh's merged.jsonl), each with its gate, the order host's own invalid reason (`detail`, liveShareCensus.ts) and the battles;
for every `no EXACT plan: body <key>` host invalidation, the invalidating body (the first command of that battle with that move / side, its
index and status) and every command of the census that declines on it (Struggle or not). Also the production order table's Struggle keys.
usage: stf115Declines.py <merged.jsonl> <out.json>"""
import json, re, sys
from collections import Counter, defaultdict
from pathlib import Path

recs = [json.loads(l) for l in Path(sys.argv[1]).read_text().splitlines() if l.strip()]
by_battle = defaultdict(list)
for r in recs:
    by_battle[r["battle"]].append(r)
st = [r for r in recs if r["moveId"] == 165]
declines = Counter()
battles = defaultdict(set)
for r in st:
    if r["status"] != "live":
        d = r.get("decline") or {}
        k = f"{d.get('stage')} | {d.get('reason')} | {d.get('detail')}"
        declines[k] += 1
        battles[k].add(r["battle"])
inval = {}
for r in recs:
    det = (r.get("decline") or {}).get("detail") or ""
    m = re.search(r"no EXACT plan: body (\d+):(\w+)", det)
    if not m:
        continue
    key = f"{m.group(1)}:{m.group(2)}"
    e = inval.setdefault(key, {"commands": 0, "struggle": 0, "battles": {}})
    e["commands"] += 1
    e["struggle"] += int(r["moveId"] == 165)
    b = e["battles"].setdefault(str(r["battle"]), {"declines": 0})
    b["declines"] += 1
    if "invalidatedBy" not in b:
        cmds = by_battle[r["battle"]]
        first = next(i for i, c in enumerate(cmds) if c["moveId"] == int(m.group(1)) and c["side"] == m.group(2))
        prev = cmds[first - 1] if first else None
        b["invalidatedBy"] = {"index": first, "move": cmds[first]["move"], "status": cmds[first]["status"],
                              "attacker": cmds[first]["attacker"], "target": cmds[first]["target"],
                              "previousCommand": prev and f"{prev['move']}:{prev['side']}"}
plans = Path("src/engine/spriteOrderProductionPlans.ts").read_text()
table = {k: int(v) for k, v in re.findall(r'"(165:\w+)": (\d+)', plans)}
plan_list = json.loads("[" + plans.split("Object.freeze([", 1)[1].split("]);", 1)[0].strip().rstrip(",") + "]")
out = {
    "struggle": {"commands": len(st), "status": dict(Counter(r["status"] for r in st)),
                 "declines": {k: {"count": v, "battles": sorted(battles[k])} for k, v in declines.most_common()}},
    "hostInvalidations": dict(sorted(inval.items())),
    "productionOrderTable": {"SPRITE_ORDER_PRODUCTION_BODIES": table, "plans": {str(i): plan_list[i] for i in sorted(set(table.values()))}},
}
Path(sys.argv[2]).write_text(json.dumps(out, indent=1, sort_keys=True) + "\n")
print(json.dumps(out["struggle"]["status"]), sum(v["count"] for v in out["struggle"]["declines"].values()), "declines;",
      ", ".join(f"{k}: {v['commands']} ({v['struggle']} Struggle)" for k, v in out["hostInvalidations"].items()))
