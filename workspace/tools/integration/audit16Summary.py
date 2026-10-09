#!/usr/bin/env python3
"""Live audit 16: one line per consumer window from <receipt-dir>/check-*.json (audit16Check.ts): CHAIN lend (live / order / allocator,
px, r1 == r2) and the ENTRY-lend control (px, r1 == r2), plus the audit-15 harness's stale allocator decision.
usage: audit16Summary.py <receipt-dir>"""
import json, sys
from pathlib import Path

for p in sorted(Path(sys.argv[1]).glob("check-*.json")):
    for r in json.loads(p.read_text())["rows"]:
        c, e = r["chain"], r["entry"]
        res = c["residualRows"]
        ages = f"{res[0][0]}..{res[-1][0]}" if res else "-"
        print(f"{r['fixture']:<40} {r['move']:<12} {r['side']:<8} units={r['units']:<3} live={int(c['live'])} order={int(c['orderKnown'])} "
              f"alloc={int(c['allocatorInput'])} harnessAlloc={r['harnessAllocator']!s:<5} rows={c['rows']} exact={c['exactRows']} px={c['px']} "
              f"r1==r2={int(c['digests'][0] == c['digests'][1])} ages={ages} | entry live={int(e['live'])} px={e['px']} "
              f"r1==r2={int(e['digests'][0] == e['digests'][1])} win={int(all(r['sameWindow']))}")
