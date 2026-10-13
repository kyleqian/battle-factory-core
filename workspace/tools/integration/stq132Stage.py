#!/usr/bin/env python3
"""stq132: stage the dense-window scenarios for SLP / BRN / INFATUATION (docs/stq132-status-condition-render-prep.md).
Reuses sta123's accepted scenarios verbatim (tools/integration/fixtures/sta123/scenarios: Primeape Spore / Will-O-Wisp / Attract vs Onix,
both sides; seed 305419897) and adds the elevated-opponent pairs by controlled lab staging: the same files with only the target lead's
species set to GOLBAT (42) (Attract: gender female, opposite the male Primeape; GOLBAT's gender ratio is 50 % so battle_lab accepts it,
and its Gen 3 ability Inner Focus does not block Attract / sleep / burn). Parties of three, EV totals <= 510, the explicit lab seed kept.
BRN's Fire-secondary path: the Fire Punch burn-lifecycle lab scenario, verbatim.
usage: stq132Stage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, shutil, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
STA = os.path.join(ROOT, "tools/integration/fixtures/sta123/scenarios")
index = {}
ANIM = {"spore": "SLP", "will-o-wisp": "BRN", "attract": "INFATUATION"}
for slug in ("spore", "will-o-wisp", "attract"):
    for side, tag in (("player", "ply"), ("opponent", "opp")):
        name = f"sta123-{slug}-{tag}-primeape-onix.json"
        new = "stq132-" + name[len("sta123-"):]
        shutil.copyfile(os.path.join(STA, name), os.path.join(out, new))
        d = json.load(open(os.path.join(STA, name)))
        index[new] = {"animation": ANIM[slug], "attackerSide": side, "source": f"tools/integration/fixtures/sta123/scenarios/{name}",
                      "seed": d["seed"]}
        print(new)
        other = "opponent" if side == "player" else "player"
        t = d["overrides"]["parties"][other][0]
        assert t["species"] == 95, t
        t["species"] = 42
        if slug == "attract":
            assert d["overrides"]["parties"][side][0]["gender"] == "male"
            t["gender"] = "female"
        for s in ("player", "opponent"):
            for p in d["overrides"]["parties"][s]:
                assert sum(p["evs"].values()) <= 510
        new = f"stq132-{slug}-{tag}-primeape-golbat.json"
        open(os.path.join(out, new), "w").write(json.dumps(d, indent=1) + "\n")
        index[new] = {"animation": ANIM[slug], "attackerSide": side, "source": f"tools/integration/fixtures/sta123/scenarios/{name}",
                      "target": "GOLBAT", "seed": d["seed"]}
        print(new)
# BRN by a Fire move's 10 % secondary: tools/battle-lab/mechanic-fire-punch-burn-lifecycle-off.json verbatim (MAGBY Fire Punch vs WAILMER,
# lab seed 8; the probe forces profile battle-scene-on, where the same seed still burns on turn 1)
src = "tools/battle-lab/mechanic-fire-punch-burn-lifecycle-off.json"
new = "stq132-fire-punch-ply-magby-wailmer.json"
d = json.load(open(os.path.join(ROOT, src)))
for s in ("player", "opponent"):
    for p in d["overrides"]["parties"][s]:
        assert sum(p["evs"].values()) <= 510
shutil.copyfile(os.path.join(ROOT, src), os.path.join(out, new))
index[new] = {"animation": "BRN", "attackerSide": "player", "source": src, "seed": d["seed"], "path": "fire-secondary"}
print(new)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
