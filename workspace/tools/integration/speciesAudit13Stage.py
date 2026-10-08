#!/usr/bin/env python3
"""speciesAudit13 staging: DEFENDER-shown-as-the-Substitute-doll scenarios (the prep38 recipe, tools/integration/prep38Stage.py) with the
species swapped. All rows are DEFENDER-FIRST (the defender is fast and subs on turn 1; the attacker's move X is the battle's second body and
hits the doll), 2 turns, six B presses per turn. The age shift of each move comes from the committed prep38 doll-free CONTROL receipts
(tools/integration/fixtures/prep38/receipts/control), as dolldef-live. Rows:
  ctl   SLOWBRO (slow) -> PERSIAN (fast) on both sides (the df recipe of prep38's ORDER moves; female PERSIAN for Attract)
  def   SLOWBRO -> <defender swap> (tall / large, small, elevated, levitating, idle rest), both sides; species the move cannot affect
        (type / Levitate immunity: no attackanimation) are left out per move
  atk   <attacker swap> (idle-rest ONIX, elevated GOLBAT / AERODACTYL, tall STEELIX) -> PERSIAN, both sides
  shiny SLOWBRO -> shiny STEELIX defender (the doll has no shiny palette), both sides
  nodf  (`--nodf`, doll-free CONTROL + doll TEST in one scenario: the prep38 attacker-first recipe, 3 turns) a fast <attacker> -> slow SLOWBRO:
        turn 1 the move on the MON (control body), the defender subs; turn 2 the move on the DOLL (test body). Used for the idle-rest ONIX and
        elevated GOLBAT opponent attackers
usage: speciesAudit13Stage.py <outDir> [move ...] | speciesAudit13Stage.py --nodf <outDir> ATTACKER:MOVE:side ...   -> <outDir>/<stem>.json, <outDir>/list.tsv (stem, move, moveId, attackerSide, attacker, defender)
"""
import json, sys
from pathlib import Path
NODF = sys.argv[1] == "--nodf"
if NODF: sys.argv.pop(1)
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
SPECIES = {s["name"].replace("SPECIES_", ""): s["id"] for s in json.loads((Path(__file__).resolve().parents[2] / "src/data/gen/species-stats.json").read_text())["species"]}
MOVES = [("EARTHQUAKE", 89), ("PSYCHIC", 94), ("SURF", 57), ("ATTRACT", 213), ("BRICK_BREAK", 280), ("SLUDGE_BOMB", 188), ("CRUNCH", 242),
         ("BODY_SLAM", 34), ("FLAMETHROWER", 53), ("ICE_BEAM", 58), ("THUNDERBOLT", 85)]
ONLY = set(sys.argv[2:])
DEFENDERS = ["STEELIX", "WAILORD", "TYRANITAR", "PICHU", "GOLBAT", "FLYGON", "WEEZING", "ONIX", "RATTATA"]
IMMUNE = {"EARTHQUAKE": {"GOLBAT", "FLYGON", "WEEZING", "AERODACTYL"}, "PSYCHIC": {"TYRANITAR"}, "SLUDGE_BOMB": {"STEELIX"},
          "THUNDERBOLT": {"STEELIX", "ONIX", "FLYGON"}}
ATTACKERS = ["ONIX", "GOLBAT", "AERODACTYL", "STEELIX"]


def mon(species, moves, speed_fast, gender, shiny=False):
    ivs = {"hp": 31, "attack": 0, "defense": 31, "speed": 31 if speed_fast else 0, "spAttack": 0, "spDefense": 31}
    evs = {"hp": 252, "attack": 0, "defense": 0 if speed_fast else 128, "speed": 252 if speed_fast else 0, "spAttack": 0,
           "spDefense": 0 if speed_fast else 128}
    return {"species": SPECIES[species], "level": 50, "nature": 0, "ivs": ivs, "evs": evs, "moves": moves, "ppUps": [0, 0, 0, 0], "item": 0,
            "abilitySlot": 0, "friendship": 70, "gender": gender, "shiny": shiny}


def filler(species):
    return {"species": species, "level": 50, "nature": 0, "ivs": {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")},
            "evs": {"hp": 252, "attack": 0, "defense": 252, "speed": 0, "spAttack": 0, "spDefense": 0}, "moves": [33, 33, 33, 33],
            "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0, "friendship": 70, "gender": "male", "shiny": False}


def trace(turns=2, b_presses=6):
    seg = []
    for _ in range(turns):
        seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 900, "buttons": []}]
        for _ in range(b_presses):
            seg += [{"frames": 2, "buttons": ["B"]}, {"frames": 120, "buttons": []}]
    return {"segments": seg}


rows = []
def stage(tag, move, mid, side, attacker, defender, shiny=False, nodf=False):
    dgender = "female" if move == "ATTRACT" else "male"
    atk = mon(attacker, [mid] * 4, nodf, "male")
    dfn = mon(defender, [164] * 4, not nodf, dgender, shiny)
    parties = {"player": [atk if side == "player" else dfn, filler(67), filler(159)],
               "opponent": [dfn if side == "player" else atk, filler(213), filler(202)]}
    sc = {"schemaVersion": 1, "mode": "mechanicLab", "profile": "battle-scene-on", "level": 50, "challengeNum": 4, "battleNum": 0,
          "trainerId": 150, "playerSetIds": [498, 499, 500], "opponentSetIds": [495, 496, 497], "seed": 305419897,
          "overrides": {"parties": parties}, "trace": trace(3 if nodf else 2)}
    stem = f"s13-{tag}-{move.lower().replace('_', '-')}-{side}"
    (OUT / f"{stem}.json").write_text(json.dumps(sc, separators=(",", ":")) + "\n")
    rows.append((stem, move, mid, side, attacker, defender))


if NODF:
    for spec in sys.argv[2:]:
        a, move, side = spec.split(":"); mid = dict(MOVES)[move]
        stage(f"nodf{a.lower()}", move, mid, side, a, "SLOWBRO", nodf=True)
    (OUT / "list.tsv").write_text("".join("\t".join(map(str, r)) + "\n" for r in rows)); print(len(rows), "scenarios ->", OUT); sys.exit()
for move, mid in MOVES:
    if ONLY and move not in ONLY: continue
    for side in ("player", "opponent"):
        stage("ctl", move, mid, side, "SLOWBRO", "PERSIAN")
        for d in DEFENDERS:
            if d not in IMMUNE.get(move, ()): stage(f"def{d.lower()}", move, mid, side, "SLOWBRO", d)
        for a in ATTACKERS:
            stage(f"atk{a.lower()}", move, mid, side, a, "PERSIAN")
        if move not in IMMUNE or "STEELIX" not in IMMUNE[move]: stage("shinysteelixdef", move, mid, side, "SLOWBRO", "STEELIX", shiny=True)
(OUT / "list.tsv").write_text("".join("\t".join(map(str, r)) + "\n" for r in rows))
print(len(rows), "scenarios ->", OUT)
