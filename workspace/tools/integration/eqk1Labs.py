#!/usr/bin/env python3
"""eqk1: labs for the hit-all loop (Earthquake / Magnitude / Explosion / Selfdestruct) where the target survives and the next mover's SE shows the tail.
Writes tools/battle-lab/eqk1-<move>-<who>.json. `p` = the player's Lv50 Rattata uses the move on a Lv100 Shuckle that answers with Seismic Toss;
`f` = the Lv100 foe Rattata uses the move on a Lv50 Shuckle that answers with Seismic Toss. Run labCompare.sh --scene both on them."""
import json, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
tpl = json.load(open(os.path.join(root, "tools/battle-lab/liv2-earthquake-player-on.json")))
MOVES = {"eq": 89, "mag": 222, "expl": 153, "sd": 120}
def mon(species, level, move):
    m = json.loads(json.dumps(tpl["overrides"]["parties"]["player"][0]))
    m.update(species=species, level=level, moves=[move] * 4)
    return m
def build(name, who, frames=900):
    mv = MOVES[name]
    lab = json.loads(json.dumps(tpl))
    lab["profile"] = "battle-scene-on"
    if who == "p":
        plr, foe = mon(19, 50, mv), mon(213, 100, 69)
    else:
        plr, foe = mon(213, 50, 69), mon(19, 100, mv)
    lab["overrides"]["parties"]["player"][0] = plr
    lab["overrides"]["parties"]["opponent"][0] = foe
    lab["trace"]["segments"][3]["frames"] = frames
    json.dump(lab, open(os.path.join(root, f"tools/battle-lab/eqk1-{name}-{who}.json"), "w"))
    print(f"eqk1-{name}-{who}")
for n in MOVES:
    for w in "pf":
        build(n, w)

def struggle():
    """Forced Struggle: the Lv50 player's only move is Splash (status), the Lv40 foe's Taunt (turn 1) leaves it no legal move; turn 2 auto-selects Struggle (enc276 shape, both scenes)."""
    lab = json.load(open(os.path.join(root, "tools/battle-lab/enc276-struggle-off.json")))
    lab["profile"] = "battle-scene-off"
    lab["trace"] = {"segments": [{"frames": 2, "buttons": ["A"]}, {"frames": 24, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 900, "buttons": []},
                                 {"frames": 2, "buttons": ["A"]}, {"frames": 43, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 700, "buttons": []}]}
    json.dump(lab, open(os.path.join(root, "tools/battle-lab/eqk1-struggle.json"), "w"))
    print("eqk1-struggle")
struggle()

def immune():
    """Earthquake into a Flying foe (the s1914 decision-10 shape: no effect, then the foe's Drill Peck): the player's Lv100 Rattata vs a Lv30 Pidgey using Drill Peck."""
    lab = json.loads(json.dumps(tpl))
    lab["profile"] = "battle-scene-on"
    lab["overrides"]["parties"]["player"][0] = mon(19, 100, 89)
    lab["overrides"]["parties"]["opponent"][0] = mon(16, 30, 65)
    lab["trace"]["segments"][3]["frames"] = 900
    json.dump(lab, open(os.path.join(root, "tools/battle-lab/eqk1-eq-imm.json"), "w"))
    print("eqk1-eq-imm")
immune()

def immune_single():
    """The single-target twin of eq-imm: the player's Lv100 Rattata Tackles a Lv30 Gastly (no effect), then the foe answers with Tackle."""
    lab = json.loads(json.dumps(tpl))
    lab["profile"] = "battle-scene-on"
    lab["overrides"]["parties"]["player"][0] = mon(19, 100, 33)
    lab["overrides"]["parties"]["opponent"][0] = mon(92, 30, 33)
    lab["trace"]["segments"][3]["frames"] = 900
    json.dump(lab, open(os.path.join(root, "tools/battle-lab/eqk1-tackle-imm.json"), "w"))
    print("eqk1-tackle-imm")
immune_single()
