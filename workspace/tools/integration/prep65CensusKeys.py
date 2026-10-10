#!/usr/bin/env python3
"""prep65 (3): base vs patched census, same seeds: the command KEY sequence (battle, kind, moveId, move, side, attacker, target,
frames, duration) must be identical and both reports' battleDigest equal; every live -> fallback change is a regression. Prints and
writes a compact receipt: totals, faithful-random history (liveShareCensus.ts overall.faithfulRandomHistory), the gained commands by
(move, side, before decline) and every regression.
usage: prep65CensusKeys.py <before-report.json> <before-commands.jsonl> <after-report.json> <after-commands.jsonl> <out.json>
"""
import json, sys
from collections import Counter

rb, cb, ra, ca, out = sys.argv[1:6]
KEY = ("battle", "kind", "moveId", "move", "side", "attacker", "target", "frames", "duration")
load = lambda p: [json.loads(line) for line in open(p)]
before, after = load(cb), load(ca)
repb, repa = json.load(open(rb)), json.load(open(ra))
digest = lambda r: r.get("battleDigest") or r["overall"].get("battleDigest")
keysEqual = len(before) == len(after) and all(tuple(b.get(k) for k in KEY) == tuple(a.get(k) for k in KEY) for b, a in zip(before, after))
gained, regressions = Counter(), []
for b, a in zip(before, after):
    if b["status"] != "live" and a["status"] == "live":
        d = b.get("decline") or {}
        gained[(b["move"], b["side"], d.get("reason") or str(d))] += 1
    if b["status"] == "live" and a["status"] != "live":
        regressions.append({"battle": b["battle"], "move": b["move"], "after": a.get("decline")})
tot = lambda r: {k: r["overall"][k] for k in ("commands", "live", "frames", "liveFrames", "liveSharePctByCount", "liveSharePctByFrames")}
frh = lambda r: {k: r["overall"].get("faithfulRandomHistory", {}).get(k) for k in ("commands", "frames")}
receipt = {"schema": "prep65-census-keys/v1", "commands": len(before), "keySequenceIdentical": keysEqual,
           "battleDigestBefore": digest(repb), "battleDigestAfter": digest(repa), "digestEqual": digest(repb) == digest(repa),
           "before": tot(repb), "after": tot(repa), "faithfulRandomHistoryBefore": frh(repb), "faithfulRandomHistoryAfter": frh(repa),
           "gainedCommands": sum(gained.values()),
           "gained": [{"move": m, "side": s, "beforeDecline": r, "commands": n} for (m, s, r), n in sorted(gained.items(), key=lambda x: (-x[1], x[0]))],
           "regressionCount": len(regressions), "regressions": regressions}
open(out, "w").write(json.dumps(receipt, indent=1, sort_keys=True) + "\n")
print(f"commands {len(before)} key sequence {'identical' if keysEqual else 'DIFFERS'} digest {'equal' if receipt['digestEqual'] else 'DIFF'} "
      f"live {receipt['before']['live']} -> {receipt['after']['live']} frames {receipt['before']['liveFrames']} -> {receipt['after']['liveFrames']} "
      f"faithful-random {receipt['faithfulRandomHistoryBefore']} -> {receipt['faithfulRandomHistoryAfter']} regressions {len(regressions)}")
for g in receipt["gained"]:
    print(f"  gained {g['commands']:3d}  {g['move']:<14} {g['side']:<9} {g['beforeDecline']}")
