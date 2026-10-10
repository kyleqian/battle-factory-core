#!/usr/bin/env python3
"""flat77: the windows table from flat77Check.ts receipts (one line per Flatter window; chain lend = the production hosts as the
orchestrator feeds them). Columns: window, attacker side, attacker / target species, the units right before the consumer, live or the
decline, firstBody, order lend known, allocator host known, rows, exact rows, px (run 1), r1 == r2 (per-row digests), and for live windows
the D3 check: registers exact / rows + the register keys that differ (with ROM / live values), activation order == ROM, allocator rows.
usage: flat77Summary.py <check-dir>
"""
import json, sys
from pathlib import Path

lines, live, zero = [], 0, 0
for p in sorted(Path(sys.argv[1]).glob("check-*.json")):
    for r in json.loads(p.read_text())["rows"]:
        c = r["chain"]
        hist = " | ".join(r["history"])[-60:]
        d3 = c.get("d3")
        d3s = "-"
        if c["live"] and d3:
            keys = sorted({f"{k}:{v['rom']:#06x}/{v['live']:#06x}" for m in d3["registers"]["mismatch"] for k, v in m["diff"].items()})
            d3s = f"reg {d3['registers']['exact']}/{d3['registers']['rows']}{' ' + ','.join(keys) if keys else ''} order {d3['activationOrder']} alloc {d3['allocator']['exact']}/{d3['allocator']['rows']}"
        same = c["digests"][0] == c["digests"][1]
        if c["live"]:
            live += 1
            zero += c["px"] == 0 and same
        lines.append(f"{r['fixture']:<34} {r['side']:<8} {r['species']:<18} live={'Y' if c['live'] else 'n'} {'' if c['live'] else c['decline']:<30} "
                     f"first={'Y' if c['firstBody'] else 'n'} order={'Y' if c['orderKnown'] else 'n'} alloc={'Y' if c.get('allocatorKnown') else 'n'} "
                     f"rows={c['rows']} exact={c['exactRows']} px={c['px']} r1==r2={'Y' if same else 'N'} {d3s}  [{hist}]")
print("\n".join(lines))
print(f"windows {len(lines)}; live {live}; live with 0 px on every row and r1 == r2: {zero}")
