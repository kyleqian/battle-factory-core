#!/usr/bin/env python3
"""prep36: new Eruption alternates (attacker geometry the prep29 pairs do not cover), derived from the prep29 TORKOAL/GOLEM
scenarios by swapping only the attacker's species in party slot 0 (genders species-legal; everything else unchanged).
  - opponent ONIX attacker (front idle rest x2 = 1, front y_offset 0)
  - opponent WEEZING attacker (enemy elevation 6)
  - player STEELIX attacker (back y_offset 0 -> attacker y 80)
  - player / opponent CAMERUPT (internal species 340, the only Factory Eruption user; the accepted "camerupt" corpora use
    species 323 = BARBOACH): back y_offset 19 -> attacker y 99, front y_offset 9 -> y 49
usage: python3 tools/integration/prep36Scenarios.py   (writes tools/battle-lab/prep36-eruption-alt-*.json)"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LAB = ROOT / "tools/battle-lab"
NEW = [
    ("prep29-eruption-alt-opponent-torkoal-golem.json", "opponent", 95, "male", "prep36-eruption-alt-opponent-onix-golem.json"),
    ("prep29-eruption-alt-opponent-torkoal-golem.json", "opponent", 110, "male", "prep36-eruption-alt-opponent-weezing-golem.json"),
    ("prep29-eruption-alt-player-torkoal-golem.json", "player", 208, "male", "prep36-eruption-alt-player-steelix-golem.json"),
    ("prep29-eruption-alt-player-torkoal-golem.json", "player", 340, "male", "prep36-eruption-alt-player-camerupt-golem.json"),
    ("prep29-eruption-alt-opponent-torkoal-golem.json", "opponent", 340, "male", "prep36-eruption-alt-opponent-camerupt-golem.json"),
    ("prep36-eruption-alt-player-camerupt-golem.json", "opponent", 110, "male", "prep36-eruption-alt-player-camerupt-weezing.json"),
]
for base, side, species, gender, name in NEW:
    data = json.loads((LAB / base).read_text())
    mon = data["overrides"]["parties"][side][0]
    mon["species"], mon["gender"] = species, gender
    (LAB / name).write_text(json.dumps(data, separators=(",", ":")) + "\n")
    print(name)
