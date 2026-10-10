#!/usr/bin/env python3
"""Live audit 20, land75 Part B (a hidden battler's faint): the OPPONENT's two-turn user is KO'd while hidden by a move that hits it,
then its replacement (the base party's member 2, species 372 with RETURN 216) is sent in and both battlers play their next bodies.
audit20Stage.py's lead() (battle-lab, the base scenario's lab seed 305420349 + k, k = 0..2 per pair: Thunder is 70 % accurate);
the FAST opponent lead uses the two-turn move, the SLOW player lead the move that hits it while hidden:
  fly   WINGULL 309 / TAILLOW 304 FLY 19 (0 HP / Def / SpDef EVs) <- AMPHAROS 181 THUNDER 87 (255 SpA / HP EVs);
  dig   JOLTEON 135 / ARBOK 24 DIG 91 (0 HP / Def / SpDef EVs)   <- GOLEM 76 EARTHQUAKE 89 (255 Atk / HP EVs; x2 at a digger).
The player-side KO (the forced party menu) and an end-of-turn KO while hidden are not staged (no HP control in the lab).
usage: audit20PartBStage.py <out-dir>   (the committed set is tools/integration/fixtures/audit-20/partb/scenarios/)
"""
import json, sys
from pathlib import Path

sys.argv = [sys.argv[0], sys.argv[1]]
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
BASE = json.loads(Path("tools/battle-lab/prep18-return-altopp-snorlax-golem.json").read_text())


def lead(member: dict, species: int, move: int, fast: bool, evs: dict) -> dict:  # audit20Stage.py's lead()
    m = json.loads(json.dumps(member))
    m.update({"species": species, "moves": [move] * 4, "item": 0, "nature": 3 if fast else 7, "friendship": 70,
              "gender": "male" if fast else "female", "abilitySlot": 0})
    m["ivs"]["speed"] = 31 if fast else 0
    m["evs"] = {"hp": 0, "attack": 0, "defense": 0, "speed": 0, "spAttack": 0, "spDefense": 0, **evs}
    return m


def trace(cycles: int) -> dict:
    seg = []
    for _ in range(cycles):
        seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1300, "buttons": []}]
    return {"segments": seg}


for kind, users, move, hitter, hit_move, hit_evs in (
        ("fly", ((309, "wingull"), (304, "taillow")), 19, 181, 87, {"hp": 255, "spAttack": 255}),
        ("dig", ((135, "jolteon"), (24, "arbok")), 91, 76, 89, {"hp": 255, "attack": 255})):
    for species, tag in users:
        for k in range(3):
            s = json.loads(json.dumps(BASE))
            parties = s["overrides"]["parties"]
            parties["opponent"][0] = lead(parties["opponent"][0], species, move, True, {})
            parties["player"][0] = lead(parties["player"][0], hitter, hit_move, False, hit_evs)
            for p in ("player", "opponent"):
                for m in parties[p][1:]:
                    m["item"] = 0
                assert sum(parties[p][0]["evs"].values()) <= 510
            s["trace"] = trace(3)
            s["seed"] = 305420349 + k
            (OUT / f"pb-{kind}-{tag}-opp-s{k}.json").write_text(json.dumps(s, indent=1) + "\n")
print("\n".join(sorted(p.name for p in OUT.glob("*.json"))))
