#!/usr/bin/env python3
"""prep29: EVERY body of each move id (multi-turn moves: Dive, Sky Attack, Ice Ball) with its Random2 draws (non-RfuMain1 callers, age, word count), spawn count,
allocator state at activation, win0 at activation. usage: prep29Bodies.py STATE_DIR R2_DIR OUT.json"""
import json, sys
from pathlib import Path
SD, RD, OUT = map(Path, sys.argv[1:4])
IDS = {"bonemerang": 155, "eruption": 284, "rapid-spin": 229, "spit-up": 255, "luster-purge": 295, "outrage": 200}
res = {}
for mv, mid in IDS.items():
    for p in sorted(SD.glob("*-r1.json")):
        n = p.name[:-8]
        if not (n.startswith(f"mechanic-{mv}-") or n.startswith(f"prep29-{mv}-alt-")): continue
        d = json.loads(p.read_text()); r2 = json.loads((RD / p.name).read_text())
        twice = json.loads((SD / p.name.replace("-r1", "-r2")).read_text()) == d
        rows = []
        for b in d["bodies"]:
            if b["move"] != mid: continue
            A, E = b["start"], b["end"]; act = b["atActivation"]
            nt = [x for x in r2["singleSteppedNonTrivial"] if A <= x["frame"] <= E]
            draws = [[x["frame"] - A, [c for c in x["callers"] if not c.startswith("RfuMain1")]] for x in nt]
            rows.append({"A": A, "len": E - A, "draws": sum(len(x[1]) for x in draws), "drawAges": [x[0] for x in draws], "callers": sorted({c for x in draws for c in x[1]}),
                         "spawns": sum(1 for s in d["spawns"] if A <= s["f"] <= E + 1 and s["ev"] == "+"), "bitmap": act["bitmap"], "tasks": act["tasks"], "win0": [act["regs"].get("win0h"), act["regs"].get("win0v")],
                         "rng2": act["rng2"]})
        res.setdefault(mv, {})[n] = {"twiceIdentical": twice, "bodies": rows}
json.dump(res, open(OUT, "w"), indent=0, separators=(",", ":"))
for mv, v in res.items():
    for n, r in v.items(): print(mv, n[-34:], [(b["len"], b["draws"], b["drawAges"][:3], b["spawns"], b["win0"]) for b in r["bodies"]])
