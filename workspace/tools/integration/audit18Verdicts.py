#!/usr/bin/env python3
"""Live audit 18: classify every consumer window of <receipt-dir>/check-*.json against its no-unit CONTROL (the ctl-* window of the same
consumer, side and ROM row count; Light Screen / Thunderbolt / Water Pulse controls for the Shock Wave chains, Ice Beam / Substitute
bodies of the sub-* scenarios have none):
  ZERO      live, 0 px (chain);
  =CONTROL  live, the chain's per-row residual equals the control's (the consumer's own baseline: not caused by the unit / chain / hide);
  DIFF      live, a residual the control does not have (listed with ages, bbox, sample) -> needs a verdict;
  FALLBACK  not live (production's decline reason).
usage: audit18Verdicts.py <receipt-dir>"""
import json, sys
from collections import Counter, defaultdict
from pathlib import Path

rows = []
for p in sorted(Path(sys.argv[1]).glob("check-*.json")):
    rows += json.loads(p.read_text())["rows"]
ctl = defaultdict(list)
for r in rows:
    if r["fixture"].startswith("ctl-"):
        ctl[(r["move"], r["side"], r["chain"]["rows"])].append(r)
count = Counter()
for r in rows:
    c = r["chain"]
    fam = r["fixture"].split("-")[0]
    me = 0 if r["side"] == "player" else 1
    tag = "H" if r["romInvisible"][1 - me] else "."
    if not c["live"]:
        v = f"FALLBACK ({c['decline']})"
    elif c["px"] == 0:
        v = "ZERO"
    else:
        same = [x for x in ctl.get((r["move"], r["side"], c["rows"]), []) if x["chain"]["live"] and x["chain"]["residualRows"] == c["residualRows"]
                and x["chain"]["px"] == c["px"]]
        if same:
            v = f"=CONTROL ({same[0]['fixture'][:-5]} {c['px']})"
        else:
            res = c["residualRows"]
            d = c["detail"][0] if c["detail"] else {}
            v = f"DIFF px={c['px']} rows {len(res)}{'+' if len(res) == 40 else ''} ages {res[0][0]}..{res[-1][0]} bbox {d.get('bbox')} {d.get('sample')}"
    count[(fam, tag, v.split(" ")[0])] += 1
    print(f"{r['fixture'][:-5]:<36} {r['move']:<12} {tag} {v}")
print()
for k in sorted(count):
    print(*k, count[k])
