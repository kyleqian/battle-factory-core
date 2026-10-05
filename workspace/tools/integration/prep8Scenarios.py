#!/usr/bin/env python3
"""prep8: derive FIRST-BODY BattleLab scenarios for the three allocator-plan-v2 moves whose accepted lab scenario is NOT the battle's first body
(Aurora Beam 62, Horn Drill 32, Stockpile 254: the accepted scenarios run a Tackle/Peck body first, activation probes in prep8-activation/).
The attacker is made the faster side (speed EV 252 / IV 31) and the other side the slower one (speed EV 0 / IV 0); nothing else changes, so the species pair
(renderer gate), parties, seed and trace are the accepted ones.   usage (from workspace/): python3 tools/integration/prep8Scenarios.py"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "tools/integration/fixtures/prep8-scenarios"; OUT.mkdir(exist_ok=True)
SRC = ["aurora-beam-player-seadra-opponent-onix", "aurora-beam-opponent-seadra-player-onix", "horn-drill-player-seaking-opponent-onix", "horn-drill-opponent-seaking-player-onix",
       "stockpile-player-pelipper-opponent-delcatty", "stockpile-opponent-pelipper-player-delcatty"]
for stem in SRC:
    d = json.loads((ROOT / "tools/battle-lab" / f"mechanic-{stem}.json").read_text())
    side = "player" if any(stem.startswith(p + "-player-") for p in ("aurora-beam", "horn-drill", "stockpile")) else "opponent"
    other = "opponent" if side == "player" else "player"
    a, t = d["overrides"]["parties"][side][0], d["overrides"]["parties"][other][0]
    a["evs"]["speed"] = 252; a["ivs"]["speed"] = 31
    t["evs"]["speed"] = 0; t["ivs"]["speed"] = 0
    over = sum(a["evs"].values()) - 510
    if over > 0:  # EV total cap: take the overflow from the attacker's HP EVs (then defense), only bulk changes
        for k in ("hp", "defense", "spDefense"):
            cut = min(over, a["evs"][k]); a["evs"][k] -= cut; over -= cut
    (OUT / f"mechanic-{stem}-firstbody.json").write_text(json.dumps(d, indent=2) + "\n")
    print(stem, "attacker side", side)
