#!/usr/bin/env python3
"""prep17: Meteor Mash end-of-body receipt from two fresh-process probe runs (/tmp/p17/r1, /tmp/p17/r2; see prep17Run.sh).
usage: prep17MeteorReceipt.py OUT.json [dirA dirB]"""
import json, sys
from pathlib import Path
OUT = Path(sys.argv[1]); DA, DB = (Path(x) for x in (sys.argv[2:4] or ["/tmp/p17/r1", "/tmp/p17/r2"]))
names = sorted(p.name for p in DA.glob("*meteor*.json") if not p.name.startswith("lag-"))
cases = {}
for n in names:
    res = []
    for D in (DA, DB):
        d = json.load(open(D / n)); lg = json.load(open(D / ("lag-" + n)))
        b = next(x for x in d["bodies"] if x["move"] == 309); A = b["start"]
        s = d["rng2Series"]
        lag = [f - A for (f, v), (f0, v0) in zip(s[1:], s) if v == v0 and A <= f0 <= b["end"] + 1]
        regs = [(f - A, r["bldy"], r["bldcnt"]) for f, r in d["regEvents"] if A + 165 <= f <= b["end"] + 2]
        up_end = max(r for r, y, c in regs if y == 16)
        fall = min(r for r, y, c in regs if r > up_end)  # first row of the fall to 15
        fr = {x["rel"]: x for x in lg["frames"]}
        ev = lambda r, k: [e for e in fr[r]["ev"] if e[0] == k]
        frees = [(e["f"] - A) for e in d["spawns"] if e["ev"] == "-" and A <= e["f"] <= b["end"] + 3]
        miniFree = [(e["f"] - A, e["slot"]) for e in d["spawns"] if e["ev"] == "-" and A + 175 <= e["f"] <= b["end"] + 3]
        res.append({"activation": A, "bodyRows": b["end"] - A, "lagRows": lag, "fadeUpLastRow": up_end, "fallFirstRow": fall,
                    "lastMiniFreeRow": max(frees), "miniFreeTail": miniFree[-4:],
                    "heavyRow": [r for r in fr if fr[r]["instrs"] > 100000],
                    "row192": {"instrs": fr[192]["instrs"], "random2Vcount": ev(192, "Random2")[0][2]},
                    "row193": {"instrs": fr[193]["instrs"], "random2Vcount": ev(193, "Random2")[0][2], "drawBgStartVcount": ev(193, "DrawMainBattleBackground")[0][2], "lzEndVcount": ev(193, "LZDecompressVram")[-1][2]},
                    "row194HasRandom2": bool(ev(194, "Random2")),
                    "attackerSide": "player" if d["speciesEvents"][0][2] is not None and False else None})
    cases[n[:-5]] = {"identicalAcrossFreshProcesses": res[0] == res[1], **res[0]}
for c in cases.values(): c.pop("attackerSide")
OUT.write_text(json.dumps({"schema": "prep17-meteor-mash-tail.v1", "ageZero": "first anim-active row of the 309 body (the probe's activation, = script activation)", "cases": cases}, indent=1) + "\n")
for k, c in cases.items(): print(k, c["identicalAcrossFreshProcesses"], "rows", c["bodyRows"], "lag", c["lagRows"], "fall@", c["fallFirstRow"], "R2vc192/193", c["row192"]["random2Vcount"], c["row193"]["random2Vcount"], "lastMiniFree", c["lastMiniFreeRow"])
