#!/usr/bin/env python3
"""dt60: Double Team species grid scenarios (battle lab, explicit lab seed; ISSUES #154).

usage: dt60Stage.py <out-dir>
Each scenario is audit 16's no-unit control (ctl-double-team-ply / -opp: the Double Team user faces SNORLAX's Counter, two prompt
cycles) with the Double Team user's lead species / nature / gender replaced by a Factory Double Team set's (battle-frontier-mons.json).
The grid covers both send-out-animation classes of dt60MonAnimData3.py on both sides (docs/dt60-double-team-phase.md P4).
"""
import copy, json, sys
from pathlib import Path

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
BASE = Path("tools/integration/fixtures/audit-16/scenarios")
# (name, side, species id, nature index, gender)
GRID = [
    ("opp-umbreon", "opponent", 197, 5, "male"), ("opp-scyther", "opponent", 123, 3, "male"), ("opp-walrein", "opponent", 343, 24, "male"),
    ("opp-gardevoir", "opponent", 394, 15, "female"), ("opp-clefable", "opponent", 36, 2, "female"),
    ("ply-umbreon", "player", 197, 5, "male"), ("ply-metagross", "player", 400, 3, "genderless"), ("ply-dusclops", "player", 362, 8, "male"),
    ("ply-scyther", "player", 123, 3, "male"), ("ply-shuckle", "player", 213, 23, "male"),
]
for name, side, species, nature, gender in GRID:
    base = json.loads((BASE / ("ctl-double-team-ply.json" if side == "player" else "ctl-double-team-opp.json")).read_text())
    s = copy.deepcopy(base)
    lead = s["overrides"]["parties"][side][0]
    assert lead["moves"] == [104] * 4
    lead.update({"species": species, "nature": nature, "gender": gender})
    (OUT / f"dt60-{name}.json").write_text(json.dumps(s, indent=1) + "\n")
print(len(GRID), "scenarios")
