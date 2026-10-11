#!/usr/bin/env python3
"""Live audit 21: one line per window from audit21Check.ts receipts (CHAIN: live / decline / rows / px / r1 == r2 / residual ages; ENTRY px).
usage: audit21Summary.py <check-dir>
"""
import json, sys
from pathlib import Path

for p in sorted(Path(sys.argv[1]).glob("check-*.json")):
    for r in json.loads(p.read_text())["rows"]:
        c, e = r["chain"], r["entry"]
        ages = [a for a, _ in c["residualRows"]]
        span = f"{ages[0]}..{ages[-1]}({len(ages)}{'+' if len(ages) == 40 else ''})" if ages else "-"
        d = c["detail"][0] if c["detail"] else None
        fields = [r["fixture"], r["move"], r["side"], r["species"], f"units={r['units']}", f"live={c['live']}",
                  f"decline={c['decline']!r}" if c["decline"] else "", f"rows={c['rows']}", f"px={c['px']}",
                  f"same={c['digests'][0] == c['digests'][1]}", f"entryLive={e['live']}", f"entryPx={e['px']}", f"ages={span}",
                  f"first={d['age']}:{d['bbox']}:{d['sample']}" if d else ""]
        print(" ".join(f.replace(" ", "_") if i == 6 else f for i, f in enumerate(fields) if f))
