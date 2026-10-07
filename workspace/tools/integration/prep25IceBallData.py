#!/usr/bin/env python3
"""prep25: Ice Ball shard data from the Random2 words alone (InitIceBallParticle, battle_anim_ice.c:1581-1587): randA = (w0 & 0xff) + 256, randB = w1 & 0x1ff (> 0xff -> 256 - randB);
data[1] = randA, data[2] = randB. The draw frame (age 37 in every body) has 2 words per shard; words are assigned to the shards born that frame in ascending slot order.
The RfuMain1 step is tried first and last. Also records, per body, the shard count (draws / 2) = the Rollout-style counter schedule 5, 7, 9, 10, 10 (then the counter restarts at 5).
Every Ice Ball body of every scenario (accepted P/O + alternate pair). usage: prep25IceBallData.py STATE_DIR R2_DIR OUT.json"""
import json, sys
from pathlib import Path
SD, RD, OUT = map(Path, sys.argv[1:4])
lcg = lambda x: (x * 1103515245 + 24691) & 0xFFFFFFFF
res = {}
for p in sorted(SD.glob("*ice-ball*-r1.json")):
    n = p.name[:-8]
    if not (n.startswith("mechanic-ice-ball-") or n.startswith("prep25-ice-ball-alt-")): continue
    d = json.loads(p.read_text()); r = json.loads((RD / p.name).read_text())
    N = r["frames"]; steps = [0] * (N + 2)
    for run in r["runs"]:
        for f in range(run["from"], run["to"] + 1): steps[f] = run["steps"]
    val = [r["anchorRng2"]] + [0] * N
    for f in range(1, N + 1):
        v = val[f - 1]
        for _ in range(steps[f]): v = lcg(v)
        val[f] = v
    out = []
    for bi, b in enumerate(x for x in d["bodies"] if x["move"] == 301):
        A, E = b["start"], b["end"]; tot = ok = 0; frames = []
        for fr in sorted({x["frame"] for x in r["singleSteppedNonTrivial"] if A <= x["frame"] <= E}):
            seq = []; v = val[fr - 1]
            for _ in range(steps[fr]): v = lcg(v); seq.append(v >> 16)
            births = sorted((s for s in d["spawns"] if s["f"] == fr and s["ev"] == "+"), key=lambda s: s["slot"])
            best = None
            for order, words in (("rfuFirst", seq[1:]), ("rfuLast", seq[:-1])):
                good = 0
                for i, s in enumerate(births):
                    if 2 * i + 1 >= len(words): break
                    w0, w1 = words[2 * i], words[2 * i + 1]; rb = w1 & 0x1ff
                    exp = [(w0 & 0xff) + 256, 256 - rb if rb > 0xff else rb]
                    good += exp == [s["data"][1], s["data"][2]]
                if best is None or good > best[1]: best = (order, good, len(births), len(words))
            tot += best[2]; ok += best[1]; frames.append([fr - A, best])
        out.append({"body": bi, "len": E - A, "drawFrames": frames, "shards": tot, "dataExact": ok})
    res[n] = out
    print(n[-36:], [(o["len"], o["shards"], o["dataExact"], [x[0] for x in o["drawFrames"]]) for o in out])
json.dump(res, open(OUT, "w"), indent=0)
