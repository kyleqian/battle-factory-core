#!/usr/bin/env python3
"""ret88: per-command status flips between two merged census jsonl files (hist73Merge.py output, same command KEY sequence).
usage: ret88Flips.py <base.jsonl> <final.jsonl> <out.json>   prints live -> fallback / fallback -> live by (move, decline after / before)."""
import json, sys
from collections import Counter
b = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
a = [json.loads(l) for l in open(sys.argv[2]) if l.strip()]
key = lambda c: (c["battle"], c["kind"], c.get("moveId"), c["side"], c["attacker"], c["target"])
assert [key(c) for c in b] == [key(c) for c in a], "command KEY sequences differ"
reason = lambda c: f'{(c.get("decline") or {}).get("stage", "?")}: {(c.get("decline") or {}).get("reason", "?")}'
lf = [(x, y) for x, y in zip(b, a) if x["status"] == "live" and y["status"] != "live"]
fl = [(x, y) for x, y in zip(b, a) if x["status"] != "live" and y["status"] == "live"]
out = {"liveToFallback": len(lf), "fallbackToLive": len(fl),
       "liveToFallbackByMoveReason": Counter(f'{y.get("move", y.get("moveId"))} | {reason(y)}' for _, y in lf).most_common(),
       "fallbackToLiveByMoveReason": Counter(f'{x.get("move", x.get("moveId"))} | {reason(x)}' for x, _ in fl).most_common(),
       "liveFramesGained": sum(y["liveFrames"] for _, y in fl), "liveFramesLost": sum(x["liveFrames"] for x, _ in lf),
       "liveToFallbackCommands": [list(key(y)) for _, y in lf], "fallbackToLiveCommands": [list(key(x)) for x, _ in fl]}
open(sys.argv[3], "w").write(json.dumps(out, indent=1) + "\n")
print(f'live -> fallback {len(lf)}, fallback -> live {len(fl)}; live frames +{out["liveFramesGained"]} / -{out["liveFramesLost"]}')
for k, n in out["liveToFallbackByMoveReason"]: print(f"  L->F {n:4} {k}")
for k, n in out["fallbackToLiveByMoveReason"][:25]: print(f"  F->L {n:4} {k}")
