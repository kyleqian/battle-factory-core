#!/usr/bin/env python3
"""snd3 (docs/snd3-sweep-sounds.md): Scene ON labs for the quiet-BGM moves (gMovesWithQuietBGM: Sing, Perish Song, GrassWhistle) and
for Baton Pass's instant `returntoball`. Template = hpf4m-firespin-on (Lv50 Rattata vs Lv50 Rattata, overrides.parties). `player` = the
player's Lv50 Rattata uses the move (four slots); `opp` = the foe's Lv50 Rattata does. The other side's lead is a Lv25 Rattata with Seismic
Toss x4 (fixed damage, always slower). Quiet-BGM labs: one turn (A, A, 1100 frames). The player's Baton Pass opens the forced party
menu, whose app side needs real rental records: template pau5-faint-trace-on (Diglett 39 / Porygon 273 / Shuckle 432 with the ROM's
personalities, a Lv50 Rattata foe with Seismic Toss x4); Diglett gets Baton Pass x4: A, A, 300 frames, the party menu (DOWN, DOWN to
SHUCKLE, A, A = SHIFT), 1100 frames. Writes tools/battle-lab/snd3-<move>-<side>-on.json.  usage: snd3Labs.py
"""
import json, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
tpl = json.load(open(os.path.join(root, "tools/battle-lab/hpf4m-firespin-on.json")))
SEISMIC_TOSS = 69
OTHER_LEVEL = 25
MOVES = {"sing": 47, "perishsong": 195, "grasswhistle": 320, "batonpass": 226}
TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1100, "buttons": []}]
BATON_PASS_PLAYER_TURN = [
    {"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 300, "buttons": []},
    {"frames": 2, "buttons": ["DOWN"]}, {"frames": 20, "buttons": []}, {"frames": 2, "buttons": ["DOWN"]}, {"frames": 20, "buttons": []},
    {"frames": 2, "buttons": ["A"]}, {"frames": 40, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1100, "buttons": []},
]


def build(name: str, side: str, seed: int = 1) -> str:
    sid = f"snd3-{name}-{side}-on" + ("" if seed == 1 else f"-s{seed}")
    if (name, side) == ("batonpass", "player"):
        lab = json.load(open(os.path.join(root, "tools/battle-lab/pau5-faint-trace-on.json")))
        lab["overrides"]["parties"]["player"][0]["moves"] = [MOVES[name]] * 4
        lab["trace"]["segments"] = BATON_PASS_PLAYER_TURN
        json.dump(lab, open(os.path.join(root, f"tools/battle-lab/{sid}.json"), "w"))
        return sid
    lab = json.loads(json.dumps(tpl))
    lab["profile"] = "battle-scene-on"
    lab["seed"] = seed
    user, other = ("player", "opponent") if side == "player" else ("opponent", "player")
    for mon in lab["overrides"]["parties"][user]:
        mon["moves"] = [MOVES[name]] * 4
    lab["overrides"]["parties"][other][0]["moves"] = [SEISMIC_TOSS] * 4
    lab["overrides"]["parties"][other][0]["level"] = OTHER_LEVEL
    lab["trace"]["segments"] = TURN
    json.dump(lab, open(os.path.join(root, f"tools/battle-lab/{sid}.json"), "w"))
    return sid


if __name__ == "__main__":
    for n in MOVES:
        for side in ("player", "opp"):
            print(build(n, side))
