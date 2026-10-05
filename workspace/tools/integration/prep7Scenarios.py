#!/usr/bin/env python3
"""prep7: derive first-body BattleLab scenarios for moves that have none (Double Team 104, Rock Slide 157, Ice Punch 8) by replacing the
attacker's four Dragon Dance (349) moves of tools/battle-lab/mechanic-dragon-dance-*-dragonair-*.json. Same parties/seed/trace, so the battle entry
(and the known-entry sSpriteOrder) is the corpus entry. usage (from workspace/): python3 tools/integration/prep7Scenarios.py"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "tools/integration/fixtures/prep7-scenarios"; OUT.mkdir(exist_ok=True)
SRC = {"player": "mechanic-dragon-dance-player-dragonair-opponent-onix", "opponent": "mechanic-dragon-dance-opponent-dragonair-player-onix"}
for name, mid in (("double-team", 104), ("rock-slide", 157), ("ice-punch", 8), ("fire-blast", 126)):
    for side, src in SRC.items():
        d = json.loads((ROOT / "tools/battle-lab" / f"{src}.json").read_text())
        party = d["overrides"]["parties"][side][0]
        assert party["moves"] == [349] * 4, party["moves"]
        party["moves"] = [mid] * 4
        (OUT / f"mechanic-{name}-{side}-dragonair-{'onix' if side == 'player' else 'onix'}.json").write_text(json.dumps(d, indent=2) + "\n")
print(sorted(p.name for p in OUT.glob("*.json")))
print(sorted(p.name for p in OUT.glob('*.json')))
