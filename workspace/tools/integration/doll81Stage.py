#!/usr/bin/env python3
"""doll81 staging: the largest Substitute-doll declines of the census (seeds 0..999, master 1e2f48b8a), each with a real Substitute.

Two families, both in the prep38 / prep40 scenario shape (mechanicLab parties, Scene ON, lab seed 305419897 pinned):
- `att` (ATTACKER behind its own doll: SUBSTITUTE_TO_MON, idle row, body on the mon, MON_TO_SUBSTITUTE): prep40Stage.py's recipe. The fast
  attacker has [SUBSTITUTE, X, X, X] (player: turn 1 slot 0, then RIGHT -> slot 1) or [SUBSTITUTE x3, X] (opponent AI); the slow defender
  has [TACKLE x4]. Self-target X (Double Team, Recover, Sunny Day) are the `self` class: the same recipe.
  Dream Eater needs a sleeping target: player attacker [SUBSTITUTE, SPORE, DREAM_EATER x2] (turn 3+: DOWN -> slot 3); opponent attacker
  [SUBSTITUTE x3, DREAM_EATER] vs a player defender [BELLY_DRUM, REST, TACKLE x2] (turn 1 slot 0, then slot 1: it rests itself asleep).
- `def` (DEFENDER shown as the doll): prep38Stage.py's recipe. Fast attacker [X x4], slow defender [SUBSTITUTE x4]: turn 1 X on the mon
  (control body), the defender subs, turn 2+ X on the doll (test body).
Pairs: PERSIAN <-> SLOWBRO (prep38 / prep40's), and a second pair per cell with an ELEVATED GOLBAT: an opponent GOLBAT attacker vs a
player LAPRAS, or a player GENGAR attacker vs an opponent GOLBAT defender.
usage: doll81Stage.py <outDir>   -> <outDir>/<stem>.json, <outDir>/list.tsv (stem, move, moveId, attackerSide, attacker, defender, family)
"""
import json, sys
from pathlib import Path
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
R = Path(__file__).resolve().parents[2]
SPECIES = {s["name"].replace("SPECIES_", ""): s["id"] for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
MOVE = {m["move"].replace("MOVE_", ""): m["id"] for m in json.loads((R / "src/data/gen/moves.json").read_text())["moves"]}
SUB, TACKLE = 164, 33
# (move, sides, family) largest census decline first (docs/next-adapters-doll81.md s0).
CELLS = [("DREAM_EATER", "att"), ("DOUBLE_TEAM", "self"), ("LEAF_BLADE", "def"), ("THUNDER_PUNCH", "def"), ("GRASS_WHISTLE", "att"),
         ("SOLAR_BEAM", "att"), ("RECOVER", "self"), ("LOVELY_KISS", "att"), ("FOCUS_PUNCH", "att"), ("PSYCH_UP", "def"), ("DIG", "def"),
         ("SING", "att"), ("SUNNY_DAY", "self"), ("DOUBLE_EDGE", "def"), ("IRON_TAIL", "def")]
PAIRS = {"player": [("PERSIAN", "SLOWBRO"), ("GENGAR", "GOLBAT")], "opponent": [("PERSIAN", "SLOWBRO"), ("GOLBAT", "LAPRAS")]}


def mon(species, moves, fast):
    ivs = {"hp": 31, "attack": 0, "defense": 31, "speed": 31 if fast else 0, "spAttack": 0, "spDefense": 31}
    evs = {"hp": 252, "attack": 0, "defense": 0 if fast else 128, "speed": 252 if fast else 0, "spAttack": 0, "spDefense": 0 if fast else 128}
    return {"species": SPECIES[species], "level": 50, "nature": 0, "ivs": ivs, "evs": evs, "moves": moves, "ppUps": [0, 0, 0, 0], "item": 0,
            "abilitySlot": 0, "friendship": 70, "gender": "male", "shiny": False}


def filler(species):
    return {"species": species, "level": 50, "nature": 0, "ivs": {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")},
            "evs": {"hp": 252, "attack": 0, "defense": 252, "speed": 0, "spAttack": 0, "spDefense": 0}, "moves": [TACKLE] * 4,
            "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0, "friendship": 70, "gender": "male", "shiny": False}


def trace(picks, turns, b_presses=6):
    """picks[t] = the cursor buttons of turn t (the last entry repeats)."""
    seg = []
    for t in range(turns):
        seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}]
        for b in picks[min(t, len(picks) - 1)]:
            seg += [{"frames": 2, "buttons": [b]}, {"frames": 30, "buttons": []}]
        seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 900, "buttons": []}]
        for _ in range(b_presses):
            seg += [{"frames": 2, "buttons": ["B"]}, {"frames": 120, "buttons": []}]
    return {"segments": seg}


rows = []
for move, family in CELLS:
    mid = MOVE[move]
    for side in ("player", "opponent"):
        for k, (atk_name, def_name) in enumerate(PAIRS[side]):
            turns, picks = 4, [[]]
            dfn_moves = [TACKLE] * 4
            if family == "def":
                atk, dfn = mon(atk_name, [mid] * 4, True), mon(def_name, [SUB] * 4, False)
            else:
                atk_moves = [SUB, mid, mid, mid] if side == "player" else [SUB, SUB, SUB, mid]
                if side == "player": picks = [[], ["RIGHT"]]
                if move == "DREAM_EATER":
                    if side == "player":
                        atk_moves, picks = [SUB, MOVE["SPORE"], mid, mid], [[], ["RIGHT"], ["DOWN"]]
                    else:
                        dfn_moves, picks = [MOVE["BELLY_DRUM"], MOVE["REST"], TACKLE, TACKLE], [[], ["RIGHT"]]
                if move in ("SOLAR_BEAM", "DREAM_EATER", "GRASS_WHISTLE", "LOVELY_KISS", "SING", "FOCUS_PUNCH"): turns = 5
                atk, dfn = mon(atk_name, atk_moves, True), mon(def_name, dfn_moves, False)
            parties = {"player": [atk if side == "player" else dfn, filler(67), filler(159)],
                       "opponent": [dfn if side == "player" else atk, filler(213), filler(202)]}
            sc = {"schemaVersion": 1, "mode": "mechanicLab", "profile": "battle-scene-on", "level": 50, "challengeNum": 4, "battleNum": 0,
                  "trainerId": 150, "playerSetIds": [498, 499, 500], "opponentSetIds": [495, 496, 497], "seed": 305419897,
                  "overrides": {"parties": parties}, "trace": trace(picks, turns)}
            stem = f"doll81-{family}-{move.lower().replace('_', '-')}-{side}{'' if k == 0 else '-' + atk_name.lower()}"
            (OUT / f"{stem}.json").write_text(json.dumps(sc, separators=(",", ":")) + "\n")
            rows.append((stem, move, str(mid), side, atk_name, def_name, family))
(OUT / "list.tsv").write_text("".join("\t".join(r) + "\n" for r in rows))
print(len(rows), "scenarios ->", OUT)
