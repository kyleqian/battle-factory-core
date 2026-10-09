#!/usr/bin/env python3
"""Live audit 15: one line per consumer window from <receipt-dir>/check-*.json (audit15Check.ts).
usage: audit15Summary.py <receipt-dir>"""
import json, sys
from pathlib import Path

for p in sorted(Path(sys.argv[1]).glob("check-*.json")):
    for r in json.loads(p.read_text())["rows"]:
        same = r.get("digests") and r["digests"][0] == r["digests"][1]
        res = r.get("residualRows") or []
        ages = f"{res[0][0]}..{res[-1][0]}" if res else "-"
        print(f"{r['fixture']:<44} {r['move']:<13} {r['side']:<8} units={r['units']:<3} live={int(r['live'])} order={int(r['orderKnown'])} "
              f"alloc={int(r['allocatorInput'])} rows={r.get('rows')} exp={r.get('expectedDuration')} exact={r.get('exactRows')} "
              f"px={r.get('residualPixels')} r1==r2={int(bool(same))} ages={ages} {('ERR ' + r['error'][:120]) if r.get('error') else ''}")
