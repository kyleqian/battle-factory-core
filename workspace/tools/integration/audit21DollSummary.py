#!/usr/bin/env python3
"""Live audit 21: one line per doll window (doll81Summary.py's fields, PRODUCTION tree only: land82 landed the cells, no patch, no base):
- <rec>/att/<stem>.json: attdollLiveCheck.ts via speciesAudit14SwapCheck.ts, every subbed-ATTACKER composite window (`swap`) and every
  plain cell body (`plain`, the attacker not behind its doll), both fresh runs, with the k+1 / k+2 tail rows of a swap;
- <rec>/def/{control,test}/<stem>-<kind>.json: prep38Check.ts (CONTROL calibrated; TEST at the control's shift).
usage: audit21DollSummary.py <rec dir>"""
import json, sys
from pathlib import Path
REC = Path(sys.argv[1])
for p in sorted((REC / "att").glob("*.json")):
    for r in json.load(open(p))["results"]:
        px = r["prod"]["px"]
        tail = r.get("tail")
        print("\t".join(map(str, ["att", r["stem"], r["kind"], r["move"], r["side"], f"t{r['turn']}", r["window"][0], r["rows"],
              f"body {r['romBodyRows']}", f"D {r['adapterDuration']}", f"order {r['orderInput']}", f"presented {str(r['swapPresented']).lower()}",
              f"cell {str(r['cell']).lower()}", f"px {px[0]}/{px[1]}", f"identical {str(r['prod']['identical']).lower()}",
              f"bad {','.join(r['prod']['badAges']) or '-'}",
              f"tail k1 {tail['rowK1']['production'][0]}/{tail['rowK1']['production'][1]} k2 {tail['rowK2']['production'][0]}" if tail else "tail -"])))
for p in sorted((REC / "d81att").glob("*.json")) if (REC / "d81att").is_dir() else []:
    for r in json.load(open(p))["results"]:
        if r["kind"] == "swap" and r.get("tail"):
            print("\t".join(map(str, ["d81", r["stem"], r["move"], r["side"], f"t{r['turn']}", r["window"][0], f"px {r['prod']['px'][0]}/{r['prod']['px'][1]}",
                  f"tail k1 {r['tail']['rowK1']['production'][0]}/{r['tail']['rowK1']['production'][1]} k2 {r['tail']['rowK2']['production'][0]}"])))
for p in sorted((REC / "later").glob("*.json")) if (REC / "later").is_dir() else []:
    t = json.load(open(p))[0]
    print("\t".join(map(str, ["later", p.stem, t["move"], t["attackerSide"], t["window"][0], t["rows"], f"shift {t['shift']}",
          f"live {str(t['liveEngaged']).lower()}", f"order {t['orderInput']}", f"px {t['runs'][0]['residualPixels']}/{t['runs'][1]['residualPixels']}",
          f"identical {str(t['identical']).lower()}", f"bad {t['affectedAges'] or '-'}"])))
for p in sorted((REC / "def" / "test").glob("*.json")):
    t = json.load(open(p))[0]
    cp = REC / "def" / "control" / p.name.replace("-test.json", "-control.json")
    c = json.load(open(cp))[0] if cp.exists() else None
    px = lambda x: f"{x['runs'][0]['residualPixels']}/{x['runs'][1]['residualPixels']}"  # noqa: E731
    print("\t".join(map(str, ["def", t["stem"], t["move"], t["attackerSide"], t["window"][0], t["rows"], f"shift {t['shift']}",
          f"D {t['liveDuration']}", f"order {t['orderInput']}", f"live {str(t['liveEngaged']).lower()}", f"px {px(t)}",
          f"identical {str(t['identical']).lower()}", f"bad {t['affectedAges'] or '-'}",
          f"control px {px(c)} bad {c['affectedAges'] or '-'}" if c else "control MISSING (the doll is up before the first body)"])))
