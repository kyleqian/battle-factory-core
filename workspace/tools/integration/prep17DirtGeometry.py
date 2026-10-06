#!/usr/bin/env python3
"""prep17: Mud-Slap / Sand-Attack dirt: windows, OAM slots, source/destination anchors and word->step model check, from the prep13Probe + prep17DirtTrack raw runs.
Model (src/battle_anim_ground.c AnimDirtScatter + battle_anim_mons.c InitAnimLinearTranslation):
  src = (attackerX + 15, attackerPicY + 15)   [InitSpritePosToAnimAttacker(TRUE), args 15,15; observed = attacker gSprites (x,y) + (15, 23)]
  per sprite two Random2 words (x then y): off = w & 0x1F; if off > 16: off = 16 - off ; dest = (targetX2 + xOff, targetPicY + yOff)  [plus args 5,6 shifts in the script: xArg/yArg are NOT added by AnimDirtScatter]
  xStep = ((|dest.x - src.x|) << 8 & 0xFFFF) / 20, bit0 = (moving left); same for y.
usage: prep17DirtGeometry.py OUT.json [dirA dirB]"""
import json, sys
from pathlib import Path
OUT = Path(sys.argv[1]); DIRS = [Path(x) for x in (sys.argv[2:4] or ["/tmp/p17/r1", "/tmp/p17/r2"])]
ROOT = Path(__file__).resolve().parents[2]
CASES = [("mud-accepted", "mechanic-mud-slap-player-pidgeotto-onix", 189, "mud-slap-player-pidgeotto-onix", "mud"),
         ("sand-accepted", "mechanic-sand-attack-player-pidgeotto-onix", 28, "sand-attack-player-pidgeotto-onix", "dirt"),
         ("mud-accepted-opponent-attacker", "mechanic-mud-slap-pidgeotto-onix", 189, "mud-slap-pidgeotto-onix", "mud"),
         ("sand-accepted-opponent-attacker", "mechanic-sand-attack-pidgeotto-onix", 28, "sand-attack-pidgeotto-onix", "dirt"),
         ("mud-alt-set156-set146", "prep12-mud-slap-alt-set156-set146", 189, None, None),
         ("sand-alt-set156-set146", "prep12-sand-attack-alt-set156-set146", 28, None, None)]
def lcg(s): return (s * 1103515245 + 24691) & 0xFFFFFFFF
def off(w):
    v = w & 0x1F
    return 16 - v if v > 16 else v
def delta(d):
    mag = ((abs(d) << 8) & 0xFFFF) // 20
    return (mag | 1) if d < 0 else (mag & ~1)
