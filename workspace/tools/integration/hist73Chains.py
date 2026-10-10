#!/usr/bin/env python3
"""hist73 (copy of prep52Chains.py + general-animation units + a free-form --cleared-units list; schema renamed): allocator invalidator
CHAINS -> which units must be cleared together (docs/next-adapters-hist73.md).

usage: hist73Chains.py <before.jsonl> <out.json> [--cleared 24,57,...] [--cleared-status SLP,...] [--cleared-general UNIT,...]
       [--cleared-units "<exact unit text>|<exact unit text>"]
Input: hist73AllocatorCensus.ts --commands output (shards concatenated) (master src). An allocator-history-unknown decline can only become live when
EVERY unit of its chain (all invalidating units since the host was last known) stops invalidating. Reports per unit: solo
(chain is only this unit), involvement (unit in chain), and a greedy order by unlocked fallback frames (each step adds the unit
that unlocks most frames given the units already cleared; ties/zero-gain steps pick the most-involved unit). With --cleared
(move ids made net-zero), the predicted unlock of exactly that set, to check against the measured census delta.
"""
import json, sys
from collections import defaultdict

src, out = sys.argv[1], sys.argv[2]
moves = {m["id"]: m["name"] for m in json.load(open("src/data/gen/moves.json"))["moves"]}
cleared_ids = [int(x) for x in sys.argv[sys.argv.index("--cleared") + 1].split(",")] if "--cleared" in sys.argv else []
cleared_status = sys.argv[sys.argv.index("--cleared-status") + 1].split(",") if "--cleared-status" in sys.argv else []
cleared_general = sys.argv[sys.argv.index("--cleared-general") + 1].split(",") if "--cleared-general" in sys.argv else []
cleared_units = sys.argv[sys.argv.index("--cleared-units") + 1].split("|") if "--cleared-units" in sys.argv else []
cleared = ({f"body {moves[i]} (no plan, not net-zero)" for i in cleared_ids} | {f"status animation {n}" for n in cleared_status}
           | {f"general animation {n}" for n in cleared_general} | set(cleared_units))
rows = [c for c in (json.loads(l) for l in open(src) if l.strip()) if c.get("allocatorChain") is not None]
fb = lambda c: c["frames"] - c["liveFrames"]
total = sum(fb(c) for c in rows)
solo, inv = defaultdict(lambda: [0, 0]), defaultdict(lambda: [0, 0])
for c in rows:
    ch = set(c["allocatorChain"])
    if len(ch) == 1:
        u = next(iter(ch)); solo[u][0] += 1; solo[u][1] += fb(c)
    for u in ch:
        inv[u][0] += 1; inv[u][1] += fb(c)
unlocked = lambda s: [c for c in rows if set(c["allocatorChain"]) <= s]
greedy, s = [], set()
while len(greedy) < 40:
    base = sum(fb(c) for c in unlocked(s))
    cands = [u for u in inv if u not in s]
    if not cands:
        break
    best = max(cands, key=lambda u: (sum(fb(c) for c in unlocked(s | {u})) - base, inv[u][1], u))
    s.add(best)
    got = unlocked(s)
    greedy.append({"add": best, "cumulativeCommands": len(got), "cumulativeFrames": sum(fb(c) for c in got)})
pred = unlocked(cleared) if cleared else []
result = {
    "schema": "hist73-allocator-chains/v1", "declines": len(rows), "fallbackFrames": total,
    "chainLength": {str(k): sum(1 for c in rows if len(set(c["allocatorChain"])) == k) for k in sorted({len(set(c["allocatorChain"])) for c in rows})},
    "units": sorted(({"unit": u, "involvedCommands": v[0], "involvedFrames": v[1], "soloCommands": solo[u][0], "soloFrames": solo[u][1]}
                     for u, v in inv.items()), key=lambda r: (-r["involvedFrames"], r["unit"])),
    "greedy": greedy,
    **({"clearedIds": cleared_ids, "clearedStatus": cleared_status, "clearedGeneral": cleared_general, "clearedUnits": cleared_units, "predictedUnlockCommands": len(pred), "predictedUnlockFrames": sum(fb(c) for c in pred)} if cleared else {}),
}
open(out, "w").write(json.dumps(result, indent=1) + "\n")
print(f'{len(rows)} declines / {total} frames; chain lengths {result["chainLength"]}')
if cleared:
    print(f'predicted unlock for {len(cleared_ids)} cleared ids + status {cleared_status} + general {cleared_general} + units {cleared_units}: {len(pred)} commands / {result["predictedUnlockFrames"]} frames')
for g in greedy[:25]:
    print(f'  +{g["add"]:<55} -> {g["cumulativeCommands"]:>4} cmds / {g["cumulativeFrames"]:>6} frames')
print("top involvement:")
for r in result["units"][:15]:
    print(f'  {r["involvedFrames"]:>6} / {r["involvedCommands"]:>3} (solo {r["soloFrames"]:>5} / {r["soloCommands"]:>3})  {r["unit"]}')
