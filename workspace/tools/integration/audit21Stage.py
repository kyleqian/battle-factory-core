#!/usr/bin/env python3
"""Live audit 21 (S10A side lane): battle-lab scenarios (explicit lab seed 305420349, ISSUES #154), cast83Stage.py's method (FAST lead acts
first, SLOW lead = the consumer whose MOVE bodies are the windows; 3 A-A cycles). Families (names: a21-<family>-...):
  cn   the cast83 normal-form residual bodies re-measured (CASTFORM in its NORMAL form; the fast lead uses SHOCK_WAVE 351, as c83-ctl-*):
       EMBER 52 / FLAMETHROWER 53 by CASTFORM vs SNORLAX 143 (big picture) / AZURILL 350 (small), both sides; SCARY_FACE 184 AT CASTFORM by
       SNORLAX / AZURILL, both sides;
  cx   the non-Castform controls of similar geometry: HOPPIP 187 (small, elevated on the opponent side, like CASTFORM) in CASTFORM's place
       with cast83's own opposing species (CROBAT / MANTINE for Ember, GOLBAT / MANTINE for Flamethrower, GOLBAT / LAPRAS for Scary Face);
  iw   Icy Wind 196: the normal-form control (CASTFORM normal, fast lead SHOCK_WAVE) by / at CASTFORM, and the rain control with NO
       CASTFORM (HOPPIP in its place; the fast lead sets RAIN_DANCE 240).
Speeds: lead() gives the FAST lead IV 31 + a neutral nature, the SLOW lead IV 0 + Relaxed (cast83Stage.py's lead()).
usage: audit21Stage.py <out-dir>   (the committed set is tools/integration/fixtures/audit-21/scenarios/)
"""
import json, sys
from pathlib import Path

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
BASE = json.loads(Path("tools/battle-lab/prep18-return-altopp-snorlax-golem.json").read_text())
M = {"SUNNY_DAY": 241, "RAIN_DANCE": 240, "HAIL": 258, "EMBER": 52, "ICY_WIND": 196, "SHOCK_WAVE": 351, "FLAMETHROWER": 53, "SCARY_FACE": 184}
SP = {"CASTFORM": 385, "CROBAT": 169, "GOLBAT": 42, "LAPRAS": 131, "MANTINE": 226, "SNORLAX": 143, "AZURILL": 350, "HOPPIP": 187}
tag = lambda s: s.lower().replace("_", "-")


def lead(member: dict, species: int, move: int, fast: bool) -> dict:  # cast83Stage.py's lead()
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


def stage(name: str, fast_species: str, fast_move: str, slow_species: str, slow_move: str, slow_side: str, cycles: int = 3) -> None:
    s = json.loads(json.dumps(BASE))
    fast_side = "opponent" if slow_side == "player" else "player"
    parties = s["overrides"]["parties"]
    parties[fast_side][0] = lead(parties[fast_side][0], SP[fast_species], M[fast_move], True)
    parties[slow_side][0] = lead(parties[slow_side][0], SP[slow_species], M[slow_move], False)
    for p in ("player", "opponent"):
        for m in parties[p][1:]:
            m["item"] = 0
        for m in parties[p]:
            assert sum(m["evs"].values()) <= 510
    s["trace"] = trace(cycles)
    assert s["seed"] == 305420349
    (OUT / f"{name}.json").write_text(json.dumps(s, indent=1) + "\n")


# cn: CASTFORM (normal form) by Ember / Flamethrower, at Scary Face, vs two more opposing species
for other in ("SNORLAX", "AZURILL"):
    for move in ("EMBER", "FLAMETHROWER"):
        stage(f"a21-cn-{tag(move)}-by-cfply-{tag(other)}", other, "SHOCK_WAVE", "CASTFORM", move, "player")
        stage(f"a21-cn-{tag(move)}-by-cfopp-{tag(other)}", other, "SHOCK_WAVE", "CASTFORM", move, "opponent")
    stage(f"a21-cn-scary-face-at-cfply-{tag(other)}", "CASTFORM", "SHOCK_WAVE", other, "SCARY_FACE", "opponent")
    stage(f"a21-cn-scary-face-at-cfopp-{tag(other)}", "CASTFORM", "SHOCK_WAVE", other, "SCARY_FACE", "player")
# cx: HOPPIP in CASTFORM's place, cast83's c83-ctl-* opposing species
stage("a21-cx-ember-by-hpply-crobat", "CROBAT", "SHOCK_WAVE", "HOPPIP", "EMBER", "player")
stage("a21-cx-ember-by-hpopp-mantine", "MANTINE", "SHOCK_WAVE", "HOPPIP", "EMBER", "opponent")
stage("a21-cx-flamethrower-by-hpply-golbat", "GOLBAT", "SHOCK_WAVE", "HOPPIP", "FLAMETHROWER", "player")
stage("a21-cx-flamethrower-by-hpopp-mantine", "MANTINE", "SHOCK_WAVE", "HOPPIP", "FLAMETHROWER", "opponent")
stage("a21-cx-scary-face-at-hpply-golbat", "HOPPIP", "SHOCK_WAVE", "GOLBAT", "SCARY_FACE", "opponent")
stage("a21-cx-scary-face-at-hpopp-lapras", "HOPPIP", "SHOCK_WAVE", "LAPRAS", "SCARY_FACE", "player")
# iw: Icy Wind normal-form control (CASTFORM normal) and the rain control without CASTFORM
stage("a21-iw-normal-by-cfply-golbat", "GOLBAT", "SHOCK_WAVE", "CASTFORM", "ICY_WIND", "player")
stage("a21-iw-normal-by-cfopp-mantine", "MANTINE", "SHOCK_WAVE", "CASTFORM", "ICY_WIND", "opponent")
stage("a21-iw-normal-at-cfply-golbat", "CASTFORM", "SHOCK_WAVE", "GOLBAT", "ICY_WIND", "opponent")
stage("a21-iw-normal-at-cfopp-lapras", "CASTFORM", "SHOCK_WAVE", "LAPRAS", "ICY_WIND", "player")
stage("a21-iw-rain-by-hpply-golbat", "GOLBAT", "RAIN_DANCE", "HOPPIP", "ICY_WIND", "player")
stage("a21-iw-rain-by-hpopp-mantine", "MANTINE", "RAIN_DANCE", "HOPPIP", "ICY_WIND", "opponent")
stage("a21-iw-rain-at-hpply-golbat", "HOPPIP", "RAIN_DANCE", "GOLBAT", "ICY_WIND", "opponent")
stage("a21-iw-rain-at-hpopp-lapras", "HOPPIP", "RAIN_DANCE", "LAPRAS", "ICY_WIND", "player")