res = {}
for name, scen, mv, fx, key in CASES:
    runs = []
    for D in DIRS:
        p = json.load(open(D / f"{scen}.json")); t = json.load(open(D / f"track-{scen}.json"))
        b = next(x for x in p["bodies"] if x["move"] == mv); A = b["start"]
        ser = {f: v for f, v in p["rng2Series"]}
        dirt = [e for e in p["spawns"] if e["ev"] == "+" and A <= e["f"] <= b["end"] and e["attr"][0] != 160]
        free = {(e["slot"], e["f"]) for e in p["spawns"] if e["ev"] == "-"}
        waves = {}
        for e in dirt: waves.setdefault(e["f"] - A, []).append(e)
        slots, words, steps, srcs = [], [], [], []
        for W in sorted(waves):
            s = lcg(ser[A + W - 1])  # the frame's own AgbMain/RfuMain1 Random2 step precedes the callbacks (prep12 §1.7), so the first sprite word is the second step
            for e in sorted(waves[W], key=lambda e: e["slot"]):
                s = lcg(s); wx = s >> 16; s = lcg(s); wy = s >> 16
                slots.append(e["slot"]); words.append([wx, wy])
                tr = t["rows"][str(W)][str(e["slot"])]
                steps.append([tr[4][1], tr[4][2]]); srcs.append([tr[0], tr[1]])
        xy = t["anchors"]["battlerXY"]; (ax, ay), (tx, ty) = xy[t["anchors"]["attacker"]], xy[t["anchors"]["target"]]
        # solve target pic y offset k (targetPicY = ty + k) and x offset kx from the model; report which (kx, k) reproduce all 30 steps
        sols = [(cx, cy) for cx in range(-150, 151) for cy in range(-150, 151)
                if all(delta(cx + off(w[0])) == st[0] and delta(cy + off(w[1])) == st[1] for w, st in zip(words, steps))]
        # lowest-free allocator over computed lifetimes: base = in-use slots at activation; transients (non-dirt spawns) keep their measured spawn/free rows; dirt lives 21 rows
        base = set(b["atActivation"]["sprites"])
        trans = [(e["f"] - A, next(g["f"] - A for g in p["spawns"] if g["ev"] == "-" and g["slot"] == e["slot"] and g["f"] > e["f"]), e["slot"]) for e in p["spawns"] if e["ev"] == "+" and A <= e["f"] <= b["end"] and e["attr"][0] == 160]
        sim, live = [], []  # live: (slot, until)
        seq = sorted([(r, 0, ("T", sl, fr_)) for r, fr_, sl in trans] + [(e["f"] - A, 1, ("D", e["slot"], None)) for e in dirt], key=lambda x: (x[0], x[1], x[2][1] if x[1] else 0))
        simd = []
        for r, _k, (kind, meas, until) in seq:
            live = [(sl, u) for sl, u in live if u > r]
            sl = next(i for i in range(64) if i not in base and all(i != x for x, _ in live))
            live.append((sl, (until if kind == "T" else r + 21)))
            (simd if kind == "D" else sim).append(sl)
        run = {"allocatorBaseSlots": sorted(base), "allocatorMatchesDirt": simd == slots, "allocatorTransientSlots": sim, "transients": trans, "A": A, "bodyRows": b["end"] - A, "waveRows": sorted(waves), "dirtSlots": slots, "sources": sorted({tuple(s) for s in srcs}), "attackerXY": [ax, ay], "targetXY": [tx, ty],
               "sourceMinusAttacker": sorted({(s[0] - ax, s[1] - ay) for s in srcs}), "lifeRows": sorted({e["f"] - A for e in p["spawns"] if e["ev"] == "-" and (e["slot"], e["f"]) in free and e["slot"] in slots} ),
               "targetMinusSourceSolutions": sols, "predictedFromAnchors": [tx - srcs[0][0], ty - srcs[0][1]], "attackerSide": "player" if t["anchors"]["attacker"] == 0 else "opponent", "stepsMatchAllWords": bool(sols), "firstWords": words[:3]}
        if fx:
            prof = json.load(open(ROOT / f"tools/compare/fixtures/{fx}.json"))["animationProfile"]
            run["fixtureSlotsEqual"] = [e["slot"] for e in prof[key]] == slots
            run["fixtureStepsEqual"] = [[e["xStep"], e["yStep"]] for e in prof[key]] == steps
            run["fixtureWindow"] = json.load(open(ROOT / f"tools/compare/fixtures/{fx}.json"))["denseWindow"]
        runs.append(run)
    res[name] = {"identicalAcrossFreshProcesses": runs[0] == runs[1], **runs[0]}
OUT.write_text(json.dumps({"schema": "prep17-dirt-geometry.v1", "cases": res}, indent=1, default=list) + "\n")
for n, c in res.items():
    print(n, c["identicalAcrossFreshProcesses"], "A", c["A"], "rows", c["bodyRows"], "waves", c["waveRows"], "slotsEqFx", c.get("fixtureSlotsEqual"), "stepsEqFx", c.get("fixtureStepsEqual"), "src-att", c["sourceMinusAttacker"], "solutions", c["targetMinusSourceSolutions"][:4], "fromAnchors", c["predictedFromAnchors"])
