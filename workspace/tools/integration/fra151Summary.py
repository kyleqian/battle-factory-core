#!/usr/bin/env python3
"""fra151 (docs/fra151-front-send-in-animation.md): fold fra151Compare.ts outputs into one summary (per window: species, front animId,
delay, slide, compared rows, zero rows, px by region, the elapsed rows with opponent-sprite residual and the hb / msg rows) + a table.
  python3 tools/integration/fra151Summary.py <out.json> <compare.json...>   (table on stdout)"""
import json, os, sys
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
t = json.load(open(os.path.join(root, "src/data/gen/send-out-anim-selector-tables.json")))
fa, dl = t["frontAnimIds"]["species"], t["animationDelay"]["species"]
res = {}
for path in sys.argv[2:]:
    d = json.load(open(path))
    key = os.path.basename(path).split("-", 1)[1][:-5]
    n = d["name"]
    res[key] = {"species": n, "animId": fa.get(n, ""), "delay": dl.get(n, 0), "slide": d["slideStart"], "rows": d["rows"],
                "zeroRows": d["zeroRows"], "px": d["px"], "oppRows": [r[0] for r in d["oppNonZero"]],
                "oppPx": d["px"]["opp"], "hbMsgRows": d["hbMsgNonZero"]}
json.dump(res, open(sys.argv[1], "w"), indent=1, sort_keys=True)
print(f"{'window':10s} {'species':11s} {'front animId':30s} {'delay':>5s} {'slide':>5s} {'rows':>4s} {'opp rows':>8s} {'opp px':>7s} hb+msg rows")
for k, v in sorted(res.items()):
    print(f"{k:10s} {v['species']:11s} {v['animId']:30s} {v['delay']:5d} {v['slide']:5d} {v['rows']:4d} {len(v['oppRows']):8d} {v['oppPx']:7d} "
          f"{len(v['hbMsgRows'])}{'  opp at ' + ','.join(map(str, v['oppRows'][:8])) if v['oppRows'] else ''}")
