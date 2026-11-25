#!/usr/bin/env python3
"""wcl1: Scene ON wake-up -> charge labs from wkl1m-wakeup-player-off (Snorlax L50 Rest user vs Rattata L50 Seismic Toss): tools/battle-lab/wcl1-<move>-player-on.json.
Turns 1-3 are the wkl1m Rest turns (Rest, asleep, asleep); turn 4 the user wakes and RIGHT selects slot 1 (the charge move; slots 1-3 all carry it), turn 5 is the forced strike.
usage: makeLabs.py [move ...]"""
import json
import sys
from pathlib import Path

lab_dir = Path(__file__).resolve().parent.parent.parent / "battle-lab"
MOVES = {"dig": 91, "fly": 19, "bounce": 340, "solarbeam": 76, "skullbash": 130, "razorwind": 13}
A = lambda: [{"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}, {"frames": 2, "buttons": ["A"]}]
for name in sys.argv[1:] or MOVES:
    lab = json.load(open(lab_dir / "wkl1m-wakeup-player-off.json"))
    lab["profile"] = "battle-scene-on"
    for m in lab["overrides"]["parties"]["player"]:
        m["moves"] = [156, MOVES[name], MOVES[name], MOVES[name]]
    segs = []
    for _ in range(3):
        segs += A() + [{"frames": 1000, "buttons": []}]
    segs += [{"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}, {"frames": 2, "buttons": ["RIGHT"]}, {"frames": 18, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 2000, "buttons": []}]
    lab["trace"] = {"segments": segs}
    json.dump(lab, open(lab_dir / f"wcl1-{name}-player-on.json", "w"))
    print(f"wcl1-{name}-player-on")
