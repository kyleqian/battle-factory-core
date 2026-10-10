#!/usr/bin/env python3
"""Live audit 20 (S10A side lane): the live claims of land75 (hist73 Part A: 37 bodies joined the allocator NET-ZERO set, so the
ALLOCATOR consumers after them are live) and st76 (Dive / Meteor Mash with a displayed status). audit19Stage.py's method (battle-lab,
explicit lab seed 305420349 = ISSUES #154; FAST lead = the unit user, SLOW lead CHANSEY 113 = the consumer; CHANSEY's HP / Def EVs are
maxed, 510 total) with these families (both sides each, two unit species each; Factory-reachable species = battle-frontier-mons.json):
  pa      the top-8 hist73 Part A bodies by census exposure: FURY_CUTTER 210 (SCYTHER 123, KABUTOPS 141), PSYWAVE 149 (SPOINK 351,
          CHIMECHO 411), CURSE 174 stat branch (SNORLAX 143, MILTANK 241) and Ghost branch (DUSCLOPS 362 with 252 Speed EVs, BANETTE 378
          — not a Factory Curse user), FEATHER_DANCE 297 (PIDGEOT 18, PIDGEOTTO 17), SILVER_WIND 318 (BEAUTIFLY 292, VENOMOTH 49),
          HEAL_BELL 215 (CHIMECHO 411, DELCATTY 316), SWEET_SCENT 230 (VICTREEBEL 71, ODDISH 43), MAGNITUDE 222 (GRAVELER 75,
          CAMERUPT 340); every allocator consumer of liveMoveSpriteAllocator.ts PLANS is the slow lead's only move: BARRIER 112,
          LIGHT_SCREEN 113, REFLECT 115 after the first species, PROTECT 182, MAGIC_COAT 277 after the second (all five per unit and
          side) and MIRROR_COAT 243 after the special Psywave of both (the only top-8 body Mirror Coat answers);
  pc      chains of two Part A bodies: the unit user knows two of them (SCYTHER FURY_CUTTER + SILVER_WIND, CHIMECHO PSYWAVE + HEAL_BELL);
          as the player it picks slot 1 in turn 0 and slot 2 (RIGHT) from turn 1, as the opponent the AI picks; consumers BARRIER /
          MAGIC_COAT (usable every turn);
  mm      st76 Meteor Mash 309 with a displayed status: CHANSEY is the FAST lead with THUNDER_WAVE 86 (turn 0) then the consumer (BARRIER /
          LIGHT_SCREEN; the player picks slot 2 from turn 1), the slow METAGROSS 400 / CLEFABLE 36 uses METEOR_MASH while paralysed;
  dv      st76 Dive 291 with a displayed status: CHANSEY (fast) TOXIC 92 then BARRIER / MAGIC_COAT vs the slow diver CLAMPERL 373 /
          SEEL 86 (badly poisoned through its Dive setup and attack); the opponent CHANSEY's AI picks its own order (more turns);
  ctl     no-unit controls: SNORLAX SNORE 173 (fails awake: no body) before every consumer (Mirror Coat has no body without a hit).
usage: audit20Stage.py <out-dir>   (the committed set is tools/integration/fixtures/audit-20/scenarios/)
"""
import json, sys
from pathlib import Path

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
BASE = json.loads(Path("tools/battle-lab/prep18-return-altopp-snorlax-golem.json").read_text())
M = {"FURY_CUTTER": 210, "PSYWAVE": 149, "CURSE": 174, "FEATHER_DANCE": 297, "SILVER_WIND": 318, "HEAL_BELL": 215, "SWEET_SCENT": 230,
     "MAGNITUDE": 222, "BARRIER": 112, "LIGHT_SCREEN": 113, "REFLECT": 115, "PROTECT": 182, "MAGIC_COAT": 277, "MIRROR_COAT": 243,
     "METEOR_MASH": 309, "DIVE": 291, "THUNDER_WAVE": 86, "TOXIC": 92, "SNORE": 173}
SP = {"SCYTHER": 123, "KABUTOPS": 141, "SPOINK": 351, "CHIMECHO": 411, "SNORLAX": 143, "MILTANK": 241, "DUSCLOPS": 362, "BANETTE": 378,
      "PIDGEOT": 18, "PIDGEOTTO": 17, "BEAUTIFLY": 292, "VENOMOTH": 49, "DELCATTY": 316, "VICTREEBEL": 71, "ODDISH": 43, "GRAVELER": 75,
      "CAMERUPT": 340, "METAGROSS": 400, "CLEFABLE": 36, "CLAMPERL": 373, "SEEL": 86, "CHANSEY": 113}
GENDERLESS = {400}  # MON_GENDERLESS (METAGROSS)
FEMALE_ONLY = {113, 241}  # CHANSEY, MILTANK
tag = lambda s: s.lower().replace("_", "-")


