#!/usr/bin/env python3
"""mvs1 (docs/mvs1-called-move-sounds.md): ROM sound labs for the bodies Cmd_attackanimation animates under HITMARKER_NO_ANIMATIONS, Substitute and
Transform, in both scenes (Will-O-Wisp's are aud260's: tools/battle-lab/aud260-willowisp-<side>-on.json). Template =
snd3's (hpf4m-firespin-on: Lv50 Rattata vs Lv50 Rattata, overrides.parties). `player` = the player's Lv50 Rattata uses the move (four slots);
`opp` = the foe's Lv50 Rattata does. The other side's lead is a Lv25 Rattata with Seismic Toss x4 (always slower, so the move is the turn's
first body). One turn: A, A, 1100 frames. Writes tools/battle-lab/mvs1-<move>-<side>-<scene>.json; the app stages of the same names are
tools/compare/appTrace.ts mvs1Stages.  usage: mvs1Labs.py
"""
import json, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
tpl = json.load(open(os.path.join(root, "tools/battle-lab/hpf4m-firespin-on.json")))
SEISMIC_TOSS = 69
OTHER_LEVEL = 25
MOVES = {"substitute": (164, ("on", "off")), "transform": (144, ("on", "off"))}
TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1100, "buttons": []}]


def build(name: str, side: str, scene: str) -> str:
    sid = f"mvs1-{name}-{side}-{scene}"
    lab = json.loads(json.dumps(tpl))
    lab["profile"] = "battle-scene-on" if scene == "on" else "battle-scene-off"
    lab["seed"] = 1
    user, other = ("player", "opponent") if side == "player" else ("opponent", "player")
    for mon in lab["overrides"]["parties"][user]:
        mon["moves"] = [MOVES[name][0]] * 4
    lab["overrides"]["parties"][other][0]["moves"] = [SEISMIC_TOSS] * 4
    lab["overrides"]["parties"][other][0]["level"] = OTHER_LEVEL
    lab["trace"]["segments"] = TURN
    json.dump(lab, open(os.path.join(root, f"tools/battle-lab/{sid}.json"), "w"))
    return sid


if __name__ == "__main__":
    for n, (_, scenes) in MOVES.items():
        for side in ("player", "opp"):
            for scene in scenes:
                print(build(n, side, scene))
