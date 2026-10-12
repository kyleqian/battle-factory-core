#!/usr/bin/env python3
"""aud118: one deterministic line per window of <check-dir>/check-*.json (audit21Check.ts, aligned windows): fixture, move, side,
attacker/target, live, rows, exact rows, px, r1 == r2 (two fresh probes' per-row digests AND the same ROM window), residual age range,
entry-lend px (control). EVERY move is listed (aud110Summary.py lists five and counts the rest); per-move totals at the end.
usage: aud118Summary.py <check-dir>"""
import json, sys
from collections import Counter
from pathlib import Path

tot = Counter()
for p in sorted(Path(sys.argv[1]).glob("check-*.json")):
    for r in json.loads(p.read_text())["rows"]:
        c, e = r["chain"], r["entry"]
        res = c["residualRows"]
        ages = f"{res[0][0]}..{res[-1][0]}({len(res)})" if res else "-"
        same = int(c["digests"][0] == c["digests"][1] and e["digests"][0] == e["digests"][1] and all(r["sameWindow"]))
        print(f"{r['fixture'].replace('.json', ''):<34} {r['move']:<10} {r['side']:<8} {r['species']:<20} live={int(c['live'])} rows={c['rows']:<3} "
              f"exact={c['exactRows']:<3} px={c['px']:<7} r1==r2={same} ages={ages} entry={e['px']}{' decline=' + c['decline'] if c['decline'] else ''}")
        tot[r["move"], "windows"] += 1
        tot[r["move"], "0px"] += int(c["live"] and c["px"] == 0)
        tot[r["move"], "same"] += same
moves = sorted({m for m, _ in tot})
print("TOTAL " + "  ".join(f"{m} {tot[m, '0px']}/{tot[m, 'windows']} (r1==r2 {tot[m, 'same']})" for m in moves))
