#!/usr/bin/env python3
"""stg107: the Struggle windows of stg107Patched.sh's audit20Check output (docs/stg107-struggle.md s3): one line per Move_STRUGGLE body
(fixture, side, species, live / decline, rows, exact rows, px of the CHAIN lend and of the ENTRY lend, r1 == r2 of the two fresh probes),
then the totals. usage: stg107PatchedSummary.py <check-dir>"""
import json, sys
from pathlib import Path

lines, live, zero, total, same = [], 0, 0, 0, 0
for p in sorted(Path(sys.argv[1]).glob("check-*.json")):
    for r in json.loads(p.read_text())["rows"]:
        if r["move"] != "STRUGGLE":
            continue
        c, e = r["chain"], r["entry"]
        total += 1
        live += bool(c["live"])
        zero += bool(c["live"] and c["px"] == 0 and c["exactRows"] == c["rows"])
        same += c["digests"][0] == c["digests"][1]
        lines.append(f"{r['fixture'][:-5]} {r['side']} {r['species']} live={c['live']} decline={c['decline']} rows={c['rows']} "
                     f"exact={c['exactRows']} px={c['px']} entryPx={e.get('px')} digests={'same' if c['digests'][0] == c['digests'][1] else 'DIFF'}")
print("\n".join(lines))
print(f"{total} Struggle windows: {live} live, {zero} live 0 px on every row, {same} r1 == r2")
