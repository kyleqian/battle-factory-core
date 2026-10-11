#!/usr/bin/env python3
"""cast83 (ISSUES #143, docs/cast83-castform-forms.md): CASTFORM weather-form windows the audit-19 cast family does not cover.
audit19Stage.py's method (battle-lab, explicit lab seed 305420349 = ISSUES #154; FAST lead acts first, SLOW lead = the consumer whose MOVE
bodies are the windows; 3 A-A cycles), with these families (names: c83-<weather>-<consumer move>-<by|at>-cf<castform side>):
  by  the FAST lead (the opposing species) sets the weather (SUNNY_DAY 241 / RAIN_DANCE 240 / HAIL 258), General_CastformChange turns the
      SLOW CASTFORM into the form, and CASTFORM's own body (EMBER 52 / WATER_PULSE 352 / ICY_WIND 196 / ICE_BEAM 58) is the window;
  at  CASTFORM (FAST) sets HAIL, the SLOW opposing species' ICY_WIND 196 / SHOCK_WAVE 351 at the ice form is the window.
  by2 / at2 (second batch): by THUNDERBOLT 85 (rain) / SHOCK_WAVE 351 (hail) / FLAMETHROWER 53 (sun); at BUBBLEBEAM 61 / ICE_BEAM 58 /
      PROTECT 182 / THUNDER_WAVE 86 (rain), AERIAL_ACE 332 / SURF 57 / SUPER_FANG 162 (sun), SCARY_FACE 184 (hail);
  by3 / at3 (third batch, the census's remaining weather-form triples): by ICE_BEAM / ICY_WIND / SHOCK_WAVE (rain), WATER_PULSE (hail);
      at SUPER_FANG / SURF / AERIAL_ACE / ICY_WIND / DOUBLE_EDGE 38 (rain);
  ctl the sun-Ember, sun-Flamethrower and hail-Scary-Face pairs with CASTFORM in its normal form (SHOCK_WAVE 351 instead of the weather).
Opposing species (internal ids): elevated CROBAT 169 (6) / GOLBAT 42 (8) / PELIPPER 310 (8) on the opponent side; LAPRAS 131 / MANTINE 226 /
SHARPEDO 331 on the player side. Speeds: lead() gives the FAST lead IV 31 + a neutral nature, the SLOW lead IV 0 + Relaxed.
usage: cast83Stage.py <out-dir>   (the committed set is tools/integration/fixtures/cast83/scenarios/)
"""
import json, sys
from pathlib import Path

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
BASE = json.loads(Path("tools/battle-lab/prep18-return-altopp-snorlax-golem.json").read_text())
M = {"SUNNY_DAY": 241, "RAIN_DANCE": 240, "HAIL": 258, "EMBER": 52, "WATER_PULSE": 352, "ICY_WIND": 196, "ICE_BEAM": 58, "SHOCK_WAVE": 351,
     "THUNDERBOLT": 85, "FLAMETHROWER": 53, "BUBBLEBEAM": 61, "AERIAL_ACE": 332, "PROTECT": 182, "SURF": 57, "SCARY_FACE": 184,
     "THUNDER_WAVE": 86, "SUPER_FANG": 162, "DOUBLE_EDGE": 38}
SP = {"CASTFORM": 385, "CROBAT": 169, "GOLBAT": 42, "PELIPPER": 310, "LAPRAS": 131, "MANTINE": 226, "SHARPEDO": 331}
tag = lambda s: s.lower().replace("_", "-")


def lead(member: dict, species: int, move: int, fast: bool) -> dict:  # audit19Stage.py's lead()
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


def stage(name: str, fast_species: str, fast_move: str, slow_species: str, slow_move: str, slow_side: str, cycles: int) -> None:
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


# by: CASTFORM is the SLOW consumer on `side`; the fast weather setter is on the other side
BY = [("hail", "HAIL", "ICY_WIND", "CROBAT", "LAPRAS"), ("hail", "HAIL", "ICE_BEAM", "GOLBAT", "MANTINE"),
      ("rain", "RAIN_DANCE", "WATER_PULSE", "PELIPPER", "SHARPEDO"), ("sun", "SUNNY_DAY", "EMBER", "CROBAT", "MANTINE")]
for weather, setter_move, move, opp_setter, ply_setter in BY:
    stage(f"c83-{weather}-{tag(move)}-by-cfply", opp_setter, setter_move, "CASTFORM", move, "player", 3)
    stage(f"c83-{weather}-{tag(move)}-by-cfopp", ply_setter, setter_move, "CASTFORM", move, "opponent", 3)
