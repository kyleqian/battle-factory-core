#!/usr/bin/env python3
"""ord124 (docs/ord124-order-plans.md) rung 1: every `sprite-order lend unknown` / `later-body` decline of a census (liveShareCensus.ts
merged jsonl with the order host's `detail`), grouped by the host invalidation behind it (`no EXACT plan: body <move>:<side>` -> the
invalidating body = the first command of that battle with that move / side) or the detail itself when the host invalidated otherwise.
usage: ord124Attribution.py <merged.jsonl> <out.json>"""
import json, re, sys
from collections import defaultdict
from pathlib import Path

recs = [json.loads(l) for l in Path(sys.argv[1]).read_text().splitlines() if l.strip()]
by_battle = defaultdict(list)
for r in recs:
    by_battle[r["battle"]].append(r)
REASONS = ("sprite-order lend unknown", "later-body (order lend not a first body)")
groups = {}
tot = {k: {"commands": 0, "frames": 0} for k in REASONS}
for r in recs:
    d = r.get("decline") or {}
    if r["status"] == "live" or d.get("reason") not in REASONS:
        continue
    tot[d["reason"]]["commands"] += 1
    tot[d["reason"]]["frames"] += r["frames"]
    det = d.get("detail") or "(no detail)"
    m = re.search(r"no EXACT plan: body (\d+):(\w+)", det)
    key = f"body {m.group(1)}:{m.group(2)}" if m else re.sub(r"\d{2,}", "N", det)
    g = groups.setdefault(key, {"commands": 0, "frames": 0, "byReason": {}, "battles": {}})
    g["commands"] += 1
    g["frames"] += r["frames"]
    g["byReason"][d["reason"]] = g["byReason"].get(d["reason"], 0) + 1
    b = g["battles"].setdefault(str(r["battle"]), {"commands": 0, "frames": 0, "moves": {}})
    b["commands"] += 1
    b["frames"] += r["frames"]
    b["moves"][f"{r['moveId']}:{r['side']}"] = b["moves"].get(f"{r['moveId']}:{r['side']}", 0) + 1
    if m and "invalidatedBy" not in b:
        cmds = by_battle[r["battle"]]
        i = next(i for i, c in enumerate(cmds) if c["moveId"] == int(m.group(1)) and c["side"] == m.group(2))
        p = cmds[i - 1] if i else None
        b["invalidatedBy"] = {"index": i, "move": cmds[i]["move"], "attacker": cmds[i]["attacker"], "target": cmds[i]["target"],
                              "status": cmds[i]["status"], "previousCommand": p and f"{p['move']}:{p['side']}"}
total = sum(v["commands"] for v in tot.values())
total_f = sum(v["frames"] for v in tot.values())
out = {"totals": tot, "all": {"commands": total, "frames": total_f},
       "groups": dict(sorted(groups.items(), key=lambda kv: (-kv[1]["commands"], kv[0])))}
Path(sys.argv[2]).write_text(json.dumps(out, indent=1, sort_keys=True) + "\n")
print(f"{'group':58} {'cmds':>5} {'frames':>7} {'share':>6}  battles")
for k, g in out["groups"].items():
    print(f"{k[:58]:58} {g['commands']:5} {g['frames']:7} {100 * g['commands'] / total:5.1f}%  {','.join(sorted(g['battles'], key=int))}")
print(json.dumps(tot))
