#!/usr/bin/env python3
"""Live audit 22: one line per window of every check-*.json in <check-dir> (audit22Check.ts / reseed85Check.ts receipts) -- CHAIN = the
production lend the orchestrator's history gives (the live claim); ENTRY = the no-history control -- and a totals line. A window is 0 px
only when it is live with px 0; r1 == r2 = the two fresh probe processes' per-row digests agree.
usage: audit22Summary.py <check-dir>"""
import json, sys
from pathlib import Path

tot = {"windows": 0, "live": 0, "0px": 0, "r1==r2": 0, "declined": 0}
for p in sorted(Path(sys.argv[1]).glob("check-*.json")):
    for r in json.loads(p.read_text())["rows"]:
        c, e = r["chain"], r["entry"]
        same = c["digests"][0] == c["digests"][1] and e["digests"][0] == e["digests"][1]
        res = [a for a, px in c["residualRows"]]
        ages = f"{min(res)}..{max(res)}" if res else "-"
        extra = f" reseeds={c['reseeds']}" if "reseeds" in c else ""
        print(f"{r['fixture']:<52} {r['move']:<12} {r['side']:<8} {r['species']:<20} live={int(c['live'])} rows={c['rows']} "
              f"exact={c['exactRows']} px={c['px']} ages={ages} r1==r2={int(same)}{extra} | entry live={int(e['live'])} px={e['px']}"
              + (f" decline={c['decline']}" if c["decline"] else ""))
        tot["windows"] += 1; tot["live"] += int(c["live"]); tot["0px"] += int(c["live"] and c["px"] == 0)
        tot["r1==r2"] += int(same); tot["declined"] += int(not c["live"])
print(" ".join(f"{k}={v}" for k, v in tot.items()))
