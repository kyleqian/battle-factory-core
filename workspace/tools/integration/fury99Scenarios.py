#!/usr/bin/env python3
"""fury99: consecutive Fury Cutter 210 scenarios (counters 1..5) for the counter-2..5 later bodies.

The later58 Fury Cutter bases (both attacker sides; GROVYLE -> BLISSEY and SCYTHER -> GOLEM, each pair on both sides), the FOE lead's moves
replaced by Splash x4 / Growl x4 (the target survives and never damages the user), the trace lengthened to five turns so the user's
Fury Cutter runs at counters 1..5 unless the ROM rolls a miss (the probe reads the counter from RAM). Every scenario carries an EXPLICIT
lab "seed" (the base's own; ISSUES #154). Writes tools/integration/fixtures/fury99/scenarios/.
"""
import json
from pathlib import Path

BASES = [("tools/battle-lab/mechanic-fury-cutter-player-grovyle-opponent-blissey.json", "opponent"),
         ("tools/battle-lab/mechanic-fury-cutter-opponent-grovyle-player-blissey.json", "player"),
         ("tools/battle-lab/prep18-fury-cutter-alt-scyther-golem.json", "opponent"),
         ("tools/battle-lab/prep18-fury-cutter-altopp-scyther-golem.json", "player")]
VARIANTS = (("growl", [45, 45, 45, 45]), ("splash", [150, 150, 150, 150]))
TURNS = 5
OUT = Path("tools/integration/fixtures/fury99/scenarios")
OUT.mkdir(parents=True, exist_ok=True)
for path, foe in BASES:
    base = json.loads(Path(path).read_text())
    assert "seed" in base, path
    atk = "player" if foe == "opponent" else "opponent"
    parts = Path(path).stem.split("-")
    tag = f"{atk[:3]}-{parts[-3]}-{parts[-1]}" if Path(path).stem.startswith("mechanic-") else f"{atk[:3]}-{parts[-2]}-{parts[-1]}"
    for variant, moves in VARIANTS:
        s = json.loads(json.dumps(base))
        s["seed"] = base["seed"]  # explicit lab seed (ISSUES #154)
        s["overrides"]["parties"][foe][0]["moves"] = moves
        seg = []
        for turn in range(TURNS):
            seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]},
                    {"frames": 1300 if turn == TURNS - 1 else 1100, "buttons": []}]
        s["trace"] = {"segments": seg}
        (OUT / f"fury-cutter-{tag}-{variant}.json").write_text(json.dumps(s, indent=1) + "\n")
print(len(list(OUT.glob("*.json"))))
