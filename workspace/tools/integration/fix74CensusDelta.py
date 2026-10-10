#!/usr/bin/env python3
"""fix74: live-share census delta, base vs final, over parallel ranges (battle ids restart per range).
  python3 tools/integration/fix74CensusDelta.py <dir> <range-start>... > delta.json
<dir> holds {base,final}-<start>.{json,jsonl} (liveShareCensus.ts --out / --commands). Commands are paired line by line on the KEY
(battle, kind, moveId, side, attacker, target) -- never on frames / body length; every status change is listed with both declines."""
import json, sys
from pathlib import Path

D = Path(sys.argv[1])
starts = sys.argv[2:]
load = lambda p: [json.loads(l) for l in p.read_text().splitlines() if l.strip()]
key = lambda c: (c["battle"], c["kind"], c.get("moveId"), c["side"], c.get("attacker"), c.get("target"))
out = {"ranges": [], "keySequenceIdentical": True, "battleDigestExcludingFramesIdentical": True, "commands": 0, "changes": [],
       "liveCommands": {"base": 0, "final": 0}, "liveFrames": {"base": 0, "final": 0}, "frames": {"base": 0, "final": 0}}
for s in starts:
    b, f = load(D / f"base-{s}.jsonl"), load(D / f"final-{s}.jsonl")
    rb, rf = json.loads((D / f"base-{s}.json").read_text()), json.loads((D / f"final-{s}.json").read_text())
    same_keys = len(b) == len(f) and all(key(x) == key(y) for x, y in zip(b, f))
    same_digest = rb.get("battleDigestExcludingFrames") == rf.get("battleDigestExcludingFrames")
    out["keySequenceIdentical"] &= same_keys
    out["battleDigestExcludingFramesIdentical"] &= same_digest
    out["commands"] += len(b)
    for tag, rows in (("base", b), ("final", f)):
        out["liveCommands"][tag] += sum(c["status"] == "live" for c in rows)
        out["liveFrames"][tag] += sum(c.get("liveFrames", 0) for c in rows)
        out["frames"][tag] += sum(c.get("frames", 0) for c in rows)
    for i, (x, y) in enumerate(zip(b, f)):
        if x["status"] != y["status"] or x.get("liveFrames") != y.get("liveFrames") or x.get("frames") != y.get("frames"):
            out["changes"].append({"range": s, "index": i, "battle": x["battle"], "move": x.get("move"), "moveId": x.get("moveId"), "side": x["side"],
                                   "attacker": x.get("attacker"), "target": x.get("target"), "before": x["status"], "after": y["status"],
                                   "framesBefore": x.get("frames"), "framesAfter": y.get("frames"), "declineAfter": y.get("decline")})
    out["ranges"].append({"seeds": f"{s}..{int(s) + 199}", "commands": len(b), "keysIdentical": same_keys, "digestIdentical": same_digest,
                          "digestBase": rb.get("battleDigestExcludingFrames"), "digestFinal": rf.get("battleDigestExcludingFrames")})
print(json.dumps(out, indent=1))
