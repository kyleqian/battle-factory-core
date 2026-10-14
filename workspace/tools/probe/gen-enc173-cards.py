#!/usr/bin/env python3
"""Generate the enc173 mechanicLab cards from the enc160-c2ice template (trace and seed are reused)."""
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CARDS = ROOT / "tools/probe/rcp154"
TEMPLATE = json.loads((CARDS / "enc160-c2ice-iceball-encore-census771-off.json").read_text())

MOVES = {"ENCORE": 227, "THRASH": 37, "UPROAR": 253, "ROLLOUT": 205, "TACKLE": 33, "POUND": 1, "SPLASH": 150,
         "TAIL_WHIP": 39, "HARDEN": 106, "DEFENSE_CURL": 111, "MIMIC": 102, "SING": 47, "WISH": 273,
         "DOUBLE_SLAP": 3, "METRONOME": 118, "FLASH": 148, "SEISMIC_TOSS": 69, "ICE_BALL": 301, "HAIL": 258}
IVS = {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")}
ZERO = {k: 0 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")}


def mon(species, level, moves, nature=0, evs=None, ivs=None):
    return {
        "species": species, "level": level, "nature": nature, "ivs": ivs or dict(IVS), "evs": evs or dict(ZERO),
        "moves": [MOVES[m] for m in moves], "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0,
        "friendship": 70, "gender": "male", "shiny": False,
    }


PLUSLE = lambda: mon(353, 50, ["ENCORE"] * 4, nature=5, evs={**ZERO, "hp": 255, "defense": 255})
FILLER = lambda: mon(129, 50, ["SPLASH"] * 4)

CARD_DEFS = {
    # id: (file, player lead, opponent lead, seed)
    "thr": ("enc173-thr-thrash-midturn-encore-off.json", mon(246, 29, ["THRASH", "TACKLE", "TAIL_WHIP", "TACKLE"]), PLUSLE()),
    "upr": ("enc173-upr-uproar-midturn-encore-off.json", mon(370, 10, ["UPROAR", "POUND", "POUND", "POUND"]), PLUSLE()),
    "rol": ("enc173-rol-rollout-midturn-encore-off.json", mon(183, 15, ["ROLLOUT", "TACKLE", "TAIL_WHIP", "TACKLE"]), PLUSLE()),
}


def build(key, seed=None):
    name, player, opp = CARD_DEFS[key]
    card = copy.deepcopy(TEMPLATE)
    card["overrides"]["parties"]["player"][0] = player
    card["overrides"]["parties"]["opponent"][0] = opp
    if seed is not None:
        card["seed"] = seed
    return name, card


if __name__ == "__main__":
    import sys
    for key in sys.argv[1:] or CARD_DEFS:
        name, card = build(key)
        (CARDS / name).write_text(json.dumps(card, indent=1) + "\n")
        print(name)
