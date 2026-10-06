#!/usr/bin/env python3
"""prep18: Fury Cutter counter-5/6 scenario: the accepted player scenario (4 turns = bodies with counter 1..4) with two more turn blocks appended
(A / 30 / A / 600 frames each; chosen before probing). Source: furyCutterCounter caps at 5 (battle_script_commands.c:8591), the anim branch is
jumpreteq 1/2/3 else Strongest and direction = counter & 1.   Writes tools/battle-lab/prep18-fury-cutter-six-hits.json."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
s = json.loads((ROOT / "tools/battle-lab/mechanic-fury-cutter-player-grovyle-opponent-blissey.json").read_text())
segs = s["trace"]["segments"]; tail = segs.pop()
for _ in range(2): segs += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 600, "buttons": []}]
segs.append(tail)
(ROOT / "tools/battle-lab/prep18-fury-cutter-six-hits.json").write_text(json.dumps(s, separators=(",", ":")) + "\n")
