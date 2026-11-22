#!/usr/bin/env python3
"""etk1: Level 50 labs for the end-of-turn knock-out path (docs/etk1-end-turn-ko.md), both scenes -> tools/battle-lab/etk1-<case>-{on,off}.json.
A low-HP player Pokemon is made by real moves (Belly Drum, Substitute): current HP cannot be set in a lab. usage: etk1Labs.py [case ...]"""
import json
import sys
from pathlib import Path

LAB = Path(__file__).parent.parent / "battle-lab"
base = json.load(open(LAB / "wtl1-rain-player-on.json"))
IV = {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")}
EV = {k: 0 for k in IV}
RATTATA, SHEDINJA = 19, 303
SPLASH, SEISMIC, LEECH, TOXIC, PERISH, POISONPOWDER = 150, 69, 73, 92, 195, 77


def mon(species, level, move):
    return {"species": species, "level": level, "nature": 0, "ivs": IV, "evs": EV, "moves": [move] * 4, "ppUps": [0] * 4, "item": 0, "abilitySlot": 0}


A = lambda n=2: {"frames": n, "buttons": ["A"]}
I = lambda n: {"frames": n, "buttons": []}
TURN = [A(), I(18), A()]  # open Fight, pick slot 0 (all four slots are the same move)
# case: (player party, foe party, trace after the first turn's selection; each turn = TURN + the idle/press list)
BELLY_DRUM = 187
# The player's lead is a full-HP Rattata L20 (HP 48): turn 1 Belly Drum (-24), then Splash; the foe's seed (-6 a turn) / Toxic (-3, -6, -9, -12) knocks it
# out at the end of turn 4.  (No Substitute: a faint behind a substitute plays the substitute-to-mon animation first.)  Foe: Rattata L49, one move in all four slots.
def mon2(species, level, moves):
    m = mon(species, level, moves[0])
    m["moves"] = moves
    return m


def plr():
    return [mon2(RATTATA, 20, [BELLY_DRUM, SPLASH, SPLASH, SPLASH])] + [mon(RATTATA, 50, SPLASH)] * 2


def foe(move, level=49):
    return [mon(RATTATA, level, move)] * 3


T2 = [A(), I(18), {"frames": 2, "buttons": ["RIGHT"]}, I(10), A()]
T34 = [A(), I(18), A()]
SPAM = [I(28), A()] * 70
def four_turns(tail):
    return TURN + [I(1000)] + T2 + [I(1000)] + T34 + [I(1000)] + T34 + tail


CASES = {
    "leech-hold": (plr(), foe(LEECH), four_turns([I(1500)])),
    "leech-spam": (plr(), foe(LEECH), four_turns(SPAM)),
    "poison-hold": (plr(), foe(TOXIC), four_turns([I(1500)])),
    "poison-spam": (plr(), foe(TOXIC), four_turns(SPAM)),
    # Perish Song by the player (the foe's AI may switch): the count prints 3..1 at the end of turns 1-3 and 0 (the lead faints) at the end of turn 4
    "perish-hold": ([mon(RATTATA, 50, PERISH), mon(RATTATA, 50, SPLASH), mon(RATTATA, 50, SPLASH)], foe(SPLASH, 50), (TURN + [I(1100)]) * 3 + TURN + [I(1800)]),
    "perish-spam": ([mon(RATTATA, 50, PERISH), mon(RATTATA, 50, SPLASH), mon(RATTATA, 50, SPLASH)], foe(SPLASH, 50), (TURN + [I(1100)]) * 3 + TURN + SPAM),
}
want = sys.argv[1:] or list(CASES)
for name in want:
    plr, foe, seg = CASES[name]
    for scene in ("on", "off"):
        lab = json.loads(json.dumps(base))
        lab["profile"] = f"battle-scene-{scene}"
        lab["overrides"]["parties"] = {"player": plr, "opponent": foe}
        lab["trace"]["segments"] = seg
        json.dump(lab, open(LAB / f"etk1-{name}-{scene}.json", "w"))
    print("etk1-" + name)
