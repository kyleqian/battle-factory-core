#!/usr/bin/env python3
"""stp128: stage the dense-window scenarios for CURSED / NIGHTMARE / CONFUSION / FRZ (docs/stp128-status-condition-render-prep.md).
Reuses sta123's accepted scenarios verbatim (tools/integration/fixtures/sta123/scenarios: Gengar Curse / Primeape Confuse Ray vs Onix,
Haunter Nightmare vs Shuckle, Delcatty Ice Beam vs Shuckle; both sides) and adds the elevated-opponent pairs:
  - Gengar Curse / Primeape Confuse Ray vs GOLBAT: sta123Stage.py's Bulk Up template recipe (only the attacker lead's species / moves,
    the target lead's species, the lab seed and the turn count change; parties of three, EV totals <= 510), target GOLBAT (42);
  - Gengar Nightmare vs GOLBAT: tools/battle-lab/d4a-nightmare-extra-{player,opponent}-gengar-golbat.json + sta123's two extra
    audit turns (A, 30, A, 900) so the end-turn nightmare ticks occur.
usage: stp128Stage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, shutil, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
STA = os.path.join(ROOT, "tools/integration/fixtures/sta123/scenarios")
index = {}
REUSE = [("sta123-curse-ply-gengar-onix.json", "CURSED", "player"), ("sta123-curse-opp-gengar-onix.json", "CURSED", "opponent"),
         ("sta123-nightmare-ply-haunter-shuckle.json", "NIGHTMARE", "player"), ("sta123-nightmare-opp-haunter-shuckle.json", "NIGHTMARE", "opponent"),
         ("sta123-confuse-ray-ply-primeape-onix.json", "CONFUSION", "player"), ("sta123-confuse-ray-opp-primeape-onix.json", "CONFUSION", "opponent"),
         ("sta123-ice-beam-ply-delcatty-shuckle.json", "FRZ", "player"), ("sta123-ice-beam-opp-delcatty-shuckle.json", "FRZ", "opponent")]
for name, anim, side in REUSE:
    new = "stp128-" + name[len("sta123-"):]
    shutil.copyfile(os.path.join(STA, name), os.path.join(out, new))
    index[new] = {"animation": anim, "attackerSide": side, "source": f"tools/integration/fixtures/sta123/scenarios/{name}",
                  "seed": json.load(open(os.path.join(STA, name)))["seed"]}
    print(new)

TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
            "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}
SP = {"PRIMEAPE": 57, "GENGAR": 94, "GOLBAT": 42}
S0 = 305419897
TURN_IDLE = 1400
for slug, move, anim, atk, tgt, turns in [("curse", 174, "CURSED", "GENGAR", "GOLBAT", 2), ("confuse-ray", 109, "CONFUSION", "PRIMEAPE", "GOLBAT", 2)]:
    for side in ("player", "opponent"):
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
        segs = []
        for _ in range(turns):
            segs += copy.deepcopy(turn) + [{"frames": TURN_IDLE, "buttons": []}]
        d["trace"]["segments"] = segs
        d["trace"]["captureFrames"] = [0, sum(s["frames"] for s in segs)]
        d["seed"] = S0
        name = f"stp128-{slug}-{'ply' if side == 'player' else 'opp'}-{atk.lower()}-{tgt.lower()}.json"
        index[name] = {"animation": anim, "attackerSide": side, "move": move, "attacker": atk, "target": tgt, "seed": S0, "turns": turns,
                       "template": TEMPLATE[side]}
        open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
        print(name)

AUDIT_TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 900, "buttons": []}]
for side, template in [("player", "tools/battle-lab/d4a-nightmare-extra-player-gengar-golbat.json"),
                       ("opponent", "tools/battle-lab/d4a-nightmare-extra-opponent-gengar-golbat.json")]:
    d = copy.deepcopy(json.load(open(os.path.join(ROOT, template))))
    for s in ("player", "opponent"):
        for p in d["overrides"]["parties"][s]:
            assert sum(p["evs"].values()) <= 510
    segs = d["trace"]["segments"] + copy.deepcopy(AUDIT_TURN) * 2
    d["trace"] = {"segments": segs, "captureFrames": [0, sum(x["frames"] for x in segs)]}
    name = f"stp128-nightmare-{'ply' if side == 'player' else 'opp'}-gengar-golbat.json"
    index[name] = {"animation": "NIGHTMARE", "attackerSide": side, "seed": d["seed"], "template": template, "extraTurns": 2}
    open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
    print(name)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
