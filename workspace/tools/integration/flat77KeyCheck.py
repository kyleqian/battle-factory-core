#!/usr/bin/env python3
"""flat77: the census-delta identity gate for ONE-PROCESS liveShareCensus.ts reports (hist73KeyCheck.py expects hist73Merge.py's
sharded reports): command count, the command KEY sequence (battle, kind, moveId, side, attacker, target), frames per command, battleDigest
and battleDigestExcludingFrames identical, 0 live -> non-live regressions; then the gained commands / live frames and the overall shares.
usage: flat77KeyCheck.py <before.json> <before.jsonl> <after.json> <after.jsonl>   (exit 1 on any failure)
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
    "same battleDigest": rb["battleDigest"] == ra["battleDigest"],
    "same battleDigestExcludingFrames": rb["battleDigestExcludingFrames"] == ra["battleDigestExcludingFrames"],
}
regressions = [(b["battle"], b["move"], b["side"]) for b, a in zip(before, after) if b["status"] == "live" and a["status"] != "live"]
checks["0 live -> non-live regressions"] = not regressions
for k, ok in checks.items():
    print(("PASS " if ok else "FAIL ") + k)
gained = [(b, a) for b, a in zip(before, after) if a["liveFrames"] > b["liveFrames"]]
print(f'gained commands {sum(a["status"] == "live" and b["status"] != "live" for b, a in gained)} / live frames '
      f'{sum(a["liveFrames"] - b["liveFrames"] for b, a in gained)}; regressions {regressions[:10]}')
for name, r in (("before", rb), ("after", ra)):
    o = r["overall"]
    print(f"{name}: {json.dumps(o, sort_keys=True)[:400]}")
print(f'battleDigest {rb["battleDigest"][:16]} battleDigestExcludingFrames {rb["battleDigestExcludingFrames"][:16]}')
sys.exit(0 if all(checks.values()) else 1)
