#!/usr/bin/env python3
"""aud110: one deterministic line per Taunt / Harden / Mean Look / Substitute / Swagger window of <check-dir>/check-*.json (audit20Check.ts or
audit21Check.ts), the CHAIN-lend render through the production live renderer: fixture, move, side, attacker/target, live, window rows, exact
rows, px, r1 == r2 (two fresh probes' per-row digests AND the same ROM window), first residual age range. Struggle (stg107's body) and other
moves are counted, not listed. Entry-lend px is the control (the doll / sprite-order variants), printed as `entry=`.
usage: aud110Summary.py <check-dir>"""
import json, sys
from collections import Counter
from pathlib import Path

KEEP = {"TAUNT", "HARDEN", "MEAN_LOOK", "SUBSTITUTE", "SWAGGER"}
tot, other = Counter(), Counter()
for p in sorted(Path(sys.argv[1]).glob("check-*.json")):
    for r in json.loads(p.read_text())["rows"]:
        c, e = r["chain"], r["entry"]
        if r["move"] not in KEEP:
            other[r["move"]] += 1
            continue
        res = c["residualRows"]
        ages = f"{res[0][0]}..{res[-1][0]}({len(res)})" if res else "-"
        same = int(c["digests"][0] == c["digests"][1] and e["digests"][0] == e["digests"][1] and all(r["sameWindow"]))
        print(f"{r['fixture'].replace('.json', ''):<34} {r['move']:<10} {r['side']:<8} {r['species']:<18} live={int(c['live'])} rows={c['rows']:<3} "
              f"exact={c['exactRows']:<3} px={c['px']:<7} r1==r2={same} ages={ages} entry={e['px']}{' decline=' + c['decline'] if c['decline'] else ''}")
        tot[r["move"], "windows"] += 1
        tot[r["move"], "0px"] += int(c["live"] and c["px"] == 0)
        tot[r["move"], "r1==r2"] += same
for m in sorted(KEEP):
    print(f"TOTAL {m:<10} windows={tot[m, 'windows']} chain-0px={tot[m, '0px']} r1==r2={tot[m, 'r1==r2']}")
print("not listed:", " ".join(f"{k}={v}" for k, v in sorted(other.items())))
