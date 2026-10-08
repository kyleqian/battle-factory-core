#!/usr/bin/env python3
"""prep41: fresh Ghost Curse (CurseGhost) scenarios with the Factory's Ghost-type Curse user DUSCLOPS, chosen before probing.
From the prep14 / prep23 GENGAR -> GOLEM templates (both orientations): GENGAR -> DUSCLOPS (speed EV 252 so the Curse body stays the
first body: 77 > GOLEM 65 / SNORLAX 50 at level 50), target GOLEM or SNORLAX (Splash). Writes tools/battle-lab/prep41-curse-ghost-*.json."""
import json
from pathlib import Path

LAB = Path("tools/battle-lab")
TEMPLATES = {"p": LAB / "prep14-curse-ghost-alt-gengar-golem.json", "o": LAB / "prep23-curse-ghost-altopp-gengar-golem.json"}
for side, path in TEMPLATES.items():
    for target, species in (("golem", 76), ("snorlax", 143)):
        d = json.loads(path.read_text())
        parties = d["overrides"]["parties"]
        attacker, defender = (parties["player"], parties["opponent"]) if side == "p" else (parties["opponent"], parties["player"])
        assert attacker[0]["species"] == 94 and attacker[0]["moves"] == [174] * 4 and defender[0]["species"] == 76, path
        attacker[0]["species"] = 362
        attacker[0]["evs"]["speed"] = 252
        defender[0]["species"] = species
        out = LAB / f"prep41-curse-ghost-{side}-dusclops-{target}.json"
        out.write_text(json.dumps(d, separators=(",", ":")) + "\n")
        print(out)
