#!/usr/bin/env python3
"""Live audit 22 target 4 (docs/live-audit-22.md): land86's Flatter 260 words unit -- a Flatter after a Flatter in the CENSUS routes' shape
(liveShareCensus.ts on the base: battle 735 seed 735 streak 0, player NIDORINO Flatters WOBBUFFET with Mud-Slap / Water Pulse / Double Kick
and the opponent's Safeguard / Charm between; battle 936 seed 936 streak 6, opponent NIDORINO Flatters TOGETIC with the player's Wish /
Follow Me between), staged as battle-lab scenarios on audit 20 Part B's pb-fly-wingull-opp-s2 base (explicit lab seed 305420351, ISSUES
#154; the pb- prefix windows EVERY body):
  pb-a22ff-735: player NIDORINO 33 [Flatter, Mud-Slap, Flatter, Flatter]; opponent WOBBUFFET 202 4x Safeguard 219. Turns: Flatter, RIGHT
    (Mud-Slap), LEFT (Flatter), Flatter: Flatter -> Mud-Slap -> Flatter -> Flatter with Safeguard between.
  pb-a22ff-936: opponent NIDORINO 4x Flatter; player TOGETIC 176 [Wish 273, Follow Me 266, Aerial Ace 332, Magical Leaf 345]. Turns: Wish,
    RIGHT (Follow Me), Follow Me, Follow Me: the opponent's Flatter after a Flatter with the player's (confused) Wish / Follow Me between.
One FIGHT turn = A, 30 idle, [cursor step, 20 idle], A, 1300 idle (pb base framing). usage: audit22FlatterStage.py <out-dir>"""
import copy, json, sys
from pathlib import Path

SRC = Path("tools/integration/fixtures/audit-20/partb/scenarios/pb-fly-wingull-opp-s2.json")
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=False)
base = json.loads(SRC.read_text())
base["seed"] = 305420351


def turn(step=None):
    segs = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}]
    if step:
        segs += [{"frames": 2, "buttons": [step]}, {"frames": 20, "buttons": []}]
    return segs + [{"frames": 2, "buttons": ["A"]}, {"frames": 1300, "buttons": []}]


def scen(name, player, opponent, steps):
    s = copy.deepcopy(base); P = s["overrides"]["parties"]
    P["player"][0].update(player); P["opponent"][0].update(opponent)
    s["trace"] = {"segments": [seg for st in steps for seg in turn(st)]}
    (out / f"{name}.json").write_text(json.dumps(s, indent=1) + "\n")


scen("pb-a22ff-735", {"species": 33, "gender": "male", "moves": [260, 189, 260, 260]},
     {"species": 202, "gender": "male", "moves": [219] * 4}, [None, "RIGHT", "LEFT", None])
scen("pb-a22ff-936", {"species": 176, "gender": "male", "moves": [273, 266, 332, 345]},
     {"species": 33, "gender": "male", "moves": [260] * 4}, [None, "RIGHT", None, None])
print(2, "scenarios")
