#!/usr/bin/env python3
"""prep30: the fresh species pair for Extrasensory (326) and Psywave (149): ESPEON (196, attacker) vs CROBAT (169, target: elevation 6, front y_offset 0).
Derived from the prep25 alternates (same trace / seed / sets), species swapped, attacker forced first (attacker speed IV 31 / EV 252 (+ 252 SpA, 6 HP) / Hardy,
target speed IV 0 / EV 0 / Brave).  Writes tools/battle-lab/prep30-{extrasensory,psywave}-alt-{player,opponent}-espeon-crobat.json."""
import json
from pathlib import Path
LAB = Path(__file__).resolve().parents[1] / "battle-lab"
for move, mid in (("extrasensory", 326), ("psywave", 149)):
    for side in ("player", "opponent"):
        d = json.loads((LAB / f"prep25-{move}-alt-{side}-alakazam-golem.json").read_text())
        parties = d["overrides"]["parties"]
        att, tgt = (parties["player"], parties["opponent"]) if side == "player" else (parties["opponent"], parties["player"])
        assert att[0]["species"] == 65 and att[0]["moves"][0] == mid and tgt[0]["species"] == 76
        att[0].update(species=196, nature=0); att[0]["ivs"]["speed"] = 31; att[0]["evs"] = {"hp": 6, "attack": 0, "defense": 0, "speed": 252, "spAttack": 252, "spDefense": 0}
        tgt[0].update(species=169, nature=2); tgt[0]["ivs"]["speed"] = 0; tgt[0]["evs"]["speed"] = 0
        (LAB / f"prep30-{move}-alt-{side}-espeon-crobat.json").write_text(json.dumps(d, separators=(",", ":")) + "\n")
        print(f"prep30-{move}-alt-{side}-espeon-crobat")
