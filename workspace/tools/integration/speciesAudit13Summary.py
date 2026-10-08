#!/usr/bin/env python3
"""speciesAudit13 summary: one line per speciesAudit13Check.ts receipt (stem, kind, rows, live duration, engaged, both fresh runs' px,
digests identical, affected ages, max px/row, bbox) and the totals. usage: speciesAudit13Summary.py <receipt dir>...  -> stdout"""
import json, sys
from pathlib import Path
n = zero = ident = 0
for d in sys.argv[1:]:
    for p in sorted(Path(d).glob("*.json")):
        r = json.loads(p.read_text())[0]; px = [x["residualPixels"] for x in r["runs"]]
        n += 1; zero += px == [0, 0]; ident += r["identical"]
        print(r["stem"], r["kind"], f"rows={r['rows']}", f"dur={r['liveDuration']}", "live" if r["liveEngaged"] else "DECLINED", f"shift={r['shift']}",
              f"px={px[0]},{px[1]}", f"identical={r['identical']}", f"ages={r['affectedAges'] or '-'}", f"maxPxRow={r['maxPxRow']}", f"bbox={r['bbox']}")
print(f"TOTAL {n} receipts, {zero} at 0 px on both fresh runs, {ident} with identical run digests")
