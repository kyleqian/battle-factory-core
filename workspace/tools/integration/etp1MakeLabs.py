#!/usr/bin/env python3
"""etp1: write the end-turn print labs (tools/battle-lab/etp1-*-{on,off}.json): a Rattata (Gastly for Curse) user and a Rattata / Chansey target, from
wtl1-rain-player-on.json. Per scenario: user moves (slot order), target level / species / item, number of turns, and the per-turn slot to press.
usage: etp1MakeLabs.py [name ...]"""
import json
import sys
from pathlib import Path

LAB = Path(__file__).parent.parent / "battle-lab"
base_on = json.load(open(LAB / "wtl1-rain-player-on.json"))
IV = {k: 31 for k in ("hp", "attack", "defense", "speed", "spAttack", "spDefense")}
EV = {k: 0 for k in IV}


def mon(species, level, moves, item=0):
    return {"species": species, "level": level, "nature": 0, "ivs": IV, "evs": EV, "moves": (moves + [moves[0]] * 4)[:4], "ppUps": [0] * 4, "item": item, "abilitySlot": 0}


# name: (user species, user level, user moves, user item, target species, target level, target moves, target item, slot per turn)
S = {
    "sandstorm": (19, 50, [201], 0, 19, 12, [69], 0, [0]),
    "hail": (19, 50, [258], 0, 19, 12, [69], 0, [0]),
    "sun": (19, 50, [241], 0, 19, 12, [69], 0, [0]),
    "sandstorm5": (19, 50, [201], 0, 19, 12, [69], 0, [0] * 5),
    "hail5": (19, 50, [258], 0, 19, 12, [69], 0, [0] * 5),
    "sun5": (19, 50, [241], 0, 19, 12, [69], 0, [0] * 5),
    "rain5": (19, 50, [240], 0, 19, 12, [69], 0, [0] * 5),
    "leechseed": (19, 50, [73], 0, 19, 12, [69], 0, [0]),
    "leechseed2": (19, 50, [73], 0, 19, 12, [69], 0, [0, 0]),
    "leechseedc": (19, 50, [73], 0, 113, 50, [69], 0, [0]),
    "ingrain": (19, 50, [275], 0, 19, 12, [69], 0, [0]),
    "leftovers": (19, 50, [69], 200, 113, 50, [69], 0, [0, 0]),
    "shellbell": (19, 50, [69], 219, 113, 50, [69], 0, [0]),
    "curse": (92, 50, [174], 0, 19, 12, [247], 0, [0] * 3),
    "perish": (19, 50, [195], 0, 19, 12, [69], 0, [0] * 4),
    "futuresight": (19, 50, [248], 0, 19, 12, [69], 0, [0] * 3),
    "wish": (19, 50, [273], 0, 19, 12, [69], 0, [0] * 2),
    "uproar": (19, 50, [253], 0, 113, 50, [69], 0, [0] * 2),
    "taunt": (19, 50, [269], 0, 19, 12, [69], 0, [0] * 3),
    "disable": (19, 50, [50], 0, 19, 12, [69], 0, [0] * 6),
    "encore": (19, 50, [227], 0, 19, 12, [69], 0, [0] * 6),
    "toxic": (19, 50, [92], 0, 19, 12, [69], 0, [0]),
    "willowisp": (19, 50, [261], 0, 19, 12, [69], 0, [0]),
    "poison": (19, 50, [92], 0, 19, 12, [69], 0, [0]),
    "toxic3": (19, 50, [92], 0, 19, 12, [69], 0, [0] * 3),
    "willowisp3": (19, 50, [261], 0, 19, 12, [69], 0, [0] * 3),
    "wrap": (19, 50, [35], 0, 113, 50, [69], 0, [0, 0, 0]),
    "firespin": (19, 50, [83], 0, 113, 50, [69], 0, [0, 0, 0]),
    "whirlpool": (19, 50, [250], 0, 113, 50, [69], 0, [0, 0, 0]),
    "twave": (19, 50, [86], 0, 19, 12, [69], 0, [0]),
    "roar": (19, 50, [201, 46], 0, 19, 12, [69], 0, [0, 2]),
    "whirlwind": (19, 50, [201, 18], 0, 19, 12, [69], 0, [0, 2]),
    "spore": (19, 50, [147], 0, 19, 12, [69], 0, [0]),
    # etp3: a Sandshrew (immune) user moves first, so the first damaging-weather pass is skipped; screens expiring on turn 5
    "sandstormu3": (27, 50, [201], 0, 19, 12, [69], 0, [0] * 3),
    "lightscreen6": (19, 50, [113], 0, 19, 12, [69], 0, [0] * 6),
    "reflect6": (19, 50, [115], 0, 19, 12, [69], 0, [0] * 6),
    # a foe's Leech Seed drain follows the side-status wear-off print in the same end turn
    "lightscreenls6": (19, 50, [113], 0, 19, 12, [73], 0, [0] * 6),
    "reflectls6": (19, 50, [115], 0, 19, 12, [73], 0, [0] * 6),
    # sep1: the foe's Recover (it is seeded, so damaged) followed by the end-turn drain
    "recoverls4": (19, 50, [73], 0, 19, 12, [105], 0, [0] * 4),
    # rcv1: the foe's restore-HP move after the drain damaged it (turn 2): hp -> "regained health" print
    "slackoffls2": (19, 50, [73], 0, 19, 12, [303], 0, [0] * 2),
    # ldw1: a seeded foe's weather move (first turn sets it, every end turn ticks the weather and then drains)
    "sunls3": (19, 50, [73], 0, 19, 12, [241], 0, [0] * 3),
    "haills3": (19, 50, [73], 0, 19, 12, [258], 0, [0] * 3),
    "sandls3": (19, 50, [73], 0, 19, 12, [201], 0, [0] * 3),
    # ldw1: the foe is KOed on turn 2 and replaced; the seeded player's drain follows the foe's send-in
    "foesendls2": (19, 50, [106, 69], 0, 19, 12, [73], 0, [0, 1]),
    "morningsunls2": (19, 50, [73], 0, 19, 12, [234], 0, [0] * 2),
    "synthesisls2": (19, 50, [73], 0, 19, 12, [235], 0, [0] * 2),
    "moonlightls2": (19, 50, [73], 0, 19, 12, [236], 0, [0] * 2),
    "softboiledls2": (19, 50, [73], 0, 19, 12, [135], 0, [0] * 2),
    "milkdrinkls2": (19, 50, [73], 0, 19, 12, [208], 0, [0] * 2),
}
ETP3 = {"sandstormu3", "lightscreen6", "reflect6", "lightscreenls6", "reflectls6", "recoverls4", "sunls3", "haills3", "sandls3", "foesendls2", "slackoffls2", "morningsunls2", "synthesisls2", "moonlightls2", "softboiledls2", "milkdrinkls2"}
want = sys.argv[1:] or list(S)
for name in want:
    us, ul, um, ui, ts, tl, tm, ti, slots = S[name]
    for scene in ("on", "off"):
        lab = json.loads(json.dumps(base_on))
        lab["profile"] = f"battle-scene-{scene}"
        lab["overrides"]["parties"] = {"player": [mon(us, ul, um, ui)] * 3, "opponent": [mon(ts, tl, tm, ti)] * 3}
        seg = []
        for slot in slots:
            if slot and seg:
                seg[-1]["frames"] += 600
            seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}]
            if slot:
                seg += [{"frames": 2, "buttons": ["RIGHT"]}, {"frames": 10, "buttons": []}]
            if slot == 2:
                seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 700, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1100, "buttons": []}]
            else:
                seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 1100, "buttons": []}]
        if name == "foesendls2":  # the KO turn: the faint box waits for A presses (swt1-foe-faint-poison's tail)
            seg[-1]["frames"] = 400
            for _ in range(6):
                seg += [{"frames": 2, "buttons": ["A"]}, {"frames": 120, "buttons": []}]
            seg += [{"frames": 1200, "buttons": []}]
        lab["trace"]["segments"] = seg
        json.dump(lab, open(LAB / f"{'etp3' if name in ETP3 else 'etp1'}-{name}-{scene}.json", "w"))
    print(("etp3-" if name in ETP3 else "etp1-") + name)
