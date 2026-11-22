#!/usr/bin/env python3
"""chg2: Scene ON two-turn-move labs from the bdt1 Dig labs (same Rattata pair, trace A, 18, A, 1000, A, 18, A, 800): tools/battle-lab/chg2-<move>-{player,opponent}-on.json.
usage: chg2MakeLabs.py [move ...]"""
import json
import sys
from pathlib import Path

lab_dir = Path(__file__).parent.parent / "battle-lab"
MOVES = {"fly": 19, "bounce": 340, "dive": 291, "solarbeam": 76, "razorwind": 13, "skyattack": 143}
for name in sys.argv[1:] or MOVES:
    for side, src in (("player", "bdt1-dig-player-on"), ("opponent", "bdt1-dig-opponent-on")):
        lab = json.load(open(lab_dir / f"{src}.json"))
        mover = lab["overrides"]["parties"][side]
        for m in mover:
            if m["moves"][0] == 91:
                m["moves"] = [MOVES[name]] * 4
        json.dump(lab, open(lab_dir / f"chg2-{name}-{side}-on.json", "w"))
        print(f"chg2-{name}-{side}-on")
