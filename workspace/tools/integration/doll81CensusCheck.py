#!/usr/bin/env python3
"""doll81 census check: prep43CensusDelta.py (base vs patched, seeds 0..999) plus the gates the fold needs:
- the command KEY sequence (battle, kind, moveId, side, attacker, target) and battleDigestExcludingFrames are identical;
- live -> non-live regressions (0 required);
- per (move, side): commands / presented frames that became live, and the Substitute-doll declines (reason containing "doll") before
  and after, by reason.
usage: doll81CensusCheck.py <base.json> <base.jsonl> <patched.json> <patched.jsonl> <delta.json>   -> stdout (+ delta.json)"""
import json, subprocess, sys
from collections import Counter
from pathlib import Path
bj, bl, aj, al, out = sys.argv[1:6]
print(subprocess.run([sys.executable, str(Path(__file__).with_name("prep43CensusDelta.py")), bj, bl, aj, al, out],
                     check=True, capture_output=True, text=True).stdout.splitlines()[1])
load = lambda p: [json.loads(l) for l in open(p) if l.strip()]  # noqa: E731
before, after = load(bl), load(al)
key = lambda c: tuple(c.get(k) for k in ("battle", "kind", "moveId", "side", "attacker", "target"))  # noqa: E731
rb, ra = json.load(open(bj)), json.load(open(aj))
print("command keys identical", [key(c) for c in before] == [key(c) for c in after],
      "| battleDigestExcludingFrames identical", rb["battleDigestExcludingFrames"] == ra["battleDigestExcludingFrames"],
      "| live -> non-live", sum(b["status"] == "live" and a["status"] != "live" for b, a in zip(before, after)))
reason = lambda c: (c.get("decline") or {}).get("reason", "")  # noqa: E731
gained, doll_b, doll_a = Counter(), Counter(), Counter()
for b, a in zip(before, after):
    k = (b.get("moveId"), b["side"])
    if a["liveFrames"] > b["liveFrames"]:
        gained[k + ("commands",)] += 1; gained[k + ("frames",)] += a["liveFrames"] - b["liveFrames"]
    if "doll" in reason(b): doll_b[(k, reason(b))] += 1; doll_b["frames"] += b["frames"] - b["liveFrames"]; doll_b["commands"] += 1
    if "doll" in reason(a): doll_a[(k, reason(a))] += 1; doll_a["frames"] += a["frames"] - a["liveFrames"]; doll_a["commands"] += 1
print(f"Substitute-doll declines: {doll_b['commands']} commands / {doll_b['frames']} frames -> {doll_a['commands']} / {doll_a['frames']}")
print("newly live (move, side): commands / frames")
for (m, s) in sorted({x[:2] for x in gained}, key=lambda x: -gained[x + ("frames",)]):
    print(f"  {m} {s}: {gained[(m, s, 'commands')]} / {gained[(m, s, 'frames')]}")
print("remaining doll declines (move, side, reason) >= 3:")
for (k, r), n in sorted(((k, n) for k, n in doll_a.items() if isinstance(k, tuple)), key=lambda kv: (-kv[1], kv[0])):
    if n >= 3: print(f"  {k[0][0]} {k[0][1]} {n}  {r}")
