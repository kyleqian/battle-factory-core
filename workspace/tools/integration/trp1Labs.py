#!/usr/bin/env python3
"""trp1 (docs/trp1-turn-trap-animation.md): the end-of-turn trap animation (General_TurnTrap), one lab per trapping move, trapped side
and scene. Template = hpf4m-firespin-on (Lv50 Rattata vs Lv50 Rattata, overrides.parties). `player` = the player's Rattata is trapped
(the foe's four slots are the trapping move); `opp` = the foe is trapped (the player's slots are the move). The trapped Rattata is
Lv25 with Seismic Toss x4 (fixed damage, an exact live body, and always slower than the Lv50 trapper). Two turns of A, A, 1100 frames. Writes tools/battle-lab/trp1-<move>-<side>-<scene>.json.
The app stages (tools/compare/appTrace.ts TRP1_ROM_RNG) start from the ROM's gRngValue at trace frame 0 (the lab's capture state),
so accuracy, damage and trap-length rolls are the ROM's.  usage: trp1Labs.py [move ...]   (no args = every move)
"""
import json, os, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
tpl = json.load(open(os.path.join(root, "tools/battle-lab/hpf4m-firespin-on.json")))
SEISMIC_TOSS = 69
TRAPPED_LEVEL = 25
MOVES = {"wrap": 35, "bind": 20, "firespin": 83, "whirlpool": 250, "sandtomb": 328, "clamp": 128}
TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 1100, "buttons": []}]


def build(name: str, side: str, scene: str, seed: int = 1) -> str:
    lab = json.loads(json.dumps(tpl))
    lab["profile"] = f"battle-scene-{scene}"
    lab["seed"] = seed
    trapper, trapped = ("opponent", "player") if side == "player" else ("player", "opponent")
    lab["overrides"]["parties"][trapper][0]["moves"] = [MOVES[name]] * 4
    lab["overrides"]["parties"][trapped][0]["moves"] = [SEISMIC_TOSS] * 4
    lab["overrides"]["parties"][trapped][0]["level"] = TRAPPED_LEVEL
    lab["trace"]["segments"] = TURN * 2
    sid = f"trp1-{name}-{side}-{scene}" + ("" if seed == 1 else f"-s{seed}")
    json.dump(lab, open(os.path.join(root, f"tools/battle-lab/{sid}.json"), "w"))
    return sid


if __name__ == "__main__":
    for n in sys.argv[1:] or list(MOVES):
        for side in ("player", "opp"):
            for scene in ("on", "off"):
                print(build(n, side, scene))
