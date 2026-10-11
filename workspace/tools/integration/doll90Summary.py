#!/usr/bin/env python3
"""doll90: one line per measured window from a doll90Run.sh record dir (attdollLiveCheck / prep38Check receipts).
usage: doll90Summary.py <rec dir>   (rec/att/*.json, rec/def/{control,test}/*.json, rec/ctl/*.json)"""
import glob, json, sys
from pathlib import Path
rec = Path(sys.argv[1])
for fam in ("att", "ctl"):
    for p in sorted(glob.glob(str(rec / fam / "*.json"))):
        for r in json.load(open(p))["results"]:
            pr = r.get("prod") or {}
            if not pr:
                continue
            tail = r.get("tail") or {}
            k1 = (tail.get("rowK1") or {}).get("production")
            print("\t".join(str(x) for x in [fam, r["stem"], r["move"], r["side"], r["kind"], r["frame"], r.get("rows"), f'body {r.get("romBodyRows")}',
                  f'presented {str(r.get("swapPresented")).lower()}', f'px {pr["px"][0]}/{pr["px"][1]}', f'identical {str(pr["identical"]).lower()}',
                  f'bad {",".join(pr["badAges"]) or "-"}', f'k+1 {k1[0] if k1 else "-"}']))
for kind in ("control", "test"):
    for p in sorted(glob.glob(str(rec / "def" / kind / "*.json"))):
        for r in json.load(open(p)):
            print("\t".join(str(x) for x in ["def", r["stem"], r["move"], r["attackerSide"], kind, r["window"][0], r["rows"], f'shift {r["shift"]}',
                  f'live {str(r["liveEngaged"]).lower()}', f'px {r["runs"][0]["residualPixels"]}/{r["runs"][1]["residualPixels"]}',
                  f'identical {str(r["identical"]).lower()}', f'bad {r["affectedAges"] or "-"}']))
