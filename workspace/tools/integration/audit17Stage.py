#!/usr/bin/env python3
"""Live audit 17 (S10A side lane): routes made live LATE this session that audit 16 did not reach.
  P1 fly63: Fly 19 / Bounce 340 (SNORLAX, faster) -> an order consumer on CHANSEY (slower). Turn 1: setup (SNORLAX hidden; a Thunderbolt /
     Ice Beam at it misses: no body; Heal Bell / Double Team play while it is hidden; Sky Uppercut 327 HITS the hidden Fly user). Turn 2:
     the UNLEASH, then the consumer right after it. No-unit controls: SNORLAX uses Counter (fails, no body).
  P2 dt60: Double Team at Factory Double Team users NOT in dt60's grid (audit 16's ctl-double-team-ply / -opp with the lead's species /
     nature / gender replaced by the Factory set's; audit17Dt60Predict.ts records the generated table's class before the probes).
usage: audit17Stage.py <out-dir>   (the committed set is tools/integration/fixtures/audit-17/scenarios/)
Every scenario keeps an explicit lab seed (ISSUES #154): audit 16's base seed 305420349.
"""
import copy, json, sys
from pathlib import Path

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
BASE = json.loads(Path("tools/battle-lab/prep18-return-altopp-snorlax-golem.json").read_text())
A16 = Path("tools/integration/fixtures/audit-16/scenarios")
MOVES = {"FLY": 19, "BOUNCE": 340, "COUNTER": 68, "THUNDERBOLT": 85, "ICE_BEAM": 58, "HEAL_BELL": 215, "DOUBLE_TEAM": 104, "SKY_UPPERCUT": 327}
CHAINS = {}
for unit, utag in (("FLY", "fly"), ("BOUNCE", "bounce"), ("COUNTER", "ctl")):
    for consumer, ctag in (("THUNDERBOLT", "thunderbolt"), ("ICE_BEAM", "ice-beam"), ("HEAL_BELL", "heal-bell"), ("DOUBLE_TEAM", "double-team"),
                           ("SKY_UPPERCUT", "sky-uppercut")):
        for side, stag in (("player", "ply"), ("opponent", "opp")):
            CHAINS[f"{utag}-{ctag}-{stag}"] = (unit, consumer, side, 2 if unit == "COUNTER" else 4)


def lead(member: dict, species: int, move: int, fast: bool) -> dict:  # audit16Stage.py's lead()
    m = json.loads(json.dumps(member))
    m.update({"species": species, "moves": [move] * 4, "item": 0, "nature": 3 if fast else 7, "friendship": 70,
              "gender": "male" if fast else "female"})
    m["ivs"]["speed"] = 31 if fast else 0
    m["evs"]["speed"] = 0
    return m


def trace(cycles: int) -> dict:
    seg = []
    for _ in range(cycles):
        seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1300, "buttons": []}]
    return {"segments": seg}


for name, (unit, consumer, side, cycles) in CHAINS.items():
    s = json.loads(json.dumps(BASE))
    other = "opponent" if side == "player" else "player"
    parties = s["overrides"]["parties"]
    parties[other][0] = lead(parties[other][0], 143, MOVES[unit], True)
    parties[side][0] = lead(parties[side][0], 113, MOVES[consumer], False)
    for p in ("player", "opponent"):
        for m in parties[p][1:]:
            m["item"] = 0
    s["trace"] = trace(cycles)
    assert s["seed"] == 305420349
    (OUT / f"{name}.json").write_text(json.dumps(s, indent=1) + "\n")
# P2: (name, side, species id, nature index, gender) — Factory Double Team sets outside dt60's grid (see audit17Dt60Predict.ts)
GRID = json.loads(Path("tools/integration/fixtures/audit-17/dt60-grid.json").read_text())["grid"] if Path("tools/integration/fixtures/audit-17/dt60-grid.json").exists() else []
for g in GRID:
    base = json.loads((A16 / ("ctl-double-team-ply.json" if g["side"] == "player" else "ctl-double-team-opp.json")).read_text())
    s = copy.deepcopy(base)
    ld = s["overrides"]["parties"][g["side"]][0]
    assert ld["moves"] == [104] * 4 and s["seed"] == 305420349
    ld.update({"species": g["speciesId"], "nature": g["nature"], "gender": g["gender"]})
    (OUT / f"dt-{g['side'][:3]}-{g['species'].lower()}.json").write_text(json.dumps(s, indent=1) + "\n")
print("\n".join(sorted(p.name for p in OUT.glob("*.json"))))
