#!/usr/bin/env python3
"""prep40 staging: battles where the ATTACKER is behind its own Substitute when it uses move X (Scene ON, mechanicLab, Factory route).

Recipe = substSwapProbes.sh's subswap-* scenarios (battle-lab/subswap-on-*-persian-slowbro-*.json), one per (move, attacker side): the
attacker (PERSIAN, fast: speed 31/252; attack / sp. attack IVs 0 so the defender survives) has [SUBSTITUTE, X, X, X] (player; turn 1 slot 0
with A, A, turns 2+ slot 1 with A, RIGHT, A) or [SUBSTITUTE x3, X] (opponent AI: subs first, then a re-sub fails so it picks X). The
defender (SLOWBRO, slow: speed IV 0; 252 HP / 128 Def / 128 SpD; attack IV 0) has [TACKLE x4], so the doll survives several turns. Turn 1:
the attacker subs (164 body), the defender tackles the doll. Turn 2+: X by the subbed attacker = SUBSTITUTE_TO_MON, idle row, X body,
MON_TO_SUBSTITUTE (the composite under test). Messages wait for a button: every turn is followed by six B presses.
Variants: ATTRACT targets a female VAPOREON (SLOWBRO's Oblivious blocks it). `faint-*`: X = EXPLOSION (the subbed user faints after
its body). `roared-*`: the subbed PERSIAN ([SUBSTITUTE x4]) is forced out by the slow SLOWBRO's ROAR on turn 1 (the switch-out return path).
usage: prep40Stage.py <outDir>   -> <outDir>/<stem>.json and <outDir>/list.tsv (stem, move, moveId, attackerSide, attacker, defender)
"""
import json, sys
from pathlib import Path
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
# Top live adapters by Factory Level-50 weight (spriteOrderPlanCoverageRank.py) that a subbed attacker can use on the other battler,
# + the swap-step exceptions (Bite, Toxic, Seismic Toss), D3 Mud-Slap (faithful-random), D4 Megahorn (faithful-timing), the multi-hit
# Double Kick (also D3) and the two-turn Dig / Solar Beam.
MOVES = [("EARTHQUAKE", 89), ("AERIAL_ACE", 332), ("SHADOW_BALL", 247), ("PSYCHIC", 94), ("ROCK_SLIDE", 157), ("SURF", 57),
         ("ICE_BEAM", 58), ("DOUBLE_EDGE", 38), ("CONFUSE_RAY", 109), ("THUNDERBOLT", 85), ("ATTRACT", 213), ("BRICK_BREAK", 280),
         ("SLUDGE_BOMB", 188), ("THUNDER_WAVE", 86), ("GIGA_DRAIN", 202), ("ROAR", 46), ("CRUNCH", 242), ("FAINT_ATTACK", 185),
         ("FLAMETHROWER", 53), ("QUICK_ATTACK", 98), ("TOXIC", 92), ("BITE", 44), ("MEGA_KICK", 25), ("OVERHEAT", 315),
         ("ROCK_TOMB", 317), ("ICE_PUNCH", 8), ("SWAGGER", 207), ("FIRE_PUNCH", 7), ("HYDRO_PUMP", 56), ("FACADE", 263),
         ("SEISMIC_TOSS", 69), ("MUD_SLAP", 189), ("MEGAHORN", 224), ("DOUBLE_KICK", 24), ("DIG", 91), ("SOLAR_BEAM", 76)]
# Production has no live adapter for these orientations (one-sided adapters): not staged.
ONE_SIDED = {("ROCK_SLIDE", "player"), ("FAINT_ATTACK", "opponent")}
# internal species ids by constant name (Hoenn ids differ from the national dex)
SPECIES = {s["name"].replace("SPECIES_", ""): s["id"] for s in json.loads((Path(__file__).resolve().parents[2] / "src/data/gen/species-stats.json").read_text())["species"]}


def mon(species, moves, fast, gender="male"):
    ivs = {"hp": 31, "attack": 0, "defense": 31, "speed": 31 if fast else 0, "spAttack": 0, "spDefense": 31}
    evs = {"hp": 252, "attack": 0, "defense": 0 if fast else 128, "speed": 252 if fast else 0, "spAttack": 0, "spDefense": 0 if fast else 128}
    return {"species": SPECIES[species], "level": 50, "nature": 0, "ivs": ivs, "evs": evs, "moves": moves, "ppUps": [0, 0, 0, 0], "item": 0,
            "abilitySlot": 0, "friendship": 70, "gender": gender, "shiny": False}


