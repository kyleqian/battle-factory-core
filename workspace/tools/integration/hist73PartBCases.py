#!/usr/bin/env python3
"""hist73 PART B: the census's hidden-battler order stops and every body they decline (docs/next-adapters-hist73.md).

usage: hist73PartBCases.py <chains-census-before.json> <census-before.jsonl> <census-B-after.jsonl> <out.json>
<chains-census-before.json> = hist73Merge.py output of the hist73AllocatorCensus.ts shards (carries hiddenBattlerOrderStops with each
resolution's event list); the two .jsonl are hist73LiveShareCensus.ts records on master and with the Part B patch. Per stop: battle,
seed, streak, turn, reason, the faint / reshow path (the stop segment's events from the first charge body on), and the declined bodies
(order host detail naming a hidden battler) with their status after the patch.
"""
import json, sys

stops = json.load(open(sys.argv[1]))["hiddenBattlerOrderStops"]
before = [json.loads(l) for l in open(sys.argv[2]) if l.strip()]
after = [json.loads(l) for l in open(sys.argv[3]) if l.strip()]
cases = []
for s in stops:
    events = [e for seg in s["events"] for e in seg]
    first = next((i for i, e in enumerate(events) if "MOVE_ANIMATION move 19 " in e or "move 291 " in e or "move 340 " in e), 0)
    rows = [(b, a) for b, a in zip(before, after) if b["battle"] == s["battle"]
            and ((b.get("decline") or {}).get("detail") or "").endswith(s["reason"])]
    cases.append({"battle": s["battle"], "seed": s["seed"], "streak": s["streak"], "turn": s["turn"], "reason": s["reason"],
                  "hiddenBefore": s["hidden"], "path": events[first:],
                  "declinedBodies": [{"move": b["move"], "side": b["side"], "frames": b["frames"], "statusAfterPatch": a["status"]} for b, a in rows],
                  "declined": {"commands": len(rows), "frames": sum(b["frames"] - b["liveFrames"] for b, _ in rows)}})
open(sys.argv[4], "w").write(json.dumps({"schema": "hist73-partB-cases/v1", "cases": cases}, indent=1) + "\n")
for c in cases:
    print(c["battle"], c["reason"], c["declined"], sorted({(r["move"], r["statusAfterPatch"]) for r in c["declinedBodies"]}))
