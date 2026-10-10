#!/usr/bin/env python3
"""flat77: every FLATTER 260 command of a base / patched live-share census pair (liveShareCensus.ts --commands outputs, paired line by
line: the identity gate is hist73KeyCheck.py). Per command: battle (index = seed for --seeds=0..999), side, attacker / target, frames,
status before -> after and the BEFORE / AFTER decline (stage: reason [detail]); then the totals by before -> after class.
usage: flat77CensusFlatter.py <base.jsonl> <patched.jsonl>
"""
import json, sys
from collections import Counter

load = lambda p: [json.loads(l) for l in open(p) if l.strip()]
before, after = load(sys.argv[1]), load(sys.argv[2])
assert len(before) == len(after)
why = lambda c: "-" if c.get("decline") is None else f'{c["decline"]["reason"]}' + (f' [{c["decline"]["detail"]}]' if c["decline"].get("detail") else "")
tot = Counter()
for b, a in zip(before, after):
    if b.get("moveId") != 260:
        continue
    k = f'{b["status"]} -> {a["status"]}'
    tot[(k, "commands")] += 1
    tot[(k, "frames")] += b["frames"]
    print(f'battle {b["battle"]:>3} {b["side"]:<8} {b["attacker"]:<10} -> {b["target"]:<10} frames {b["frames"]:>3} {k:<20} before: {why(b)} | after: {why(a)}')
for k in sorted({k for k, _ in tot}):
    print(f"TOTAL {k}: {tot[(k, 'commands')]} commands / {tot[(k, 'frames')]} frames")
