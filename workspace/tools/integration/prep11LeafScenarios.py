#!/usr/bin/env python3
"""Part A: Leaf Blade entry-geometry scenarios (attacker x target species) + dense fixtures. Species are INTERNAL ids (species.h)."""
import json, copy
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
base = json.loads((ROOT / "tools/battle-lab/mechanic-leaf-blade-player-sceptile-opponent-onix.json").read_text())
SP = {"SCEPTILE": 279, "NINETALES": 38, "ONIX": 95, "GOLEM": 76, "GRAVELER": 75, "STEELIX": 208, "DUSCLOPS": 356}
HP = {"SCEPTILE": 145, "ONIX": 110, "GOLEM": 155, "NINETALES": 148, "STEELIX": 135}
cases = [("sceptile", "golem"), ("ninetales", "onix"), ("ninetales", "golem"), ("sceptile", "steelix")]
for a, t in cases:
    s = copy.deepcopy(base)
    s["overrides"]["parties"]["player"][0]["species"] = SP[a.upper()]
    s["overrides"]["parties"]["opponent"][0]["species"] = SP[t.upper()]
    name = f"prep11-leaf-blade-player-{a}-opponent-{t}"
    (ROOT / f"tools/battle-lab/{name}.json").write_text(json.dumps(s, separators=(",", ":")) + "\n")
    fx = {"schema": "prep11-adapter-draft/v1", "draft": True, "move": "LEAF_BLADE", "probe": "tools/compare/leafBladeProbe.py",
          "scenario": f"tools/battle-lab/{name}.json",
          "attacker": {"species": a.upper(), "geometry": {"side": "player"}}, "target": {"species": t.upper(), "geometry": {"side": "opponent"}},
          "fieldProfile": {"playerHp": HP[a.upper()], "playerMaxHp": HP[a.upper()], "opponentHp": HP[t.upper()], "opponentMaxHp": HP[t.upper()],
                           "playerGender": "male", "opponentGender": "male"}}
    (ROOT / f"tools/integration/fixtures/prep11/{name}.json").write_text(json.dumps(fx, indent=1) + "\n")
    print(name)
