#!/usr/bin/env python3
"""Live audit 15: per-row BLDALPHA (IO vs buffered) of the audit15Vblank.sh runs; r1 == r2 gate.  usage: audit15VblankTable.py <dir>"""
import json, sys
from pathlib import Path

D = Path(sys.argv[1])
ACT = {"double-team-light-screen-opp": 449, "ctl-light-screen-opp": 77, "double-team-light-screen-ply": 453, "ctl-light-screen-ply": 73,
       "faint-attack-light-screen-ply": 410}
for n, a in ACT.items():
    r1, r2 = (json.loads((D / f"{n}-r{r}.json").read_text()) for r in (1, 2))
    print(f"== {n} (activation {a}) r1==r2 {r1 == r2}")
    for r in r1["rows"]:
        io, bf = r["io"]["bldalpha"], r["buffer"]["bldalpha"]
        print(f"  row {r['frame'] - a:3d} io eva/evb {io & 31:2d}/{io >> 8 & 31:2d} buffer {bf & 31:2d}/{bf >> 8 & 31:2d} bldcnt {r['io']['bldcnt']:#06x}"
              f" dispcnt {r['io']['dispcnt']:#06x} waiting {r['waiting']} vblank1 {r['vblank1']} visualTasks {r['visualTasks']} screen {r['screen']}")
