#!/usr/bin/env python3
"""ctl95: one TSV row per checked window from ctl95ControlCheck.ts (ctl/*.json) and attdollLiveCheck.ts (att/*.json) receipts.
usage: ctl95Summary.py <rec-dir>   (prints TSV: kind, check, stem, move, side, body/frame, pair, shift/framing, rows, px r1/r2, identical, bad)"""
import json, sys
from pathlib import Path

rec = Path(sys.argv[1])
out = []
for p in sorted((rec / "ctl").glob("*.json")):
    for r in json.load(open(p))["results"]:
        out.append(["ctl", p.stem, r["stem"], r["move"], r["side"], f'body{r["body"]}', f'{r["attacker"]}->{r["target"]}',
                     f'shift {r["shift"]}', str(r["rows"]), "px " + "/".join(map(str, r["px"])), f'identical {str(r["identical"]).lower()}',
                     "bad " + (",".join(r["badAges"][:8]) or "-")])
for p in sorted((rec / "att").glob("*.json")):
    for r in json.load(open(p))["results"]:
        if r.get("kind") != "swap":
            continue
        prod = r.get("prod", {})
        tail = r.get("tail") or {}
        out.append(["att", p.stem, r["stem"], r["move"], r["side"], str(r["frame"]), f'framing {json.dumps(r.get("framing"))}',
                    f'presented {str(r.get("swapPresented")).lower()}', str(r["rows"]), "px " + "/".join(map(str, prod.get("px", []))),
                    f'identical {str(prod.get("identical")).lower()}', "bad " + (",".join(prod.get("badAges", [])[:8]) or "-")
                    + f' k+1 {tail.get("rowK1", {}).get("production", ["-"])[0]}'])
print("\n".join("\t".join(r) for r in sorted(out)))
