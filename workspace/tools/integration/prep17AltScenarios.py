#!/usr/bin/env python3
"""prep17: two more Meteor Mash alternates, chosen BEFORE probing (never by output): (A2) accepted player METANG attacker -> GOLEM target
(target species only); (A3) the prep12 pair reversed: player attacker GOLEM(76) -> SHIFTRY(300) target (opponent-attacker SHIFTRY->GOLEM was tried first and
the opponent never selected Meteor Mash, so no body: not used). Writes tools/integration/fixtures/prep17/scenarios/*.json (new files)."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
LAB = ROOT / "tools/battle-lab"
OUT = ROOT / "tools/integration/fixtures/prep17/scenarios"; OUT.mkdir(parents=True, exist_ok=True)
pm = json.loads((LAB / "mechanic-meteor-mash-player-metang-opponent-onix.json").read_text())
om = json.loads((LAB / "mechanic-meteor-mash-opponent-metang-player-onix.json").read_text())
a2 = json.loads(json.dumps(pm)); a2["overrides"]["parties"]["opponent"][0]["species"] = 76
a3 = json.loads(json.dumps(pm)); a3["overrides"]["parties"]["player"][0].update(species=76, gender="male"); a3["overrides"]["parties"]["opponent"][0].update(species=300, gender="male")
for n, s in (("meteor-mash-alt2-player-metang-opponent-golem", a2), ("meteor-mash-alt3-player-golem-opponent-shiftry", a3)):
    (OUT / f"{n}.json").write_text(json.dumps(s, separators=(",", ":")) + "\n")
