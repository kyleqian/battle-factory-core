#!/usr/bin/env python3
"""Write tools/battle-lab/<AUD242_LAB_PREFIX, default aud242b>-<name>-on.json from the aud242a lab template: player slot 0 (Lv50 when `player`, else Lv12) and
opponent slot 0 each use one move; the attacker side under test is Lv50. Usage: makeAud242bLabs.py name:side:moveId[:attackerSpecies:otherSpecies] ... (species ids; default the template's)."""
import copy, json, os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PREFIX = os.environ.get("AUD242_LAB_PREFIX", "aud242b")
template = json.loads((ROOT / "tools/battle-lab/aud242a-ember-player-on.json").read_text())
for arg in sys.argv[1:]:
    name, side, move, *species = arg.split(":")
    lab = copy.deepcopy(template)
    parties = lab["overrides"]["parties"]
    under, other = ("player", "opponent") if side == "player" else ("opponent", "player")
    parties[under][0]["level"], parties[other][0]["level"] = 50, 12
    parties[under][0]["moves"] = [int(move)] * 4
    parties[other][0]["moves"] = [69] * 4
    if species:
        parties[under][0]["species"], parties[other][0]["species"] = int(species[0]), int(species[1])
    (ROOT / f"tools/battle-lab/{PREFIX}-{name}-{side}-on.json").write_text(json.dumps(lab) + "\n")
    print(name, side, move)