# at: CASTFORM is the FAST hail setter; the SLOW consumer is on the other side
for move in ("ICY_WIND", "SHOCK_WAVE"):
    stage(f"c83-hail-{tag(move)}-at-cfply", "CASTFORM", "HAIL", "GOLBAT", move, "opponent", 3)
    stage(f"c83-hail-{tag(move)}-at-cfopp", "CASTFORM", "HAIL", "LAPRAS", move, "player", 3)
# ctl: the Ember windows with CASTFORM in its NORMAL form (the fast lead uses SHOCK_WAVE 351 instead of SUNNY_DAY): separates a
# form residual from the body's own
stage("c83-ctl-ember-by-cfply", "CROBAT", "SHOCK_WAVE", "CASTFORM", "EMBER", "player", 3)
stage("c83-ctl-ember-by-cfopp", "MANTINE", "SHOCK_WAVE", "CASTFORM", "EMBER", "opponent", 3)
# second batch (the census's other weather-form bodies)
BY2 = [("rain", "RAIN_DANCE", "THUNDERBOLT", "PELIPPER", "SHARPEDO"), ("hail", "HAIL", "SHOCK_WAVE", "CROBAT", "LAPRAS"),
       ("sun", "SUNNY_DAY", "FLAMETHROWER", "GOLBAT", "MANTINE")]
for weather, setter_move, move, opp_setter, ply_setter in BY2:
    stage(f"c83-{weather}-{tag(move)}-by-cfply", opp_setter, setter_move, "CASTFORM", move, "player", 3)
    stage(f"c83-{weather}-{tag(move)}-by-cfopp", ply_setter, setter_move, "CASTFORM", move, "opponent", 3)
AT2 = [("rain", "RAIN_DANCE", "BUBBLEBEAM"), ("rain", "RAIN_DANCE", "ICE_BEAM"), ("rain", "RAIN_DANCE", "PROTECT"),
       ("rain", "RAIN_DANCE", "THUNDER_WAVE"), ("sun", "SUNNY_DAY", "AERIAL_ACE"), ("sun", "SUNNY_DAY", "SURF"),
       ("sun", "SUNNY_DAY", "SUPER_FANG"), ("hail", "HAIL", "SCARY_FACE")]
for weather, setter_move, move in AT2:
    stage(f"c83-{weather}-{tag(move)}-at-cfply", "CASTFORM", setter_move, "GOLBAT", move, "opponent", 3)
    stage(f"c83-{weather}-{tag(move)}-at-cfopp", "CASTFORM", setter_move, "LAPRAS", move, "player", 3)
stage("c83-ctl-flamethrower-by-cfply", "GOLBAT", "SHOCK_WAVE", "CASTFORM", "FLAMETHROWER", "player", 3)
stage("c83-ctl-flamethrower-by-cfopp", "MANTINE", "SHOCK_WAVE", "CASTFORM", "FLAMETHROWER", "opponent", 3)
stage("c83-ctl-scary-face-at-cfply", "CASTFORM", "SHOCK_WAVE", "GOLBAT", "SCARY_FACE", "opponent", 3)
stage("c83-ctl-scary-face-at-cfopp", "CASTFORM", "SHOCK_WAVE", "LAPRAS", "SCARY_FACE", "player", 3)
# third batch (the census's remaining (move, Castform role, form) triples)
BY3 = [("rain", "RAIN_DANCE", "ICE_BEAM", "PELIPPER", "SHARPEDO"), ("rain", "RAIN_DANCE", "ICY_WIND", "GOLBAT", "MANTINE"),
       ("rain", "RAIN_DANCE", "SHOCK_WAVE", "CROBAT", "LAPRAS"), ("hail", "HAIL", "WATER_PULSE", "GOLBAT", "MANTINE")]  # not LAPRAS: Water Absorb (ability 0) eats Water Pulse
for weather, setter_move, move, opp_setter, ply_setter in BY3:
    stage(f"c83-{weather}-{tag(move)}-by-cfply", opp_setter, setter_move, "CASTFORM", move, "player", 3)
    stage(f"c83-{weather}-{tag(move)}-by-cfopp", ply_setter, setter_move, "CASTFORM", move, "opponent", 3)
for move in ("SUPER_FANG", "SURF", "AERIAL_ACE", "ICY_WIND", "DOUBLE_EDGE"):
    stage(f"c83-rain-{tag(move)}-at-cfply", "CASTFORM", "RAIN_DANCE", "GOLBAT", move, "opponent", 3)
    stage(f"c83-rain-{tag(move)}-at-cfopp", "CASTFORM", "RAIN_DANCE", "LAPRAS", move, "player", 3)
