#!/usr/bin/env python3
"""prep25: Dive attacker/target battler-sprite visibility series from the state probe (battlerSeries: per frame, per battler [x2, y2, matrixNum, invisible, matrix abcd]).
Reports the invisible-run boundaries of the attacker (setup body A0..E0, attack body A1..E1) relative to the bodies, so the two-turn hide can be compared with the reducer
(`attackerInvisible`: setup age >= 10; attack age < 83) and with the Dig precedent. usage: prep25DiveHidden.py STATE_DIR OUT.json"""
import json, sys
from pathlib import Path
SD, OUT = Path(sys.argv[1]), Path(sys.argv[2]); res = {}
for p in sorted(SD.glob("*dive*-r1.json")):
    n = p.name[:-8]
    if not (n.startswith("mechanic-dive-") or n.startswith("prep25-dive-alt-")): continue
    d = json.loads(p.read_text()); bs = [b for b in d["bodies"] if b["move"] == 291]
    att = 0 if ("dive-player" in n or "dive-alt-player" in n) else 1  # attacker battler index (0 = player)
    series = {r[0]: r for r in d["battlerSeries"]}
    inv = lambda f, b: series[f][1 + 8 * b + 3] if f in series else None
    out = {"attackerBattler": att, "bodies": [[b["start"], b["end"]] for b in bs]}
    for bi, b in enumerate(bs):
        A, E = b["start"], b["end"]
        runs = []; prev = None
        for f in range(A - 3, E + 4):
            v = inv(f, att)
            if v != prev: runs.append([f - A, v]); prev = v
        out[f"attackerInvisibleEdges_body{bi}"] = runs
        tr = []; prev = None
        for f in range(A - 3, E + 4):
            v = inv(f, 1 - att)
            if v != prev: tr.append([f - A, v]); prev = v
        out[f"targetInvisibleEdges_body{bi}"] = tr
    # the probe records the battler series only inside bodies: the frames between the two bodies are NOT measured here (Dig precedent: hide through the gap)
    out["gapFrames"] = bs[1]["start"] - bs[0]["end"]
    out["firstBodyEdgesMatchReducer"] = out["attackerInvisibleEdges_body0"][1:2] == [[10, 1]] and [e for e in out["attackerInvisibleEdges_body1"] if e[1] == 0][:1] == [[83, 0]]
    res[n] = out
    print(n[-36:], {k: v for k, v in out.items() if k != "bodies"})
json.dump(res, open(OUT, "w"), indent=0)
