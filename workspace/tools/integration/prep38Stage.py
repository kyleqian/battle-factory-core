#!/usr/bin/env python3
"""prep38 staging: battles where the DEFENDER has a Substitute up when the attacker uses move X (Scene ON, mechanicLab, Factory legal route).

Recipe (one scenario per (move, attacker side)): the attacker (PERSIAN, fast: speed 31/252, attack IVs 0 so the defender survives) has
[X x4]; the defender (SLOWBRO, slow: speed IV 0, 252 HP / 128 Def / 128 SpD) has [SUBSTITUTE x4]. Turn 1: X on the MON (the control body,
no doll), then the defender subs (164 body on the defender side). Turn 2+: X on the DOLL (the test body); the defender's re-sub fails
("already has a substitute"). Player moves are chosen with A, A (slot 0); the opponent AI has one distinct move. Messages wait for a
button, so every turn is followed by six B presses. Variants: ATTRACT uses a female VAPOREON defender (SLOWBRO's Oblivious blocks it);
`psychic-player-golbat` uses an elevated GOLBAT opponent defender. ATTRACT / SWAGGER cannot be repeated on the mon first (the
infatuated / confused defender may not sub, and a second Attract fails), so they are staged DEFENDER-FIRST: a slow SLOWBRO attacker vs a
fast female PERSIAN defender (no Oblivious), the turn-1 body is already the test body and there is no control body.
usage: prep38Stage.py <outDir>   -> <outDir>/<stem>.json and <outDir>/list.tsv (stem, move, moveId, attackerSide, attacker, defender)
"""
import json, sys
from pathlib import Path
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
# (move, id): top live adapters by Factory weight that reach the attackanimation of a subbed target (damaging; Attract / Swagger have no
# substitute gate before attackanimation; Double Team is self-targeted with the doll as the bystander), + D3 Mud-Slap + D4 Megahorn.
MOVES = [("EARTHQUAKE", 89), ("AERIAL_ACE", 332), ("SHADOW_BALL", 247), ("PSYCHIC", 94), ("ROCK_SLIDE", 157), ("SURF", 57),
         ("ICE_BEAM", 58), ("DOUBLE_EDGE", 38), ("DOUBLE_TEAM", 104), ("THUNDERBOLT", 85), ("ATTRACT", 213), ("BRICK_BREAK", 280),
         ("SLUDGE_BOMB", 188), ("GIGA_DRAIN", 202), ("CRUNCH", 242), ("BODY_SLAM", 34), ("FAINT_ATTACK", 185), ("FLAMETHROWER", 53),
         ("QUICK_ATTACK", 98), ("BITE", 44), ("MEGA_KICK", 25), ("SWAGGER", 207), ("MUD_SLAP", 189), ("MEGAHORN", 224)]
# internal species ids by constant name (Hoenn ids differ from the national dex: SABLEYE = 322)
SPECIES = {s["name"].replace("SPECIES_", ""): s["id"] for s in json.loads((Path(__file__).resolve().parents[2] / "src/data/gen/species-stats.json").read_text())["species"]}
GENDERLESS = {"MAGNETON"}
# Second batch (`df-` stems), all DEFENDER-FIRST (the X body on the doll is the battle's second body, after the defender's Substitute):
# (a) the moves whose PERSIAN <-> SLOWBRO control body is not exact, on their ACCEPTED live pairs (attacker -> target per side);
# (b) the moves whose production order is unknown after [X, SUBSTITUTE] (Giga Drain, Mud-Slap) plus the three whose target is drawn
#     outside liveSceneOnBattlerArt (Ice Beam, Thunderbolt, Megahorn), on SLOWBRO -> PERSIAN (PERSIAN at speed IV 0 still outruns SLOWBRO).
ACCEPTED = [("PSYCHIC", 94, {"player": ("KADABRA", "GOLBAT"), "opponent": ("HAUNTER", "KADABRA")}),
            ("SHADOW_BALL", 247, {"player": ("SABLEYE", "MAGNETON"), "opponent": ("GOLBAT", "SABLEYE")}),
            ("FAINT_ATTACK", 185, {"player": ("MURKROW", "ONIX"), "opponent": ("MURKROW", "ONIX")}),
            ("FLAMETHROWER", 53, {"player": ("HOUNDOUR", "MURKROW"), "opponent": ("HOUNDOUR", "MURKROW")}),
            ("BITE", 44, {"player": ("MEOWTH", "MAGNETON"), "opponent": ("MEOWTH", "MAGNETON")}),
            ("QUICK_ATTACK", 98, {"player": ("PIDGEOTTO", "ONIX"), "opponent": ("PIDGEOTTO", "ONIX")})]
