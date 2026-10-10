#!/usr/bin/env python3
"""Live audit 19 (S10A side lane): the live claims of today's later folds (fold71 plans69 + Speed Boost, ice72 Ice Ball words unit,
dive70 Dive attack) and ISSUES #160. audit18Stage.py's method (battle-lab, explicit lab seed 305420349 = ISSUES #154; FAST lead = the unit
user, SLOW lead CHANSEY = the consumer) with these families (both sides each):
  mag     MAGNITUDE 222 (GOLEM 76 / SWAMPERT 285): both power classes come from the battle's own rolls (the probe reads gAnimMovePower);
  cast    CASTFORM 385 SUNNY_DAY 241 / RAIN_DANCE 240: General_CastformChange right after the weather body (then SUN / RAIN_CONTINUES);
  conv    CONVERSION_2 176 (PORYGON2 233 / SNORLAX 143): fails until the consumer's move hits it (turn 1 = a no-unit window);
  needle  NEEDLE_ARM 302 (CACTURNE 345 / CACNEA 344);
  sb      NINJASK 302 (Speed Boost) using SNORE 173 (fails awake: no body): the end-turn STATS_CHANGE (argument 17) is the only unit;
  ice     ICE_BALL 301 (SEALEO 342 / WALREIN 343): counters 1..5 (the user is locked), consumers between the bodies;
  dive    DIVE 291 (CHINCHOU 170 / CLAMPERL 373): every body is a window (the attack body and the next body of either battler);
  magx    Magnitude > 99 explicitly by lab seed (below);
  ctl     no-unit controls: SNORLAX SNORE (no body) before every consumer;
  wp160   ISSUES #160: dive70's whirlpool-opp-s1 (copied, its own lab seed 305420548) + a variant whose player picks SWIFT 129 (move slot 2,
          RIGHT in the move menu) in turn 2 (an order-dependent consumer after the Whirlpool-at-the-hidden-diver history);
  wp160b  #160 as described: CHINCHOU (fast) DIVE vs CHANSEY (slow) WHIRLPOOL (the hit at the hidden diver ends turn 0), then SWIFT
          (player side) / WHIRLPOOL (opponent side) after the Dive attack; lab seeds 305420349 + k, k = 0..2.
Consumers: SHOCK_WAVE 351, WATER_PULSE 352 (Random2), SWIFT 129, THUNDERBOLT 85; Ice Ball: MUD_SLAP 189 (words unit) for THUNDERBOLT.
usage: audit19Stage.py <out-dir>   (the committed set is tools/integration/fixtures/audit-19/scenarios/)
"""
import json, sys
from pathlib import Path

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
BASE = json.loads(Path("tools/battle-lab/prep18-return-altopp-snorlax-golem.json").read_text())
M = {"MAGNITUDE": 222, "SUNNY_DAY": 241, "RAIN_DANCE": 240, "CONVERSION_2": 176, "NEEDLE_ARM": 302, "SNORE": 173, "ICE_BALL": 301,
     "DIVE": 291, "SHOCK_WAVE": 351, "WATER_PULSE": 352, "SWIFT": 129, "THUNDERBOLT": 85, "MUD_SLAP": 189, "WHIRLPOOL": 250}
SP = {"GOLEM": 76, "SWAMPERT": 285, "CASTFORM": 385, "PORYGON2": 233, "SNORLAX": 143, "CACTURNE": 345, "CACNEA": 344, "NINJASK": 302,
      "SEALEO": 342, "WALREIN": 343, "CHINCHOU": 170, "CLAMPERL": 373, "CHANSEY": 113}
GENDERLESS = {233}  # MON_GENDERLESS (PORYGON2)
tag = lambda s: s.lower().replace("_", "-")


def lead(member: dict, species: int, move: int, fast: bool) -> dict:  # audit18Stage.py's lead()
    m = json.loads(json.dumps(member))
    m.update({"species": species, "moves": [move] * 4, "item": 0, "nature": 3 if fast else 7, "friendship": 70,
              "gender": "male" if fast else "female", "abilitySlot": 0})
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
    assert s["seed"] == 305420349  # wp160b-* re-pin 305420349 + k below
    (OUT / f"{name}.json").write_text(json.dumps(s, indent=1) + "\n")


