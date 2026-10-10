#!/usr/bin/env python3
"""Live audit 20 (= audit19Verdicts.py; + `alloc=` per window: = production allocator input == ROM, ! differs, - none): classify every consumer window of <receipt-dir>/check-*.json against its no-unit CONTROL (the ctl-* window of the same
consumer, side and ROM row count; the unit bodies of the ice-* / dive-* / wp160-* scenarios have none). A Magnitude window is tagged
with the power class of the LAST Magnitude before it (>99 / <=99: fold71's 20222 key):
  ZERO      live, 0 px (chain);
  =CONTROL  live, the chain's per-row residual equals the control's (the consumer's own baseline: not caused by the unit / chain / hide);
  DIFF      live, a residual the control does not have (listed with ages, bbox, sample) -> needs a verdict;
  FALLBACK  not live (production's decline reason).
usage: audit20Verdicts.py <receipt-dir>"""
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
    pw = r.get("unitPowers") or []
    cls = "" if not pw else (" [>99]" if pw[-1] > 99 else " [<=99]")
    if pw:
        count[(fam + cls.strip(), tag, v.split(" ")[0])] += 1
    al = "-" if r["alloc"]["equal"] is None else "=" if r["alloc"]["equal"] else "!"
    print(f"{r['fixture'][:-5]:<40} {r['move']:<12} {tag}{cls} alloc{al} {v}{'' if r['hideAgree'] else ' HIDE-DISAGREES'}")
print()
for k in sorted(count):
    print(*k, count[k])
