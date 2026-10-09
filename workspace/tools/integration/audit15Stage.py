#!/usr/bin/env python3
"""Live audit 15 (S10A side lane): CHAIN scenarios — a UNIT (a history that tonight's folds made lend a known order / allocator host) on one
side, then a CONSUMER (a live adapter) on the other side, in the same or a later prompt cycle; plus no-unit CONTROLS (the consumer as the
battle's first body: the unit replaced by Counter, which fails against a non-physical consumer and plays no body).

usage: audit15Stage.py <out-dir>     (writes <out-dir>/<name>.json; the committed set is tools/integration/fixtures/audit-15/scenarios/)
Base: tools/battle-lab/prep18-return-altopp-snorlax-golem.json (battle-lab mechanicLab, Scene ON profile; the ROM computes every outcome).
Leads: the UNIT side is SNORLAX (speed IV 31, Adamant: speed 50), the CONSUMER side CHANSEY (speed IV/EV 0, Relaxed: speed 49), so the
unit moves first each turn; every lead knows one move x4 (no choice), items 0 (no end-turn item animations). 3 prompt cycles per scenario.
"""
import json, sys
from pathlib import Path

BASE = json.loads(Path("tools/battle-lab/prep18-return-altopp-snorlax-golem.json").read_text())
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
MOVES = {"WILL_O_WISP": 261, "FLAMETHROWER": 53, "HYDRO_PUMP": 56, "FIRE_SPIN": 83, "PETAL_DANCE": 80, "DIG": 91, "DOUBLE_TEAM": 104,
         "LIGHT_SCREEN": 113, "ICE_BEAM": 58, "REFLECT": 115, "FAINT_ATTACK": 185, "COUNTER": 68, "SWIFT": 129, "THUNDERBOLT": 85}
# name: (unit move, consumer move, consumer side)
CHAINS = {
    "brn-flamethrower-ply": ("WILL_O_WISP", "FLAMETHROWER", "player"),
    "brn-flamethrower-opp": ("WILL_O_WISP", "FLAMETHROWER", "opponent"),
    "hydro-pump-flamethrower-ply": ("HYDRO_PUMP", "FLAMETHROWER", "player"),
    "hydro-pump-flamethrower-opp": ("HYDRO_PUMP", "FLAMETHROWER", "opponent"),
    "fire-spin-flamethrower-ply": ("FIRE_SPIN", "FLAMETHROWER", "player"),
    "petal-dance-flamethrower-ply": ("PETAL_DANCE", "FLAMETHROWER", "player"),
    "dig-flamethrower-ply": ("DIG", "FLAMETHROWER", "player"),
    "double-team-light-screen-ply": ("DOUBLE_TEAM", "LIGHT_SCREEN", "player"),
    "double-team-light-screen-opp": ("DOUBLE_TEAM", "LIGHT_SCREEN", "opponent"),
    "ice-beam-reflect-ply": ("ICE_BEAM", "REFLECT", "player"),
    "faint-attack-light-screen-ply": ("FAINT_ATTACK", "LIGHT_SCREEN", "player"),
    "swift-thunderbolt-ply": ("SWIFT", "THUNDERBOLT", "player"),
    # controls: the consumer is the battle's first body (Counter fails: no body)
    "ctl-flamethrower-ply": ("COUNTER", "FLAMETHROWER", "player"),
    "ctl-flamethrower-opp": ("COUNTER", "FLAMETHROWER", "opponent"),
    "ctl-light-screen-ply": ("COUNTER", "LIGHT_SCREEN", "player"),
    "ctl-light-screen-opp": ("COUNTER", "LIGHT_SCREEN", "opponent"),
    "ctl-reflect-ply": ("COUNTER", "REFLECT", "player"),
    "ctl-thunderbolt-ply": ("COUNTER", "THUNDERBOLT", "player"),
}


def lead(member: dict, species: int, move: int, fast: bool) -> dict:
    m = json.loads(json.dumps(member))
    m.update({"species": species, "moves": [move] * 4, "item": 0, "nature": 3 if fast else 7, "friendship": 70,
              "gender": "male" if fast else "female"})  # CHANSEY is female-only
    m["ivs"]["speed"] = 31 if fast else 0
    m["evs"]["speed"] = 0
    return m


for name, (unit, consumer, side) in CHAINS.items():
    s = json.loads(json.dumps(BASE))
    other = "opponent" if side == "player" else "player"
    parties = s["overrides"]["parties"]
    parties[other][0] = lead(parties[other][0], 143, MOVES[unit], True)   # SNORLAX: the unit side, faster
    parties[side][0] = lead(parties[side][0], 113, MOVES[consumer], False)  # CHANSEY: the consumer side
    for p in ("player", "opponent"):
        for m in parties[p][1:]:
            m["item"] = 0
    seg = []
    for turn in range(3):
        seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]},
                {"frames": 1300, "buttons": []}]
    s["trace"] = {"segments": seg}
    (OUT / f"{name}.json").write_text(json.dumps(s, indent=1) + "\n")
print("\n".join(sorted(p.name for p in OUT.glob("*.json"))))
