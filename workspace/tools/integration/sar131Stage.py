#!/usr/bin/env python3
"""sar131 (S10A, ISSUES #168 slice SA4; docs/sar131-status-animation-render.md): stage the Scene ON PSN / PRZ lab scenarios.
Reuses sta123's four Toxic / Thunder Wave scenarios verbatim (tools/integration/fixtures/sta123/scenarios: PSN inflicted + two end-turn
ticks, PRZ inflicted + can't move, both sides) and adds three on sta123Stage.py's Bulk Up template shape (same parties, EV totals
<= 510, explicit lab seed, the attacker lead's moves x4, the target lead's species; INTERNAL ids == national ids here):
  Toxic PRIMEAPE (player) -> elevated opponent LEDIAN (166, elevation 8; GOLBAT is Poison type, immune to PSN), 2 turns;
  Thunder Wave PRIMEAPE (player) -> elevated opponent GOLBAT (42, elevation 8), 4 turns;
  Thunder Wave PRIMEAPE (opponent) -> player GOLBAT, 4 turns (a third player-side PRZ window).
usage: sar131Stage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, shutil, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
STA = os.path.join(ROOT, "tools/integration/fixtures/sta123")
TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
            "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}
SP = {"PRIMEAPE": 57, "GOLBAT": 42, "LEDIAN": 166}
S0 = 305419897
TURN_IDLE = 1400
sta_index = json.load(open(os.path.join(STA, "scenario-index.json")))
index = {}
for name in ("sta123-toxic-ply-primeape-onix.json", "sta123-toxic-opp-primeape-onix.json",
             "sta123-thunder-wave-ply-primeape-snorlax.json", "sta123-thunder-wave-opp-primeape-snorlax.json"):
    shutil.copyfile(os.path.join(STA, "scenarios", name), os.path.join(out, name))
    index[name] = {**sta_index[name], "source": "tools/integration/fixtures/sta123/scenarios"}
    print(name)
CASES = [  # (slug, move id, B_ANIM_STATUS_*, paths, attacker side, attacker, target, turns)
    ("toxic", 92, "PSN", "move-inflicted (MoveEffectToxic) + end-turn toxic tick; elevated opponent", "player", "PRIMEAPE", "LEDIAN", 2),
    ("thunder-wave", 86, "PRZ", "move-inflicted (MoveEffectParalysis) + can't move; elevated opponent", "player", "PRIMEAPE", "GOLBAT", 4),
    ("thunder-wave", 86, "PRZ", "move-inflicted (MoveEffectParalysis) + can't move", "opponent", "PRIMEAPE", "GOLBAT", 4),
]
for slug, move, anim, paths, side, atk, tgt, turns in CASES:
    d = copy.deepcopy(json.load(open(os.path.join(ROOT, TEMPLATE[side]))))
    other = "opponent" if side == "player" else "player"
    a, t = d["overrides"]["parties"][side][0], d["overrides"]["parties"][other][0]
    assert a["moves"] == [339] * 4 and t["moves"] == [33] * 4, (side, a["moves"], t["moves"])
    a["species"], a["moves"], t["species"] = SP[atk], [move] * 4, SP[tgt]
    for p in d["overrides"]["parties"]["player"] + d["overrides"]["parties"]["opponent"]:
        assert sum(p["evs"].values()) <= 510
    segs = d["trace"]["segments"]
    assert segs[-1] == {"frames": 700, "buttons": []}, segs[-1]
    turn = segs[:-1]
    assert turn == [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}], turn
    segs = []
    for _ in range(turns):
        segs += copy.deepcopy(turn) + [{"frames": TURN_IDLE, "buttons": []}]
    d["trace"]["segments"] = segs
    d["trace"]["captureFrames"] = [0, sum(s["frames"] for s in segs)]
    d["seed"] = S0
    name = f"sar131-{slug}-{'ply' if side == 'player' else 'opp'}-{atk.lower()}-{tgt.lower()}.json"
    index[name] = {"move": move, "animation": anim, "paths": paths, "attackerSide": side, "attacker": atk, "target": tgt,
                   "seed": S0, "turns": turns, "template": TEMPLATE[side]}
    open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
    print(name)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
