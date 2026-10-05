#!/usr/bin/env python3
"""prep10: derived checks over the prep10 probe receipts (fixtures/prep10-probes/r1) -> fixtures/prep10-analysis.json.
 1. Pain Split battler y2 = (var - var2)/2, var = 64 - 2*yDelta, var2 = min((var<<8)/matrix.d, 128) (SetBattlerSpriteYOffsetFromYScale, battle_anim_mons.c:1873) with yDelta = mon-pic coords.yOffset
    (player: back table, opponent: front table, GetBattlerYDeltaFromSpriteId :1897) vs the ROM sprite y2 in the three 12-frame phases (+16 player-side correction from phase 1).
 2. Reversal / Flail target shake (AnimTask_ShakeTargetBasedOnMovePowerOrDmg): ROM target x2 sequence vs +ceil(A/2)/-floor(A/2), A = clamp(gAnimMovePower/12, 1, 16), and the A/0 toggle of reversal.ts:125.
 3. gAnimMovePower at activation == gBattleMovePower == gDynamicBasePower for the dynamic-power moves.
usage (workspace root): python3 tools/integration/prep10Analyze.py"""
import json, re
from pathlib import Path
FX = Path("tools/integration/fixtures"); R1 = FX / "prep10-probes/r1"; rd = lambda p: json.load(open(p))
SP = {int(v): k for k, v in re.findall(r"#define SPECIES_(\w+)\s+(\d+)\b", open("reference/pokeemerald/include/constants/species.h").read())}
coords = rd("src/data/gen/mon-pic-coords.json")
def trunc_div(a, b): return int(a / b)
def y2_formula(delta, d, correction=0):
    var = 64 - 2 * delta; var2 = min(trunc_div(var << 8, d), 128)
    return trunc_div(var - var2, 2) + correction
PH = [(16, 27, 320, 0), (41, 52, 283, 16), (66, 77, 283, 16)]
out = {"painSplit": [], "shake": [], "powerEquality": []}
for f in ("mechanic-pain-split-player-misdreavus-opponent-gengar", "mechanic-pain-split-opponent-misdreavus-player-gengar", "pain-split-player-dusclops-opponent-gengar", "pain-split-opponent-dusclops-player-gengar"):
    d = rd(R1 / f"{f}.json"); b = [x for x in d["bodies"] if x["move"] == 220][0]; mons = b["atActivation"]["mons"]
    for bi, side in ((0, "player"), (1, "opponent")):
        name = SP[mons[bi]["species"]]; delta = coords["back" if side == "player" else "front"][name]["yOffset"]
        for ph, (a, z, dm, corr) in enumerate(PH):
            rom = {r[2 + 8 * bi] for r in d["battlerSeries"] if a <= r[0] - b["start"] <= z}
            m = {r[1 + 8 * bi + 7] for r in d["battlerSeries"] if a <= r[0] - b["start"] <= z}
            fm = y2_formula(delta, dm, corr if side == "player" else 0)
            out["painSplit"].append({"scenario": f, "battler": bi, "side": side, "species": name, "yOffset": delta, "phase": ph, "romY2": sorted(rom), "matrixD": sorted(m), "formulaY2": fm, "match": rom == {fm}})
for f, mv in (("mechanic-reversal-hp-bands-off", 179), ("mechanic-flail-hp-bands-off", 175)):
    d = rd(R1 / f"{f}.json")
    for b in [x for x in d["bodies"] if x["move"] == mv]:
        a = b["atActivation"]; tg = a["target"]; p = a["gAnimMovePower"]; A = min(16, max(1, p // 12))
        seq = [r[1 + 8 * tg] for r in d["battlerSeries"] if b["start"] <= r[0] < b["end"] and r[1 + 8 * tg] != 0]
        up, down = (A + 1) // 2, A // 2
        src = [up if (i // 2) % 2 == 0 else -down for i in range(len(seq))]
        out["shake"].append({"move": mv, "power": p, "amplitude": A, "romFirst12": seq[:12], "sourceToggle(+ceil/-floor)": src[:12], "sourceMatches": seq == src or seq[:len(src)] == [s for s in src if s != 0][:len(seq)] or seq[:12] == src[:12], "reducerToggleA_0": [A if (i // 2) % 2 == 0 else 0 for i in range(12)]})
        out["powerEquality"].append({"move": mv, "gAnimMovePower": p, "gBattleMovePower": a["gBattleMovePower"], "gDynamicBasePower": a["gDynamicBasePower"], "equal": p == a["gBattleMovePower"] == a["gDynamicBasePower"]})
for f in sorted(R1.glob("*magnitude*.json")):
    d = rd(f)
    for b in [x for x in d["bodies"] if x["move"] == 222]:
        a = b["atActivation"]; out["powerEquality"].append({"move": 222, "scenario": f.stem, "gAnimMovePower": a["gAnimMovePower"], "gBattleMovePower": a["gBattleMovePower"], "gDynamicBasePower": a["gDynamicBasePower"], "intenseBranch(>99)": a["gAnimMovePower"] > 99, "equal": a["gAnimMovePower"] == a["gBattleMovePower"] == a["gDynamicBasePower"]})
(FX / "prep10-analysis.json").write_text(json.dumps(out, indent=1) + "\n")
print("painSplit phases matching formula:", sum(x["match"] for x in out["painSplit"]), "/", len(out["painSplit"]))
for s in out["shake"]: print("shake", s["move"], "power", s["power"], "A", s["amplitude"], "ROM", s["romFirst12"][:8], "source(+ceil/-floor)", s["sourceToggle(+ceil/-floor)"][:8], "A/0 reducer", s["reducerToggleA_0"][:8])
print("power equality:", [(x["move"], x["gAnimMovePower"], x["equal"]) for x in out["powerEquality"]])
