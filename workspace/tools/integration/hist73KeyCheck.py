#!/usr/bin/env python3
"""hist73: the census-delta identity gate (brief: command KEY sequence (battle, kind, moveId, side, attacker, target) + battle digest
identical, 0 live -> fallback regressions).

usage: hist73KeyCheck.py <before.json> <before.jsonl> <after.json> <after.jsonl>   (hist73Merge.py outputs; exit 1 on any failure)
Also checks the presented frames per command are identical (the patch is presentation-only).
"""
import json, sys

bj, bl, aj, al = sys.argv[1:5]
load = lambda p: [json.loads(l) for l in open(p) if l.strip()]
before, after = load(bl), load(al)
rb, ra = json.load(open(bj)), json.load(open(aj))
key = lambda c: (c["battle"], c["kind"], c.get("moveId"), c["side"], c["attacker"], c["target"])
checks = {
    "same command count": len(before) == len(after),
    "same KEY sequence": [key(c) for c in before] == [key(c) for c in after],
    "same frames per command": [c["frames"] for c in before] == [c["frames"] for c in after],
    "same battle digest": rb["battleDigest"] == ra["battleDigest"] and rb["shardBattleDigests"] == ra["shardBattleDigests"],
    "same command KEY digest": rb["commandKeyDigest"] == ra["commandKeyDigest"],
}
regressions = [(b["battle"], b["move"], b["side"]) for b, a in zip(before, after) if b["status"] == "live" and a["status"] != "live"]
checks["0 live -> non-live regressions"] = not regressions
for k, ok in checks.items():
    print(("PASS " if ok else "FAIL ") + k)
gained = [(b, a) for b, a in zip(before, after) if a["liveFrames"] > b["liveFrames"]]
print(f'gained commands {sum(a["status"] == "live" and b["status"] != "live" for b, a in gained)} / frames '
      f'{sum(a["liveFrames"] - b["liveFrames"] for b, a in gained)}; regressions {regressions[:10]}')
sys.exit(0 if all(checks.values()) else 1)