C4 = ["SHOCK_WAVE", "WATER_PULSE", "SWIFT", "THUNDERBOLT"]
for side, stag in (("player", "ply"), ("opponent", "opp")):
    for c in C4:
        for sp in ("GOLEM", "SWAMPERT"):
            stage(f"mag-{tag(sp)}-{tag(c)}-{stag}", sp, "MAGNITUDE", "CHANSEY", c, side, 4)
        for w, mv in (("sun", "SUNNY_DAY"), ("rain", "RAIN_DANCE")):
            stage(f"cast-{w}-{tag(c)}-{stag}", "CASTFORM", mv, "CHANSEY", c, side, 3)
        for sp in ("PORYGON2", "SNORLAX"):
            stage(f"conv-{tag(sp)}-{tag(c)}-{stag}", sp, "CONVERSION_2", "CHANSEY", c, side, 4)
        for sp in ("CACTURNE", "CACNEA"):
            stage(f"needle-{tag(sp)}-{tag(c)}-{stag}", sp, "NEEDLE_ARM", "CHANSEY", c, side, 3)
        stage(f"sb-ninjask-{tag(c)}-{stag}", "NINJASK", "SNORE", "CHANSEY", c, side, 4)
        for sp in ("CHINCHOU", "CLAMPERL"):
            stage(f"dive-{tag(sp)}-{tag(c)}-{stag}", sp, "DIVE", "CHANSEY", c, side, 4)
    for c in ("MUD_SLAP", "WATER_PULSE", "SHOCK_WAVE", "SWIFT"):
        for sp in ("SEALEO", "WALREIN"):
            stage(f"ice-{tag(sp)}-{tag(c)}-{stag}", sp, "ICE_BALL", "CHANSEY", c, side, 6)
    for c in C4 + ["MUD_SLAP"]:
        stage(f"ctl-snorlax-{tag(c)}-{stag}", "SNORLAX", "SNORE", "CHANSEY", c, side, 4)

# ISSUES #160: dive70's scenario (its own lab seed) + the SWIFT-in-turn-2 variant (an extra cycle so the variant has turn 3 too)
wp = json.loads(Path("tools/integration/fixtures/dive70/scenarios/whirlpool-opp-s1.json").read_text())
(OUT / "wp160-opp-s1.json").write_text(json.dumps(wp, indent=1) + "\n")
v = json.loads(json.dumps(wp))
v["overrides"]["parties"]["player"][0]["moves"] = [M["WHIRLPOOL"], M["SWIFT"], M["SWIFT"], M["SWIFT"]]
seg = v["trace"]["segments"]
assert [g["frames"] for g in seg[4:8]] == [2, 30, 2, 1400]
v["trace"]["segments"] = seg[:6] + [{"frames": 2, "buttons": ["RIGHT"]}, {"frames": 10, "buttons": []}, {"frames": 2, "buttons": ["A"]},
                                    {"frames": 1388, "buttons": []}] + seg[8:]
(OUT / "wp160-opp-swift.json").write_text(json.dumps(v, indent=1) + "\n")
# magx: Magnitude > 99 EXPLICITLY by lab seed (305420349 + k, picked from a 12-seed sweep of mag-golem-swift-*: k10 / k4 roll 150 at the
# first / second use against the player's CHANSEY, k5 / k2 at the first / second use against the opponent's). CHANSEY's HP / Def EVs are
# maxed so it survives a > 99 roll (the opponent CHANSEY of mag-* faints to it -> an unmodelled switch); EVs do not move the power rolls.
for side, stag, ks in (("player", "ply", (10, 4)), ("opponent", "opp", (5, 2))):
    for c in ("SWIFT", "WATER_PULSE"):  # Electric consumers are immune-blocked by GOLEM (no body)
        for k in ks:
            name = f"magx-golem-{tag(c)}-{stag}-k{k}"
            stage(name, "GOLEM", "MAGNITUDE", "CHANSEY", c, side, 3)
            v = json.loads((OUT / f"{name}.json").read_text())
            v["seed"] = 305420349 + k
            v["overrides"]["parties"][side][0]["evs"].update({"hp": 255, "defense": 255, "spDefense": 0})  # 510 EV cap
            (OUT / f"{name}.json").write_text(json.dumps(v, indent=1) + "\n")

# ISSUES #160 as described (the Whirlpool hits the hidden diver at the END of turn 0, right before the turn-1 prompt): CHINCHOU (fast)
# DIVE vs CHANSEY (slow) WHIRLPOOL; the player's CHANSEY then picks SWIFT (slot 2: RIGHT in the move menu) from turn 1 on (an
# order-dependent consumer after the Dive attack); the opponent's CHANSEY keeps WHIRLPOOL (the AI's only move: the consumer after the attack
# is a Whirlpool at the visible diver). Whirlpool is 70 % accurate: three lab seeds per side (each its own scenario, ISSUES #154).
for k in range(3):
    for side, stag in (("player", "ply"), ("opponent", "opp")):
        name = f"wp160b-{stag}-s{k}"
        stage(name, "CHINCHOU", "DIVE", "CHANSEY", "WHIRLPOOL", side, 4)
        v = json.loads((OUT / f"{name}.json").read_text())
        v["seed"] = 305420349 + k
        if side == "player":
            v["overrides"]["parties"]["player"][0]["moves"] = [M["WHIRLPOOL"], M["SWIFT"], M["SWIFT"], M["SWIFT"]]
            seg = v["trace"]["segments"]
            v["trace"]["segments"] = seg[:6] + [{"frames": 2, "buttons": ["RIGHT"]}, {"frames": 10, "buttons": []}, {"frames": 2, "buttons": ["A"]},
                                                {"frames": 1288, "buttons": []}] + seg[8:]
        (OUT / f"{name}.json").write_text(json.dumps(v, indent=1) + "\n")
print("\n".join(sorted(p.name for p in OUT.glob("*.json"))))
