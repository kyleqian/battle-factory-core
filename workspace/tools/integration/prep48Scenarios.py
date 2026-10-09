#!/usr/bin/env python3
"""prep48: Dig + Return later-body lab scenarios (Scene ON, mechanicLab parties; written to tools/integration/fixtures/prep48/scenarios/).

Bases = the accepted prep18 Dig scenarios (both attacker sides, VIBRAVA/CHANSEY and FLYGON/GOLEM). Each runs four turns of Dig x4
(setup, unleash, setup, unleash) so the second setup / unleash are LATER bodies after real preceding units:
  first4: the foe keeps Growl x4 (the Dig user is faster): setup 1 is the battle's first body; turn 2 = unleash, then the foe's Growl body
          + its stat-down body; setup 2 follows them (and the own unleash).
  qa4:    the foe uses Quick Attack x4 (priority +1): its body + hit blip precede setup 1 and setup 2 (a damaging later-body history).
The ROM computes every outcome; only the foe lead's move list changes. Trace: 4 x (A, 30, A, wait).
"""
import json
from pathlib import Path

BASES = {
    "opp-vibrava-chansey": ("tools/battle-lab/mechanic-dig-opponent-vibrava-player-chansey.json", "player"),
    "ply-vibrava-chansey": ("tools/battle-lab/mechanic-dig-player-vibrava-opponent-chansey.json", "opponent"),
    "opp-flygon-golem": ("tools/battle-lab/prep18-dig-altopp-flygon-golem.json", "player"),
    "ply-flygon-golem": ("tools/battle-lab/prep18-dig-alt-flygon-golem.json", "opponent"),
}
OUT = Path("tools/integration/fixtures/prep48/scenarios")
OUT.mkdir(parents=True, exist_ok=True)
for name, (path, foe) in BASES.items():
    base = json.loads(Path(path).read_text())
    for variant, moves in (("first4", None), ("qa4", [98, 98, 98, 98])):
        s = json.loads(json.dumps(base))
        if moves:
            s["overrides"]["parties"][foe][0]["moves"] = moves
        seg = []
        for turn in range(4):
            seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]},
                    {"frames": 1400 if turn == 3 else 1100, "buttons": []}]
        s["trace"] = {"segments": seg}
        (OUT / f"dig-{name}-{variant}.json").write_text(json.dumps(s, indent=1) + "\n")
# Return (216, strongest branch, friendship 255): the accepted DRAGONAIR/ONIX and SNORLAX/GOLEM scenarios (both attacker sides), three
# turns of Return x4. The foe's lead moves: x3 = the accepted Splash x4 (Return 1 is the battle's first body; Returns 2-3 follow the foe's
# Splash and the own Return), growl3 = Growl x4 (Return 2-3 follow a Growl body + its stat-down body), qa3 = Quick Attack x4 (every
# Return follows the foe's damaging body + hit).
RETURN_BASES = {
    "opp-dragonair-onix": ("tools/battle-lab/mechanic-return-opponent-dragonair-player-onix.json", "player"),
    "ply-dragonair-onix": ("tools/battle-lab/mechanic-return-player-dragonair-opponent-onix.json", "opponent"),
    "opp-snorlax-golem": ("tools/battle-lab/prep18-return-altopp-snorlax-golem.json", "player"),
    "ply-snorlax-golem": ("tools/battle-lab/prep18-return-alt-snorlax-golem.json", "opponent"),
}
for name, (path, foe) in RETURN_BASES.items():
    base = json.loads(Path(path).read_text())
    for variant, moves in (("x3", None), ("growl3", [45, 45, 45, 45]), ("qa3", [98, 98, 98, 98])):
        s = json.loads(json.dumps(base))
        if moves:
            s["overrides"]["parties"][foe][0]["moves"] = moves
        seg = []
        for turn in range(3):
            seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]},
                    {"frames": 1200 if turn == 2 else 1000, "buttons": []}]
        s["trace"] = {"segments": seg}
        (OUT / f"return-{name}-{variant}.json").write_text(json.dumps(s, indent=1) + "\n")
print(sorted(p.name for p in OUT.glob("*.json")))
