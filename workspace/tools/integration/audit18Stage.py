#!/usr/bin/env python3
"""Live audit 18 (S10A side lane): the live claims of this morning's folds (hide66, fly63 re-land, sw67, land68).
  H  hidden span (hide66): a semi-invulnerable unit (Fly 19 / Bounce 340 / Dig 91 / Dive 291) on the FAST lead (SNORLAX or GOLEM, the hider),
     a consumer on the SLOW lead (CHANSEY): Safeguard / Wish / Bulk Up / Rest / Iron Defense / Sandstorm (every unit), Dig / Earthquake (Dig
     unit), Light Screen / Ice Beam / Double Team (Dive unit: order-dependent consumers in the hidden span and after the unleash).
     Turn 1 the hider charges (hidden), the consumer plays in the hidden span; turn 2 the strike, the consumer after it; and so on.
  C  no-unit controls: SNORLAX uses Counter (fails: no body) — Rest's control uses Tackle (Rest needs damage first).
  S  Shock Wave 351 (sw67) on the FAST lead (MAGNETON 82 / CASTFORM 385: both sides' geometry classes), consumers on the slow lead: Water
     Pulse / Light Screen / Thunderbolt (CHANSEY) and a second Shock Wave (MAGNEMITE 81 / MAGNETON 82, Factory Shock Wave users).
  F  SUBSTITUTE_FADE (land68): ALAKAZAM (fast) Ice Beam breaks the slow lead's (PIKACHU / SNORLAX) Substitute; the next body of either
     battler after the fade is a window (PIKACHU is KOed right after: the census' KO + switch shape, UNMODELLED after the faint).
usage: audit18Stage.py <out-dir>   (the committed set is tools/integration/fixtures/audit-18/scenarios/)
Every scenario keeps an explicit lab seed (ISSUES #154): audit 16 / 17's base seed 305420349.
"""
import json, sys
from pathlib import Path

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
BASE = json.loads(Path("tools/battle-lab/prep18-return-altopp-snorlax-golem.json").read_text())
M = {"FLY": 19, "BOUNCE": 340, "DIG": 91, "DIVE": 291, "COUNTER": 68, "TACKLE": 33, "SAFEGUARD": 219, "WISH": 273, "BULK_UP": 339, "REST": 156,
     "IRON_DEFENSE": 334, "SANDSTORM": 201, "EARTHQUAKE": 89, "LIGHT_SCREEN": 113, "ICE_BEAM": 58, "DOUBLE_TEAM": 104, "SHOCK_WAVE": 351,
     "WATER_PULSE": 352, "THUNDERBOLT": 85, "SUBSTITUTE": 164}
SP = {"SNORLAX": 143, "GOLEM": 76, "CHANSEY": 113, "MAGNETON": 82, "MAGNEMITE": 81, "CASTFORM": 385, "ALAKAZAM": 65, "PIKACHU": 25}
GENDERLESS = {81, 82}  # MON_GENDERLESS: the lab rejects a gender for MAGNEMITE / MAGNETON
tag = lambda s: s.lower().replace("_", "-")


def lead(member: dict, species: int, move: int, fast: bool) -> dict:  # audit16Stage.py / audit17Stage.py's lead()
    m = json.loads(json.dumps(member))
    m.update({"species": species, "moves": [move] * 4, "item": 0, "nature": 3 if fast else 7, "friendship": 70,
              "gender": "male" if fast else "female"})
    if species in GENDERLESS:
        m.pop("gender")
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
    parties[fast_side][0] = lead(parties[fast_side][0], SP[fast_species], M[fast_move], True)
    parties[slow_side][0] = lead(parties[slow_side][0], SP[slow_species], M[slow_move], False)
    for p in ("player", "opponent"):
        for m in parties[p][1:]:
            m["item"] = 0
    s["trace"] = trace(cycles)
    assert s["seed"] == 305420349
    (OUT / f"{name}.json").write_text(json.dumps(s, indent=1) + "\n")


EVERY = ["SAFEGUARD", "WISH", "BULK_UP", "REST", "IRON_DEFENSE", "SANDSTORM"]
EXTRA = {"FLY": [], "BOUNCE": [], "DIG": ["DIG", "EARTHQUAKE"], "DIVE": ["LIGHT_SCREEN", "ICE_BEAM", "DOUBLE_TEAM"]}
for side, stag in (("player", "ply"), ("opponent", "opp")):
    for unit in ("FLY", "BOUNCE", "DIG", "DIVE"):
        for hider in ("SNORLAX", "GOLEM"):
            for c in EVERY + EXTRA[unit]:
                stage(f"{tag(unit)}-{tag(hider)}-{tag(c)}-{stag}", hider, unit, "CHANSEY", c, side, 6 if c == "REST" else 4)
    for c in EVERY + ["DIG", "EARTHQUAKE", "LIGHT_SCREEN", "ICE_BEAM", "DOUBLE_TEAM", "WATER_PULSE", "THUNDERBOLT"]:
        stage(f"ctl-snorlax-{tag(c)}-{stag}", "SNORLAX", "TACKLE" if c == "REST" else "COUNTER", "CHANSEY", c, side, 6 if c == "REST" else 4)
    stage(f"ctl-snorlax-shock-wave-{stag}", "SNORLAX", "COUNTER", "MAGNEMITE", "SHOCK_WAVE", side, 3)
    for user, second in (("MAGNETON", "MAGNEMITE"), ("CASTFORM", "MAGNETON")):
        for c in ("WATER_PULSE", "LIGHT_SCREEN", "THUNDERBOLT"):
            stage(f"sw-{tag(user)}-{tag(c)}-{stag}", user, "SHOCK_WAVE", "CHANSEY", c, side, 3)
        stage(f"sw-{tag(user)}-shock-wave-{stag}", user, "SHOCK_WAVE", second, "SHOCK_WAVE", side, 3)
    for owner in ("PIKACHU", "SNORLAX"):
        stage(f"sub-{tag(owner)}-{stag}", "ALAKAZAM", "ICE_BEAM", owner, "SUBSTITUTE", side, 5)
print("\n".join(sorted(p.name for p in OUT.glob("*.json"))))
