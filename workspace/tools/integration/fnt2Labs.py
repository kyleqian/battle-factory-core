#!/usr/bin/env python3
"""fnt2: KO labs (Scene OFF / ON) for the "fainted!" print timing (docs/fnt1-fainted-box-clear.md "fnt2").

usage: fnt2Labs.py <outdir> [case,case...]
One turn each, on the fsc1-eqko template (A, 18 idle, A, then idle): who KOs whom (absorb-*: the foe's Quick Attack lands first so the drain heals for real), the HP of the fainted mon (level), the move (plain hit / recoil move / Seismic Toss).
Writes <outdir>/fnt2-<case>-<scene>.json; copy into tools/battle-lab/ for labCompare.sh."""
import copy, json, os, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
tpl = json.load(open(os.path.join(root, "tools/battle-lab/fsc1-eqko-off.json")))
OUT = sys.argv[1]
RATTATA, TACKLE, DOUBLE_EDGE, SPLASH, SEISMIC = 19, 33, 38, 150, 69
ABSORB, MEGA_DRAIN, GEODUDE, QUICK_ATTACK = 71, 72, 74, 98
# name -> dict(plr=(species, level, move), foe=(species, level, move) for slot 0, frames)
CASES = {
    "hit-lv5": dict(plr=(RATTATA, 50, TACKLE), foe=(RATTATA, 5, SPLASH)),
    "hit-lv20": dict(plr=(RATTATA, 100, TACKLE), foe=(RATTATA, 20, SPLASH)),
    "hit-lv50": dict(plr=(RATTATA, 100, TACKLE), foe=(RATTATA, 50, SPLASH)),
    "hit-lv50-de": dict(plr=(RATTATA, 100, DOUBLE_EDGE), foe=(RATTATA, 50, SPLASH)),
    "absorb-lv5": dict(plr=(RATTATA, 100, ABSORB), foe=(RATTATA, 5, QUICK_ATTACK)),
    "absorb-lv50": dict(plr=(RATTATA, 100, ABSORB), foe=(RATTATA, 50, QUICK_ATTACK)),
    "absorb-se": dict(plr=(RATTATA, 100, MEGA_DRAIN), foe=(GEODUDE, 5, QUICK_ATTACK)),
    "foeko-lv5": dict(plr=(RATTATA, 5, SPLASH), foe=(RATTATA, 100, TACKLE)),
    "foeko-lv50": dict(plr=(RATTATA, 50, SPLASH), foe=(RATTATA, 100, TACKLE)),
}
if len(sys.argv) > 2:
    CASES = {k: v for k, v in CASES.items() if k in sys.argv[2].split(",")}
def build(case, scene):
    c = CASES[case]
    lab = copy.deepcopy(tpl)
    lab["profile"] = f"battle-scene-{scene}"
    plr, foes = lab["overrides"]["parties"]["player"], lab["overrides"]["parties"]["opponent"]
    plr[0].update(species=c["plr"][0], level=c["plr"][1], moves=[c["plr"][2]] * 4)
    foes[0].update(species=c["foe"][0], level=c["foe"][1], moves=[c["foe"][2]] * 4)
    for i in (1, 2):
        plr[i].update(species=RATTATA, level=50, moves=[SPLASH] * 4)
        foes[i].update(species=RATTATA, level=50, moves=[SEISMIC] * 4)
    lab["trace"]["segments"][3]["frames"] = 700
    json.dump(lab, open(os.path.join(OUT, f"fnt2-{case}-{scene}.json"), "w"))
os.makedirs(OUT, exist_ok=True)
for scene in ("off", "on"):
    for case in CASES:
        build(case, scene)
print(len(CASES) * 2, "labs ->", OUT)
