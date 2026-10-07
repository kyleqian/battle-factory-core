#!/usr/bin/env python3
"""prep29: Luster Purge hitsplat random offsets from the Random2 words alone (AnimHitSplatRandom, battle_anim_normal.c:1049: x2 += Random2() % 48 - 24, y2 += Random2() % 24 - 12).
Words = gRng2 LCG stepped from the probe anchor with the per-frame step counts (random2RouteProbe --step-anim); in each draw frame the N words are assigned, in order,
to the sprites born that frame (ascending slot). Compared with the ROM x2/y2 of those sprites (probe spawns). usage: prep29LusterData.py STATE_DIR R2_DIR OUT.json"""
import json, sys
from pathlib import Path
SD, RD, OUT = map(Path, sys.argv[1:4])
lcg = lambda x: (x * 1103515245 + 24691) & 0xFFFFFFFF
res = {}
for p in sorted(SD.glob("*-r1.json")):
    name = p.name[:-8]
    if not (name.startswith("mechanic-luster-purge-") or name.startswith("prep29-luster-purge-alt-")): continue
    d = json.loads(p.read_text()); r = json.loads((RD / p.name).read_text())
    n = r["frames"]; steps = [0] * (n + 2)
    for run in r["runs"]:
        for f in range(run["from"], run["to"] + 1): steps[f] = run["steps"]
    val = [r["anchorRng2"]] + [0] * n
    for f in range(1, n + 1):
        v = val[f - 1]
        for _ in range(steps[f]): v = lcg(v)
        val[f] = v
    b = next(x for x in d["bodies"] if x["move"] == 295); A, E = b["start"], b["end"]
    tot = ok = 0; rows = []
    for fr in sorted({x["frame"] for x in r["singleSteppedNonTrivial"] if A <= x["frame"] <= E}):
        k = steps[fr]; seq = []; v = val[fr - 1]
        for _ in range(k): v = lcg(v); seq.append(v >> 16)
        words = seq[1:] if True else seq  # first step = the per-frame RfuMain1 advance
        births = sorted((s for s in d["spawns"] if s["f"] == fr and s["ev"] == "+"), key=lambda s: s["slot"])
        # RfuMain1 may step first or last in the frame: try both
        cand = []
        for ws in (seq[1:], seq[:-1]):
            pred = [[ws[2 * i] % 48 - 24, ws[2 * i + 1] % 24 - 12] for i in range(len(ws) // 2)]
            cand.append(pred)
        rom = [[s["x2"], s["y2"]] for s in births]
        match = any(c == rom[:len(c)] and len(c) >= 1 for c in cand) or any(c == rom for c in cand)
        tot += 1; ok += match
        rows.append({"age": fr - A, "steps": k, "romX2Y2": rom, "predFirst": cand[0], "predLast": cand[1], "match": match})
    res[name] = {"drawFrames": tot, "matching": ok, "rows": rows}
    print(name[-40:], tot, ok)
json.dump(res, open(OUT, "w"), indent=0)
