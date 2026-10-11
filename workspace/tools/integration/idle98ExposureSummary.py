#!/usr/bin/env python3
"""idle98: summarize idle98Exposure.ts (seeds 0..999, five shards) into the census exposure of the two flagged timeline gaps.

usage: idle98ExposureSummary.py <exposure-dir> <census-base-shard-dir> <out.json>
STATS_CHANGE: production `stat` commands (one per kernel stat-stage-change event with from != to) and their groups (consecutive stat
commands with only messages between: at most one ROM playstatchangeanimation / playanimation B_ANIM_STATS_CHANGE each), by direction,
magnitude (|to - from| >= 2 = the "sharply" variant) and stat. Scene OFF pause: Scene ON move-animation commands whose next command is
not a hit-animation (no hit receipt: production's Scene OFF route presents nothing for the ROM's attackanimation -> Pausex20 ->
waitanimation span), by move; the hit-path bodies (next = hit-animation) are the ON hit-path class. The census move-command count
(liveShareCensus kind "move") is the cross-check.
"""
import collections, glob, json, os, sys

edir, cdir, out = sys.argv[1:4]
battles = [json.loads(l) for p in sorted(glob.glob(os.path.join(edir, "e*.jsonl")), key=lambda p: int(os.path.basename(p)[1:-6])) for l in open(p) if l.strip()]
stats = [s for b in battles for s in b["stats"]]
bodies = [x for b in battles for x in b["bodies"]]
nohit = [x for x in bodies if x["next"] != "hit-animation"]
census_moves = sum(1 for k in range(10) for l in open(os.path.join(cdir, f"r{k}.jsonl")) if l.strip() and json.loads(l)["kind"] == "move")
res = {
    "battles": len(battles), "budgetEnded": sum(b["end"] != "terminal" for b in battles),
    "statsChange": {
        "statCommands": len(stats), "groups": sum(b["statGroups"] for b in battles),
        "battlesWithAny": sum(1 for b in battles if b["stats"]),
        "byDirection": dict(collections.Counter("up" if s["to"] > s["from"] else "down" for s in stats)),
        "byMagnitude": dict(collections.Counter(str(abs(s["to"] - s["from"])) for s in stats)),
        "byStat": dict(collections.Counter(str(s["stat"]) for s in stats).most_common()),
    },
    "moveBodies": {"onCommands": len(bodies), "censusMoveCommands": census_moves, "hitPath": len(bodies) - len(nohit), "noHit": len(nohit),
                   "noHitNext": dict(collections.Counter(str(x["next"]) for x in nohit).most_common()),
                   "noHitByMove": dict(collections.Counter(str(x["moveId"]) for x in nohit).most_common(25))},
}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k: v for k, v in res.items()}, separators=(",", ":"))[:900])
