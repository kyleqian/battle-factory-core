#!/usr/bin/env python3
"""Live audit 21: the land82 doll cells (docs/land82-doll-cells.md) with OTHER species, doll81Stage.py's recipe unchanged (mechanicLab
parties, Scene ON, lab seed 305419897 pinned; `att` / `self` = the fast attacker behind its own doll, `def` = the slow defender shown as the
doll, turn 1 the control body on the mon). Only the 13 landed cells:
  att  Dream Eater 138 opponent, GrassWhistle 320 player, SolarBeam 76 both (charge turn), Lovely Kiss 142 both, Sing 47 player;
  self Sunny Day 241 both, plus Sunny Day with RAIN (the defender's RAIN_DANCE 240) / SANDSTORM 201 already active (suffix -rain / -sand);
  def  Leaf Blade 348 both, ThunderPunch 9 both, plus a doll that BREAKS during the body (suffix -break: the attacker has attack IV 31 +
       252 Atk EVs, HP EVs 0; EV total 504).
Pairs (none shiny): player SNORLAX (big) -> AZURILL (small), AZURILL -> CROBAT (elevated opponent defender); opponent CROBAT (elevated
attacker) -> SNORLAX, AZURILL -> WAILORD (big player defender).
usage: audit21DollStage.py <outDir>   -> <outDir>/<stem>.json, <outDir>/list.tsv (doll81's 7 columns)
"""
import json, sys
from pathlib import Path
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
R = Path(__file__).resolve().parents[2]
SPECIES = {s["name"].replace("SPECIES_", ""): s["id"] for s in json.loads((R / "src/data/gen/species-stats.json").read_text())["species"]}
MOVE = {m["move"].replace("MOVE_", ""): m["id"] for m in json.loads((R / "src/data/gen/moves.json").read_text())["moves"]}
SUB, TACKLE = 164, 33
CELLS = [("DREAM_EATER", "att", ("opponent",)), ("GRASS_WHISTLE", "att", ("player",)), ("SOLAR_BEAM", "att", ("player", "opponent")),
         ("LOVELY_KISS", "att", ("player", "opponent")), ("SING", "att", ("player",)), ("SUNNY_DAY", "self", ("player", "opponent")),
         ("LEAF_BLADE", "def", ("player", "opponent")), ("THUNDER_PUNCH", "def", ("player", "opponent"))]
PAIRS = {"player": [("SNORLAX", "AZURILL"), ("AZURILL", "CROBAT")], "opponent": [("CROBAT", "SNORLAX"), ("AZURILL", "WAILORD")]}


def mon(species, moves, fast, strong=False):  # doll81Stage.py's mon(); strong = the doll-breaking attacker
    ivs = {"hp": 31, "attack": 31 if strong else 0, "defense": 31, "speed": 31 if fast else 0, "spAttack": 0, "spDefense": 31}
    evs = {"hp": 0 if strong else 252, "attack": 252 if strong else 0, "defense": 0 if fast else 128, "speed": 252 if fast else 0,
           "spAttack": 0, "spDefense": 0 if fast else 128}
    assert sum(evs.values()) <= 510
    return {"species": SPECIES[species], "level": 50, "nature": 0, "ivs": ivs, "evs": evs, "moves": moves, "ppUps": [0, 0, 0, 0], "item": 0,
            "abilitySlot": 0, "friendship": 70, "gender": "male", "shiny": False}


def filler(species):
    return {"species": species, "level": 50, "nature": 0, "ivs": {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")},
            "evs": {"hp": 252, "attack": 0, "defense": 252, "speed": 0, "spAttack": 0, "spDefense": 0}, "moves": [TACKLE] * 4,
            "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0, "friendship": 70, "gender": "male", "shiny": False}


def trace(picks, turns, b_presses=6):  # doll81Stage.py's trace()
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


def stage(move, family, side, k, atk_name, def_name, variant=""):
    mid = MOVE[move]
    turns, picks = 4, [[]]
    dfn_moves = [TACKLE] * 4
    if family == "def":
        atk, dfn = mon(atk_name, [mid] * 4, True, variant == "break"), mon(def_name, [SUB] * 4, False)
    else:
        atk_moves = [SUB, mid, mid, mid] if side == "player" else [SUB, SUB, SUB, mid]
        if side == "player": picks = [[], ["RIGHT"]]
        if move == "DREAM_EATER":
            dfn_moves, picks = [MOVE["BELLY_DRUM"], MOVE["REST"], TACKLE, TACKLE], [[], ["RIGHT"]]
        if variant in ("rain", "sand"):
            dfn_moves = [MOVE["RAIN_DANCE" if variant == "rain" else "SANDSTORM"]] * 4
        if move in ("SOLAR_BEAM", "DREAM_EATER", "GRASS_WHISTLE", "LOVELY_KISS", "SING"): turns = 5
        atk, dfn = mon(atk_name, atk_moves, True), mon(def_name, dfn_moves, False)
    parties = {"player": [atk if side == "player" else dfn, filler(67), filler(159)],
               "opponent": [dfn if side == "player" else atk, filler(213), filler(202)]}
    sc = {"schemaVersion": 1, "mode": "mechanicLab", "profile": "battle-scene-on", "level": 50, "challengeNum": 4, "battleNum": 0,
          "trainerId": 150, "playerSetIds": [498, 499, 500], "opponentSetIds": [495, 496, 497], "seed": 305419897,
          "overrides": {"parties": parties}, "trace": trace(picks, turns)}
    stem = f"a21-{family}-{move.lower().replace('_', '-')}-{side}-{atk_name.lower()}{'-' + variant if variant else ''}"
    (OUT / f"{stem}.json").write_text(json.dumps(sc, separators=(",", ":")) + "\n")
    rows.append((stem, move, str(mid), side, atk_name, def_name, family))


for move, family, sides in CELLS:
    for side in sides:
        for k, (a, d) in enumerate(PAIRS[side]):
            stage(move, family, side, k, a, d)
for side in ("player", "opponent"):
    a, d = PAIRS[side][0]
    stage("SUNNY_DAY", "self", side, 0, a, d, "rain")
    stage("SUNNY_DAY", "self", side, 0, a, d, "sand")
    for move in ("LEAF_BLADE", "THUNDER_PUNCH"):
        stage(move, "def", side, 0, a, d, "break")
(OUT / "list.tsv").write_text("".join("\t".join(r) + "\n" for r in rows))
print(len(rows), "scenarios ->", OUT)