def filler(species):
    return {"species": species, "level": 50, "nature": 0, "ivs": {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")},
            "evs": {"hp": 252, "attack": 0, "defense": 252, "speed": 0, "spAttack": 0, "spDefense": 0}, "moves": [33, 33, 33, 33],
            "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0, "friendship": 70, "gender": "male", "shiny": False}


def trace(player_side, turns=4, b_presses=6):
    seg = []
    for t in range(turns):
        pick = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}]
        if player_side and t > 0:
            pick += [{"frames": 2, "buttons": ["RIGHT"]}, {"frames": 30, "buttons": []}]
        seg += pick + [{"frames": 2, "buttons": ["A"]}, {"frames": 900, "buttons": []}]
        for _ in range(b_presses):
            seg += [{"frames": 2, "buttons": ["B"]}, {"frames": 120, "buttons": []}]
    return {"segments": seg}


rows = []
def stage(stem, move, mid, side, attacker_moves, defender="SLOWBRO", defender_moves=(33, 33, 33, 33), defender_gender="male", turns=4):
    atk = mon("PERSIAN", list(attacker_moves), True)
    dfn = mon(defender, list(defender_moves), False, defender_gender)
    parties = {"player": [atk if side == "player" else dfn, filler(67), filler(159)],
               "opponent": [dfn if side == "player" else atk, filler(213), filler(202)]}
    sc = {"schemaVersion": 1, "mode": "mechanicLab", "profile": "battle-scene-on", "level": 50, "challengeNum": 4, "battleNum": 0,
          "trainerId": 150, "playerSetIds": [498, 499, 500], "opponentSetIds": [495, 496, 497], "seed": 305419897,
          "overrides": {"parties": parties}, "trace": trace(side == "player", turns)}
    (OUT / f"{stem}.json").write_text(json.dumps(sc, separators=(",", ":")) + "\n")
    rows.append((stem, move, mid, side, "PERSIAN", defender))


for move, mid in MOVES:
    for side in ("player", "opponent"):
        if (move, side) in ONE_SIDED:
            continue
        moves = (164, mid, mid, mid) if side == "player" else (164, 164, 164, mid)
        tag = move.lower().replace("_", "-")
        if move == "ATTRACT":
            stage(f"prep40-{tag}-{side}", move, mid, side, moves, defender="VAPOREON", defender_gender="female")
        else:
            stage(f"prep40-{tag}-{side}", move, mid, side, moves, turns=5 if move in ("DIG", "SOLAR_BEAM") else 4)
# Faint / switch-out of a subbed battler (battle_controller_player.c:2249 / :2412 SUBSTITUTE_TO_MON before the faint / return).
for side in ("player", "opponent"):
    stage(f"prep40-faint-explosion-{side}", "EXPLOSION", 153, side, (164, 153, 153, 153) if side == "player" else (164, 164, 164, 153), turns=3)
    stage(f"prep40-roared-{side}", "ROAR", 46, side, (164, 164, 164, 164), defender_moves=(46, 46, 46, 46), turns=2)
# Voluntary switch-out of the subbed player PERSIAN on turn 2 (POKeMON, slot 2, SHIFT): DoSwitchOutAnimation's SUBSTITUTE_TO_MON (:2249).
stage("prep40-switch-player", "SUBSTITUTE", 164, "player", (164, 164, 164, 164), turns=1)
sw = json.loads((OUT / "prep40-switch-player.json").read_text())
sw["trace"]["segments"] += ([{"frames": 2, "buttons": ["DOWN"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 90, "buttons": []},
                             {"frames": 2, "buttons": ["DOWN"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []},
                             {"frames": 2, "buttons": ["A"]}, {"frames": 900, "buttons": []}] + [{"frames": 2, "buttons": ["B"]}, {"frames": 120, "buttons": []}] * 4)
(OUT / "prep40-switch-player.json").write_text(json.dumps(sw, separators=(",", ":")) + "\n")
(OUT / "list.tsv").write_text("".join("\t".join(map(str, r)) + "\n" for r in rows))
print(len(rows), "scenarios ->", OUT)
