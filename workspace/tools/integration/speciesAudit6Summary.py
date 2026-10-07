#!/usr/bin/env python3
"""speciesAudit6 summary: coverage grid from receipts. usage: speciesAudit6Summary.py <receiptsDir>   (ok = 0 px twice fresh with identical digests, X = residual)"""
import json, glob, os, sys, collections
g = collections.defaultdict(dict); bad = 0
for f in sorted(glob.glob(sys.argv[1] + "/*.json")):
    k = os.path.basename(f)[:-5]; r = json.load(open(f))
    sp, rest = k.split("-", 1); att = sp.endswith("A"); sp = sp[:-1] if att else sp
    mv = next((m for m in ("fp", "stats", "pua", "signal-beam", "lovely-kiss", "spikes", "octazooka") if rest.startswith(m)), rest)
    side = "opponent" if ("-o-" in rest or rest.startswith(("stats-opponent", "signal-beam-opponent", "lovely-kiss-opponent", "spikes-opponent", "octazooka-opponent")) or mv == "pua") else "player"
    ok = (not r.get("error")) and r["residualPixels"] == 0 and r["identical"]
    if not r.get("identical", False): bad += 1
    g[(mv, "attacker" if att else "target", side)][sp] = "ok" if ok else "X"
for (mv, sw, side), d in sorted(g.items()): print(f"| {mv} | {sw} | attacker {side} | " + ", ".join(f"{k} {v}" for k, v in sorted(d.items())) + " |")
print("non-identical receipts:", bad)
