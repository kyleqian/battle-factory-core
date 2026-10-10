#!/usr/bin/env python3
"""flat77 (S10A, evidence only): later-body FLATTER 260 battle-lab stagings. audit19Stage.py's method (battle-lab, explicit lab seed
305420349 = ISSUES #154; FAST lead = the predecessor, SLOW lead = the Flatter consumer), Factory Flatter users only
(src/data/gen/battle-frontier-mons.json: NIDORAN_F / NIDORINA / NIDORINO), both attacker sides, two consumer species:
  tk-*  FAST lead TACKLE 33 (a non-window predecessor), SLOW lead FLATTER: every consumer body is a LATER body (turn 0 after Tackle + its
        hit; later turns after the consumer's own earlier Flatter, the WIN0-writing one). Tackle 33 is NOT in the audited allocator
        net-zero set (liveMoveSpriteAllocator.ts LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS), so these windows are the allocator-unknown shape;
  qa-*  as tk-* with QUICK_ATTACK 98 (a non-window predecessor that IS audited net-zero: the allocator-known later-body shape);
  ff-*  FAST lead FLATTER, SLOW lead FLATTER: the fast lead's turn-0 body is the FIRST body (the control), every other Flatter body of
        either battler is a later body directly after a Flatter.
  ex-*  (batch 2, predictions committed before its probes) the census's own immediate predecessors of the Flatter bodies the temp patch
        lifts (liveShareCensus seeds 0..999): FAST lead LIGHT_SCREEN 113 / MEGA_DRAIN 72 / AERIAL_ACE 332 / BITE 44 / SHOCK_WAVE 351 /
        IRON_DEFENSE 334 / MUD_SLAP 189 (a words order unit: the deferred lend) / ACID 51, one cycle (the consumer's turn-0 later body);
        player side NIDORINA / GOLEM, opponent side NIDORINO / SNORLAX.
Pairs (consumer / fast): NIDORINA 30 / GOLEM 76, NIDORINO 33 / SNORLAX 143 (tk, qa); NIDORINA / NIDORINO, NIDORINO / NIDORINA (ff).
Genders: NIDORINA female-only, NIDORINO male-only.
usage: flat77Stage.py <out-dir>   (the committed set is tools/integration/fixtures/flat77/scenarios/)
"""
import json, sys
from pathlib import Path

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
BASE = json.loads(Path("tools/battle-lab/prep18-return-altopp-snorlax-golem.json").read_text())
M = {"FLATTER": 260, "TACKLE": 33, "QUICK_ATTACK": 98, "LIGHT_SCREEN": 113, "MEGA_DRAIN": 72, "AERIAL_ACE": 332, "BITE": 44,
     "SHOCK_WAVE": 351, "IRON_DEFENSE": 334, "MUD_SLAP": 189, "ACID": 51}
SP = {"NIDORINA": 30, "NIDORINO": 33, "GOLEM": 76, "SNORLAX": 143}
GENDER = {"NIDORINA": "female", "NIDORINO": "male"}


def lead(member: dict, species: str, move: str, fast: bool) -> dict:  # audit19Stage.py's lead() + the fixed-gender Nidos
    m = json.loads(json.dumps(member))
    m.update({"species": SP[species], "moves": [M[move]] * 4, "item": 0, "nature": 3 if fast else 7, "friendship": 70,
              "gender": GENDER.get(species, "male" if fast else "female"), "abilitySlot": 0})
    m["ivs"]["speed"] = 31 if fast else 0
    m["evs"]["speed"] = 0
    return m


def trace(cycles: int) -> dict:
    seg = []
    for _ in range(cycles):
        seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1300, "buttons": []}]
    return {"segments": seg}


def stage(name: str, fast_species: str, fast_move: str, slow_species: str, slow_side: str, cycles: int) -> None:
    s = json.loads(json.dumps(BASE))
    fast_side = "opponent" if slow_side == "player" else "player"
    parties = s["overrides"]["parties"]
    parties[fast_side][0] = lead(parties[fast_side][0], fast_species, fast_move, True)
    parties[slow_side][0] = lead(parties[slow_side][0], slow_species, "FLATTER", False)
    for p in ("player", "opponent"):
        for m in parties[p][1:]:
            m["item"] = 0
    s["trace"] = trace(cycles)
    assert s["seed"] == 305420349
    (OUT / f"{name}.json").write_text(json.dumps(s, indent=1) + "\n")


for side, stag in (("player", "ply"), ("opponent", "opp")):
    stage(f"tk-nidorina-golem-{stag}", "GOLEM", "TACKLE", "NIDORINA", side, 3)
    stage(f"tk-nidorino-snorlax-{stag}", "SNORLAX", "TACKLE", "NIDORINO", side, 3)
    stage(f"qa-nidorina-golem-{stag}", "GOLEM", "QUICK_ATTACK", "NIDORINA", side, 3)
    stage(f"qa-nidorino-snorlax-{stag}", "SNORLAX", "QUICK_ATTACK", "NIDORINO", side, 3)
    stage(f"ff-nidorina-nidorino-{stag}", "NIDORINO", "FLATTER", "NIDORINA", side, 3)
    stage(f"ff-nidorino-nidorina-{stag}", "NIDORINA", "FLATTER", "NIDORINO", side, 3)
for x in ("LIGHT_SCREEN", "MEGA_DRAIN", "AERIAL_ACE", "BITE", "SHOCK_WAVE", "IRON_DEFENSE", "MUD_SLAP", "ACID"):
    stage(f"ex-{x.lower().replace('_', '-')}-nidorina-golem-ply", "GOLEM", x, "NIDORINA", "player", 1)
    stage(f"ex-{x.lower().replace('_', '-')}-nidorino-snorlax-opp", "SNORLAX", x, "NIDORINO", "opponent", 1)
