#!/usr/bin/env python3
"""prep25: Dive random-derived sprite data (DiveDropletProfile.velocityX/Y/direction, DiveBubbleProfile.velocityX/Y) from the Random2 words alone.
Words: gRng2 LCG stepped from the probe anchor with the per-frame step counts (random2RouteProbe --step-anim); a draw frame has 1 RfuMain1 step + N draws. The N words
(Random2() = value >> 16) are assigned to the sprites born that frame in ascending slot order (gSprites run order), per source:
  AnimSprayWaterDroplet (battle_anim_flying.c:1106): v1 = 0x1ff & w0, v2 = 0x7f & w1; data[0] = 736 +- v1, data[1] = 896 +- v2 (odd -> +).
  AnimSmallDriftingBubbles (battle_anim_water.c:1032): data[1] = (w0 & 0xff) | 256, data[2] = w1 & 0x1ff (>255 -> 256 - r).
The RfuMain1 step is tried first and last in the frame. Compared with the ROM sprite data at birth (probe spawns), every Dive body of every scenario.
usage: prep25DiveData.py STATE_DIR R2_DIR OUT.json"""
import json, sys
from pathlib import Path
SD, RD, OUT = map(Path, sys.argv[1:4])
lcg = lambda x: (x * 1103515245 + 24691) & 0xFFFFFFFF
s16 = lambda v: v - 65536 if v >= 32768 else v
def droplet(w0, w1):
    v1, v2 = w0 & 0x1ff, w1 & 0x7f
    return [736 + v1 if v1 % 2 else 736 - v1, 896 + v2 if v2 % 2 else 896 - v2]
def bubble(w0, w1):
    r = w1 & 0x1ff
    return [(w0 & 0xff) | 256, 256 - r if r > 255 else r]
res = {}
for p in sorted(SD.glob("*dive*-r1.json")):
    name = p.name[:-8]
    if not (name.startswith("mechanic-dive-") or name.startswith("prep25-dive-alt-")): continue
    d = json.loads(p.read_text()); r = json.loads((RD / p.name).read_text())
    n = r["frames"]; steps = [0] * (n + 2)
    for run in r["runs"]:
        for f in range(run["from"], run["to"] + 1): steps[f] = run["steps"]
    val = [r["anchorRng2"]] + [0] * n
    for f in range(1, n + 1):
        v = val[f - 1]
        for _ in range(steps[f]): v = lcg(v)
        val[f] = v
    out = []
    for bi, b in enumerate(x for x in d["bodies"] if x["move"] == 291):
        A, E = b["start"], b["end"]; tot = ok = 0; bad = []
        for fr in sorted({x["frame"] for x in r["singleSteppedNonTrivial"] if A <= x["frame"] <= E}):
            k = steps[fr]; seq = []; v = val[fr - 1]
            for _ in range(k): v = lcg(v); seq.append(v >> 16)
            births = sorted((s for s in d["spawns"] if s["f"] == fr and s["ev"] == "+"), key=lambda s: s["slot"])
            # random sprites = droplets (data[0] in 200..1300 and tmpl with 10 births) / bubbles (data[1] in 256..511): classify by which model fits
            matched = []
            for order, words in (("rfuFirst", seq[1:]), ("rfuLast", seq[:-1])):
                kind_words = list(words)
                cand = [s for s in births if s["data"][2] in (0, 1) or True]
                # droplets first (2 words each), then bubbles: the frame's callers decide; try all births in slot order with their own template group
                groups = {}
                for s in cand: groups.setdefault(s["tmpl"], []).append(s)
                idx = 0; good = 0; cnt = 0; first_bad = None
                for tmpl, ss in sorted(groups.items(), key=lambda kv: -len(kv[1])):
                    if len(ss) < 2: continue  # splash / hit splat: no Random2
                    for s in ss:
                        dd = s["data"]
                        if len(kind_words) - idx < 2: break
                        w0, w1 = kind_words[idx], kind_words[idx + 1]
                        if len(ss) >= 5:
                            exp = droplet(w0, w1); got = [s16(dd[0] & 0xffff), s16(dd[1] & 0xffff) + 32]; kind = "droplet"  # the probe records a birth after its first callback (data[1] -= 32; cf. diveProductionBoundary.test.ts velocityY = data[1] + 32)
                        elif len(ss) == 2:
                            exp = bubble(w0, w1); got = [dd[1], dd[2]]; kind = "bubble"
                        else: continue
                        idx += 2; cnt += 1; good += exp == got
                        if exp != got and first_bad is None: first_bad = [s["slot"], kind, exp, got]
                matched.append((order, cnt, good, idx, len(words), first_bad))
            best = max(matched, key=lambda m: (m[2], -len(m[0])))
            tot += best[1]; ok += best[2]
            if best[2] != best[1] or best[3] != best[4]: bad.append([fr - A, best])
        out.append({"body": bi, "sprites": tot, "dataExact": ok, "bad": bad[:3]})
    res[name] = out
    print(name[-38:], [(o["sprites"], o["dataExact"]) for o in out], [o["bad"] for o in out if o["bad"]][:1])
json.dump(res, open(OUT, "w"), indent=0)
