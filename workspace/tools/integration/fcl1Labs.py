#!/usr/bin/env python3
"""fcl1: one-hit KO labs (Scene ON / OFF) for the hit -> faint cry gap (S11 t2k10 class 7; docs/aud251-s11-scoreboard-refresh.md "fcl1").

usage: fcl1Labs.py <outdir>
A level-100 Rattata with one damaging move KOs a level-5 Rattata (lone slot, the fnt2 / fsc1-eqko template): `<move>-opp` (the player KOs the foe), `<move>-plr` (the foe KOs the player).
Writes <outdir>/fcl1-<move>-<opp|plr>-<scene>.json for the moves T2's hit -> cry gap splits on (+1 vs 0 per move body), plus Seismic Toss at several foe levels (full-bar drains)."""
import copy, json, os, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
tpl = json.load(open(os.path.join(root, "tools/battle-lab/fsc1-eqko-off.json")))
OUT = sys.argv[1]
RATTATA, SPLASH, SEISMIC = 19, 150, 69
MOVES = {"aerialace": 332, "slash": 163, "facade": 263, "leafblade": 348, "gigadrain": 202, "icebeam": 58, "surf": 57, "rockslide": 157, "psychic": 94, "seismic": SEISMIC}
def build(name, move, side, level, scene):
    lab = copy.deepcopy(tpl)
    lab["profile"] = f"battle-scene-{scene}"
    plr, foes = lab["overrides"]["parties"]["player"], lab["overrides"]["parties"]["opponent"]
    atk, dfn = (plr, foes) if side == "opp" else (foes, plr)
    atk[0].update(species=RATTATA, level=100, moves=[move] * 4)
    dfn[0].update(species=RATTATA, level=level, moves=[SPLASH] * 4)
    for i in (1, 2):
        plr[i].update(species=RATTATA, level=50, moves=[SPLASH] * 4)
        foes[i].update(species=RATTATA, level=50, moves=[SEISMIC] * 4)
    lab["trace"]["segments"][3]["frames"] = 700
    json.dump(lab, open(os.path.join(OUT, f"fcl1-{name}-{side}-{scene}.json"), "w"))
os.makedirs(OUT, exist_ok=True)
for scene in ("off", "on"):
    for side in ("opp", "plr"):
        for name, move in MOVES.items():
            build(name, move, side, 5, scene)
