#!/usr/bin/env python3
"""flat84 (S10A, evidence only): Flatter 260 as a WORDS-ORDER unit. flat77Stage.py's method (battle-lab base
prep18-return-altopp-snorlax-golem.json, explicit lab seed 305420349 = ISSUES #154; FAST lead speed IV 31 nature 3, SLOW lead speed IV 0
nature 7), Factory Flatter users NIDORINA 30 (female) / NIDORINO 33 (male), both attacker sides, no held items:
  ff-*  FAST lead FLATTER, SLOW lead FLATTER, 4 cycles: the fast lead's turn-0 body is the FIRST body; every other Flatter body is a LATER
        body directly after a Flatter (+ its STATS_CHANGE / confusion units), several word draws per scenario;
  c-*   FAST lead NIDORINO FLATTER, SLOW lead NIDORINA with a non-Flatter consumer (TACKLE 33 / QUICK_ATTACK 98 / WATER_PULSE 352 /
        MEGA_DRAIN 72 / SPARK 209), 3 cycles: every consumer body after the fast lead's turn-0 Flatter consumes the Flatter order unit
        (Quick Attack +1 moves first: its turn-0 body is a first body, its later bodies follow a Flatter).
  ko-*  (batch 2, staged after batch 1's comparison) FAST lead NIDORINO level 30 (HP EVs 0) FLATTER, SLOW lead SLOWBRO 80 WATER_PULSE
        (EVs hp 255 / spAttack 252), 5 cycles: the turn-0 Water Pulse KOs the Flatter user, the opponent / player sends out its next
        mon, and the next Water Pulse consumes the Flatter unit past the KO + summary + send-out (the words replay's battle units).
usage: flat84Stage.py <out-dir>   (the committed set is tools/integration/fixtures/flat84/scenarios/)
"""
import json, sys
from pathlib import Path

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
BASE = json.loads(Path("tools/battle-lab/prep18-return-altopp-snorlax-golem.json").read_text())
M = {"FLATTER": 260, "TACKLE": 33, "QUICK_ATTACK": 98, "WATER_PULSE": 352, "MEGA_DRAIN": 72, "SPARK": 209}
SP = {"NIDORINA": 30, "NIDORINO": 33, "SLOWBRO": 80}
GENDER = {"NIDORINA": "female", "NIDORINO": "male", "SLOWBRO": "male"}


def lead(member: dict, species: str, move: str, fast: bool) -> dict:  # flat77Stage.py's lead()
    m = json.loads(json.dumps(member))
    m.update({"species": SP[species], "moves": [M[move]] * 4, "item": 0, "nature": 3 if fast else 7, "friendship": 70,
              "gender": GENDER[species], "abilitySlot": 0})
    m["ivs"]["speed"] = 31 if fast else 0
    m["evs"]["speed"] = 0
    return m


def trace(cycles: int) -> dict:
    seg = []
    for _ in range(cycles):
        seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1300, "buttons": []}]
    return {"segments": seg}


def stage(name: str, fast_species: str, fast_move: str, slow_species: str, slow_move: str, slow_side: str, cycles: int) -> None:
    s = json.loads(json.dumps(BASE))
    fast_side = "opponent" if slow_side == "player" else "player"
    parties = s["overrides"]["parties"]
    parties[fast_side][0] = lead(parties[fast_side][0], fast_species, fast_move, True)
    parties[slow_side][0] = lead(parties[slow_side][0], slow_species, slow_move, False)
    for p in ("player", "opponent"):
        for m in parties[p][1:]:
            m["item"] = 0
    s["trace"] = trace(cycles)
    assert s["seed"] == 305420349
    (OUT / f"{name}.json").write_text(json.dumps(s, indent=1) + "\n")


for side, stag in (("player", "ply"), ("opponent", "opp")):
    stage(f"ff-nidorina-nidorino-{stag}", "NIDORINO", "FLATTER", "NIDORINA", "FLATTER", side, 4)
    stage(f"ff-nidorino-nidorina-{stag}", "NIDORINA", "FLATTER", "NIDORINO", "FLATTER", side, 4)
    for x in ("TACKLE", "QUICK_ATTACK", "WATER_PULSE", "MEGA_DRAIN", "SPARK"):
        stage(f"c-{x.lower().replace('_', '-')}-{stag}", "NIDORINO", "FLATTER", "NIDORINA", x, side, 3)

for side, stag in (("player", "ply"), ("opponent", "opp")):  # batch 2: a KO + send-out between the Flatter and its consumer
    s = json.loads(json.dumps(BASE))
    fast_side = "opponent" if side == "player" else "player"
    parties = s["overrides"]["parties"]
    parties[fast_side][0] = lead(parties[fast_side][0], "NIDORINO", "FLATTER", True)
    parties[fast_side][0]["level"] = 30
    parties[fast_side][0]["evs"]["hp"] = 0
    parties[side][0] = lead(parties[side][0], "SLOWBRO", "WATER_PULSE", False)
    parties[side][0]["evs"] = {"hp": 255, "attack": 0, "defense": 0, "speed": 0, "spAttack": 252, "spDefense": 0}
    for p in ("player", "opponent"):
        for m in parties[p][1:]:
            m["item"] = 0
    s["trace"] = trace(5)
    assert s["seed"] == 305420349
    (OUT / f"ko-water-pulse-{stag}.json").write_text(json.dumps(s, indent=1) + "\n")
