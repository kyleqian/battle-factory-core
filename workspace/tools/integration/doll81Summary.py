#!/usr/bin/env python3
"""doll81 summary: one line per measured window, deterministic (sorted), from
- <rec>/att/<stem>.json and <rec>/att-base/<stem>.json: attdollLiveCheck.ts (via speciesAudit14SwapCheck.ts) on the PATCHED and the BASE
  trees: every subbed-ATTACKER composite window (swap-in + idle + body + swap-back), both fresh runs;
- <rec>/def/{control,test,fallback}/<stem>-<kind>.json: prep38Check.ts (CONTROL = the move on the mon, calibrated shift; TEST = the move
  on the displayed doll at the control's shift, PATCHED tree; fallback = TEST on the BASE tree).
usage: doll81Summary.py <rec dir>   -> stdout"""
import json, sys
from pathlib import Path
REC = Path(sys.argv[1])
out = []
for p in sorted((REC / "att").glob("*.json")):
    base = {(r["kind"], r["window"][0]): r for r in json.load(open(REC / "att-base" / p.name))["results"]}
    for r in json.load(open(p))["results"]:
        if r["kind"] != "swap": continue
        b = base[(r["kind"], r["window"][0])]
        px = r["prod"]["px"]
        out.append("\t".join(map(str, ["att", r["stem"], r["move"], r["side"], f"t{r['turn']}", r["window"][0], r["rows"], f"body {r['romBodyRows']}",
                   f"D {r['adapterDuration']}", f"order {r['orderInput']}", f"presented {str(r['swapPresented']).lower()}",
                   f"px {px[0]}/{px[1]}", f"identical {str(r['prod']['identical']).lower()}", f"bad {','.join(r['prod']['badAges']) or '-'}",
                   f"base presented {str(b['swapPresented']).lower()} px {b['prod']['px'][0]}"])))
for p in sorted((REC / "def" / "test").glob("*.json")):
    t = json.load(open(p))[0]
    c = json.load(open(REC / "def" / "control" / p.name.replace("-test.json", "-control.json")))[0]
    f = json.load(open(REC / "def" / "fallback" / p.name))[0]
    px = lambda x: f"{x['runs'][0]['residualPixels']}/{x['runs'][1]['residualPixels']}"  # noqa: E731
    out.append("\t".join(map(str, ["def", t["stem"], t["move"], t["attackerSide"], "-", t["window"][0], t["rows"], f"shift {t['shift']}",
               f"D {t['liveDuration']}", f"order {t['orderInput']}", f"live {str(t['liveEngaged']).lower()}", f"px {px(t)}",
               f"identical {str(t['identical']).lower()}", f"bad {t['affectedAges'] or '-'}",
               f"control px {px(c)} bad {c['affectedAges'] or '-'}", f"base live {str(f['liveEngaged']).lower()} px {f['runs'][0]['residualPixels']}"])))
print("\n".join(out))
