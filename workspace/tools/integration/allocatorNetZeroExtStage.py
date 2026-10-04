#!/usr/bin/env python3
"""Stage legal ordinary-singles scenarios (both orientations) for moves the first net-zero audit
could not exercise. Template: tools/battle-lab/mechanic-poison-fang-{player,opponent}-zubat-*.json with the
lead carrier swapped (species/moves in all four slots). Carriers are Battle Factory pool species that
carry the move in battle_frontier_mons.h. Output: fixtures/allocator-net-zero-ext-scenarios/.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "tools/integration/fixtures/allocator-net-zero-ext-scenarios"
TPL = {"player": ROOT / "tools/battle-lab/mechanic-poison-fang-player-zubat-opponent-onix.json",
       "opponent": ROOT / "tools/battle-lab/mechanic-poison-fang-opponent-zubat-player-onix.json"}
# move id -> (slug, carrier species id, carrier slug)
MOVES = {41: ("twineedle", 15, "beedrill"), 44: ("bite", 330, "carvanha"), 158: ("hyper-fang", 20, "raticate"),
         162: ("super-fang", 20, "raticate"), 325: ("shadow-punch", 93, "haunter")}
for mid, (slug, sp, cs) in MOVES.items():
    for side, tpl in TPL.items():
        d = json.loads(tpl.read_text())
        mon = d["overrides"]["parties"][side][0]
        assert mon["species"] == 41 and mon["moves"] == [305] * 4
        mon["species"], mon["moves"], mon["gender"] = sp, [mid] * 4, "male"
        other = "onix" if True else ""
        name = f"allocator-ext-{slug}-{side}-{cs}-{'opponent' if side == 'player' else 'player'}-onix.json"
        (OUT / name).write_text(json.dumps(d, indent=2) + "\n")
        print(name)