ORDER = [("GIGA_DRAIN", 202), ("MUD_SLAP", 189), ("ICE_BEAM", 58), ("THUNDERBOLT", 85), ("MEGAHORN", 224)]


def mon(species, moves, speed_fast, gender="male"):
    ivs = {"hp": 31, "attack": 0, "defense": 31, "speed": 31 if speed_fast else 0, "spAttack": 0, "spDefense": 31}
    evs = {"hp": 252, "attack": 0, "defense": 0 if speed_fast else 128, "speed": 252 if speed_fast else 0, "spAttack": 0,
           "spDefense": 0 if speed_fast else 128}
    return {"species": SPECIES[species], "level": 50, "nature": 0, "ivs": ivs, "evs": evs, "moves": moves, "ppUps": [0, 0, 0, 0], "item": 0,
            "abilitySlot": 0, "friendship": 70, "gender": gender, "shiny": False}


def filler(species):
    return {"species": species, "level": 50, "nature": 0, "ivs": {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")},
            "evs": {"hp": 252, "attack": 0, "defense": 252, "speed": 0, "spAttack": 0, "spDefense": 0}, "moves": [33, 33, 33, 33],
            "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0, "friendship": 70, "gender": "male", "shiny": False}


def trace(turns=4, b_presses=6):
    seg = []
    for _ in range(turns):
        seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 900, "buttons": []}]
        for _ in range(b_presses):
            seg += [{"frames": 2, "buttons": ["B"]}, {"frames": 120, "buttons": []}]
    return {"segments": seg}


rows = []
def stage(move, mid, side, attacker="PERSIAN", defender="SLOWBRO", tag=None, defender_gender="male", defender_first=False):
    atk = mon(attacker, [mid] * 4, not defender_first, "genderless" if attacker in GENDERLESS else "male")
    dfn = mon(defender, [164] * 4, defender_first, "genderless" if defender in GENDERLESS else defender_gender)
    parties = {"player": [atk if side == "player" else dfn, filler(67), filler(159)],
               "opponent": [dfn if side == "player" else atk, filler(213), filler(202)]}
    sc = {"schemaVersion": 1, "mode": "mechanicLab", "profile": "battle-scene-on", "level": 50, "challengeNum": 4, "battleNum": 0,
          "trainerId": 150, "playerSetIds": [498, 499, 500], "opponentSetIds": [495, 496, 497], "seed": 305419897,
          "overrides": {"parties": parties}, "trace": trace()}
    stem = f"prep38-{tag or move.lower().replace('_', '-')}-{side}"
    (OUT / f"{stem}.json").write_text(json.dumps(sc, separators=(",", ":")) + "\n")
    rows.append((stem, move, mid, side, attacker, defender))


for move, mid in MOVES:
    for side in ("player", "opponent"):
        if move in ("ATTRACT", "SWAGGER"):
            stage(move, mid, side, attacker="SLOWBRO", defender="PERSIAN", defender_first=True, defender_gender="female")
        else:
            stage(move, mid, side)
stage("PSYCHIC", 94, "player", defender="GOLBAT", tag="psychic-golbat")
for move, mid, pairs in ACCEPTED:
    for side, (a, d) in pairs.items():
        stage(move, mid, side, attacker=a, defender=d, defender_first=True, tag=f"df-{move.lower().replace('_', '-')}-{a.lower()}-{d.lower()}")
for move, mid in ORDER:
    for side in ("player", "opponent"):
        stage(move, mid, side, attacker="SLOWBRO", defender="PERSIAN", defender_first=True, tag=f"df-{move.lower().replace('_', '-')}")
(OUT / "list.tsv").write_text("".join("\t".join(map(str, r)) + "\n" for r in rows))
print(len(rows), "scenarios ->", OUT)