def lead(member: dict, species: int, moves: list, fast: bool) -> dict:  # audit19Stage.py's lead()
    m = json.loads(json.dumps(member))
    m.update({"species": species, "moves": moves, "item": 0, "nature": 3 if fast else 7, "friendship": 70,
              "gender": "female" if species in FEMALE_ONLY or not fast else "male", "abilitySlot": 0})
    if species in GENDERLESS:
        m.pop("gender")
    m["ivs"]["speed"] = 31 if fast else 0
    m["evs"]["speed"] = 0
    if species == 113:  # the consumer survives every unit (510 EV cap)
        m["evs"].update({"hp": 255, "defense": 255, "spDefense": 0})
    if species == 362:  # DUSCLOPS (base Speed 25) must outspeed CHANSEY: 252 Speed EVs (hp 0 + 255 + 252 <= 510)
        m["evs"].update({"hp": 0, "speed": 252})
    return m


def trace(cycles: int, right_from: int | None = None) -> dict:
    seg = []
    for c in range(cycles):
        if right_from is not None and c == right_from:  # move slot 2 (the move cursor then stays there)
            seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["RIGHT"]}, {"frames": 10, "buttons": []},
                    {"frames": 2, "buttons": ["A"]}, {"frames": 1288, "buttons": []}]
        else:
            seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1300, "buttons": []}]
    return {"segments": seg}


def stage(name: str, fast_species: str, fast_moves: list, slow_species: str, slow_moves: list, slow_side: str, cycles: int,
          right_from: int | None = None) -> None:
    s = json.loads(json.dumps(BASE))
    fast_side = "opponent" if slow_side == "player" else "player"
    parties = s["overrides"]["parties"]
    parties[fast_side][0] = lead(parties[fast_side][0], SP[fast_species], [M[x] for x in fast_moves], True)
    parties[slow_side][0] = lead(parties[slow_side][0], SP[slow_species], [M[x] for x in slow_moves], False)
    for p in ("player", "opponent"):
        for m in parties[p][1:]:
            m["item"] = 0
        assert sum(parties[p][0]["evs"].values()) <= 510
    s["trace"] = trace(cycles, right_from)
    assert s["seed"] == 305420349
    (OUT / f"{name}.json").write_text(json.dumps(s, indent=1) + "\n")


UNITS = [("fc", "FURY_CUTTER", ("SCYTHER", "KABUTOPS")), ("pw", "PSYWAVE", ("SPOINK", "CHIMECHO")), ("cs", "CURSE", ("SNORLAX", "MILTANK")),
         ("cg", "CURSE", ("DUSCLOPS", "BANETTE")), ("fd", "FEATHER_DANCE", ("PIDGEOT", "PIDGEOTTO")),
         ("sw", "SILVER_WIND", ("BEAUTIFLY", "VENOMOTH")), ("hb", "HEAL_BELL", ("CHIMECHO", "DELCATTY")),
         ("ss", "SWEET_SCENT", ("VICTREEBEL", "ODDISH")), ("mg", "MAGNITUDE", ("GRAVELER", "CAMERUPT"))]
C5 = ["BARRIER", "LIGHT_SCREEN", "REFLECT", "PROTECT", "MAGIC_COAT"]
for side, stag in (("player", "ply"), ("opponent", "opp")):
    for fam, unit, species in UNITS:
        for k, sp in enumerate(species):
            for c in (C5[:3] if k == 0 else C5[3:]) + (["MIRROR_COAT"] if unit == "PSYWAVE" else []):
                # player consumer: the player is the slow lead and presses A (slot 1) every turn; 3 turns
                stage(f"pa-{fam}-{tag(sp)}-{tag(c)}-{stag}", sp, [unit] * 4, "CHANSEY", [c] * 4, side, 3)
    for sp, a, b in (("SCYTHER", "FURY_CUTTER", "SILVER_WIND"), ("CHIMECHO", "PSYWAVE", "HEAL_BELL")):
        for c in ("BARRIER", "MAGIC_COAT"):
            # the unit user is the player when the consumer is the opponent: slot 1 in turn 0, slot 2 from turn 1
            stage(f"pc-{tag(sp)}-{tag(c)}-{stag}", sp, [a, b, a, b], "CHANSEY", [c] * 4, side, 4, 1 if side == "opponent" else None)
    for c in C5:
        stage(f"ctl-snorlax-{tag(c)}-{stag}", "SNORLAX", ["SNORE"] * 4, "CHANSEY", [c] * 4, side, 3)
    # st76: CHANSEY is the FAST lead here (the status lands before the slow user's first body); as the player it picks the consumer
    # (slot 2) from turn 1
    for sp in ("METAGROSS", "CLEFABLE"):
        for c in ("BARRIER", "LIGHT_SCREEN"):
            stage(f"mm-{tag(sp)}-{tag(c)}-{stag}", "CHANSEY", ["THUNDER_WAVE", c, c, c], sp, ["METEOR_MASH"] * 4,
                  "opponent" if side == "player" else "player", 3 if side == "player" else 5, 1 if side == "player" else None)
    for sp in ("CLAMPERL", "SEEL"):
        for c in ("BARRIER", "MAGIC_COAT"):
            stage(f"dv-{tag(sp)}-{tag(c)}-{stag}", "CHANSEY", ["TOXIC", c, c, c], sp, ["DIVE"] * 4,
                  "opponent" if side == "player" else "player", 4 if side == "player" else 7, 1 if side == "player" else None)
print("\n".join(sorted(p.name for p in OUT.glob("*.json"))))
