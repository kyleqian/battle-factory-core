#!/usr/bin/env python3
"""Stage Scene-OFF BattleLab scenarios with an elevated opponent (docs/elevated-renderer-off-check.md).
usage: elevatedOffStage.py <outdir> <frames>   -> <outdir>/{golbat,butterfree,onix}.json (profile battle-scene-off)
Base: tools/battle-lab/mechanic-air-cutter-opponent-golbat-player-chansey.json (player CHANSEY tackle x4, opponent GOLBAT air cutter)."""
import json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out, frames = sys.argv[1], int(sys.argv[2])
os.makedirs(out, exist_ok=True)
for name, species in (("golbat", 42), ("butterfree", 12), ("onix", 95)):
    sc = json.load(open(f"{ROOT}/tools/battle-lab/mechanic-air-cutter-opponent-golbat-player-chansey.json"))
    sc["profile"] = "battle-scene-off"
    sc["overrides"]["parties"]["opponent"][0]["species"] = species
    sc["overrides"]["parties"]["opponent"][0]["gender"] = "male"
    sc["trace"] = {"segments": [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]},
                                {"frames": frames, "buttons": []}]}
    json.dump(sc, open(f"{out}/{name}.json", "w"), separators=(",", ":"))
