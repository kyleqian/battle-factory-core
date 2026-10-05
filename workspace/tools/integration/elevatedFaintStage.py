#!/usr/bin/env python3
"""Stage an elevated-opponent KO (ISSUES #147 faint sink): base tools/battle-lab/mechanic-air-cutter-opponent-golbat-player-chansey.json,
opponent lead level 2 (CHANSEY's Tackle KOs it), species GOLBAT (elevation 8) or ONIX (control).
usage: elevatedFaintStage.py <outdir>  -> <outdir>/{golbat,onix}{,-off}.json (Scene ON / OFF)"""
import json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
for name, species in (("golbat", 42), ("onix", 95)):
    for suffix, profile in (("", "battle-scene-on"), ("-off", "battle-scene-off")):
        sc = json.load(open(f"{ROOT}/tools/battle-lab/mechanic-air-cutter-opponent-golbat-player-chansey.json"))
        sc["profile"] = profile
        opp = sc["overrides"]["parties"]["opponent"][0]
        opp["species"], opp["gender"], opp["level"] = species, "male", 2
        sc["trace"] = {"segments": [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]},
                                    {"frames": 700, "buttons": []}]}
        json.dump(sc, open(f"{out}/{name}{suffix}.json", "w"), separators=(",", ":"))
