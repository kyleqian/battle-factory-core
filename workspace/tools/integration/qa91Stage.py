#!/usr/bin/env python3
"""qa91: opponent-side Quick Attack 98 controls (audit 21 dropped its one opponent control: probe crash), staged exactly as
audit21Stage.py's `qa` family (its lead() / trace() / stage(), the base recipe and the explicit lab seed 305420349, ISSUES #154): the slow
lead (consumer side) uses QUICK_ATTACK, the fast lead SHOCK_WAVE. The OPPONENT attacks with Quick Attack; the player-side target's x2 rest
is 0 for every species (back sprites), so production's targetBaseX2 must stay 0 on all of these.
usage: qa91Stage.py <out-dir>
"""
import json, sys
from pathlib import Path

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
BASE = json.loads(Path("tools/battle-lab/prep18-return-altopp-snorlax-golem.json").read_text())
M = {"SHOCK_WAVE": 351, "QUICK_ATTACK": 98}
SP = {"SNORLAX": 143, "NIDORINA": 30, "NIDORINO": 33, "PERSIAN": 53, "PIDGEOTTO": 17, "ONIX": 95}


def lead(member: dict, species: int, move: int, fast: bool) -> dict:  # audit21Stage.py's lead()
    m = json.loads(json.dumps(member))
    m.update({"species": species, "moves": [move] * 4, "item": 0, "nature": 3 if fast else 7, "friendship": 70,
              "gender": "male" if fast else "female", "abilitySlot": 0})
    m["ivs"]["speed"] = 31 if fast else 0
    m["evs"]["speed"] = 0
    return m


def trace(cycles: int) -> dict:
    seg = []
    for _ in range(cycles):
        seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1300, "buttons": []}]
    return {"segments": seg}


def stage(name: str, fast_species: str, slow_species: str, slow_side: str, cycles: int = 3) -> None:
    s = json.loads(json.dumps(BASE))
    fast_side = "opponent" if slow_side == "player" else "player"
    parties = s["overrides"]["parties"]
    parties[fast_side][0] = lead(parties[fast_side][0], SP[fast_species], M["SHOCK_WAVE"], True)
    parties[slow_side][0] = lead(parties[slow_side][0], SP[slow_species], M["QUICK_ATTACK"], False)
    for p in ("player", "opponent"):
        for m in parties[p][1:]:
            m["item"] = 0
        for m in parties[p]:
            assert sum(m["evs"].values()) <= 510
    s["trace"] = trace(cycles)
    assert s["seed"] == 305420349
    (OUT / f"{name}.json").write_text(json.dumps(s, indent=1) + "\n")


# opponent attacker -> player target (prep7's original orientation PIDGEOTTO -> ONIX first)
stage("qa91-qa-opp-pidgeotto-onix", "ONIX", "PIDGEOTTO", "opponent")
stage("qa91-qa-opp-persian-snorlax", "SNORLAX", "PERSIAN", "opponent")
# the cross pairs: the attacker / target of PERSIAN -> SNORLAX's pre-existing 1 px (age 9) row separated
stage("qa91-qa-opp-pidgeotto-snorlax", "SNORLAX", "PIDGEOTTO", "opponent")
stage("qa91-qa-opp-persian-onix", "ONIX", "PERSIAN", "opponent")
# Dropped: an opponent NIDORINO -> NIDORINA (audit 21's crashed control) and an opponent ONIX attacker -> NIDORINA both crash the direct
# probe process (exit 139, no output) on two runs each, as audit 21 recorded.
