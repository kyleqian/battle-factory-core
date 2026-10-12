#!/usr/bin/env python3
"""sta123: stage the Scene ON / OFF status-animation lab scenarios (S10A prep pack; docs/sta123-status-animations-design.md) from the
accepted Bulk Up templates off108 / idle94 / off121 used (tools/battle-lab/mechanic-bulk-up-{player,opponent}-primeape-*-onix.json: the
same parties of three, EV totals <= 510). Only the attacker lead's species / moves, the target lead's species (and gender for Attract),
the explicit lab seed and the turn count change: every turn is the template's fight-menu press (A, 30 idle, A on slot 1) plus a fixed
idle, so later turns repeat the same move (the target lead keeps the template's Tackle x4). Species are INTERNAL ids (Kanto ids equal
their national numbers). Same shape as off121Stage.py (base 2d70bafd9 does not carry it).
FRZ and NIGHTMARE (chance / two-move setups) reuse the accepted legal mechanic templates and pins of the status-animation sprite audit
(tools/integration/statusAnimationSpriteBatch.py: two extra A,A turns of 934 frames; the Ice Beam player-carrier seed 305419958 from its
freeze sweep, every other seed the template's own).
usage: sta123Stage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
            "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}
SP = {"PRIMEAPE": 57, "ONIX": 95, "SNORLAX": 143, "GENGAR": 94}
S0 = 305419897
TURN_IDLE = 1400
CASES = [  # (slug, move id, B_ANIM_STATUS_* expected, paths, attacker, target, turns[, target gender])
    ("toxic", 92, "PSN", "move-inflicted (MoveEffectToxic) + end-turn toxic tick", "PRIMEAPE", "ONIX", 2),
    ("will-o-wisp", 261, "BRN", "move-inflicted (MoveEffectBurn) + end-turn burn tick", "PRIMEAPE", "ONIX", 2),
    ("thunder-wave", 86, "PRZ", "move-inflicted (MoveEffectParalysis) + can't move", "PRIMEAPE", "SNORLAX", 4),
    ("spore", 147, "SLP", "move-inflicted (MoveEffectSleep) + sleep turns", "PRIMEAPE", "ONIX", 3),
    ("confuse-ray", 109, "CONFUSION", "move-inflicted (MoveEffectConfusion, chosenstatus2animation) + confusion self-check", "PRIMEAPE", "ONIX", 2),
    ("curse", 174, "CURSED", "Ghost Curse (no status anim at infliction) + end-turn curse tick (status2animation)", "GENGAR", "ONIX", 2),
    ("attract", 213, "INFATUATION", "Attract (no status anim at infliction) + in-love check (status2animation)", "PRIMEAPE", "ONIX", 2, "female"),
]
index = {}
for slug, move, anim, paths, atk, tgt, turns, *gender in CASES:
    for side in ("player", "opponent"):
        d = copy.deepcopy(json.load(open(os.path.join(ROOT, TEMPLATE[side]))))
        other = "opponent" if side == "player" else "player"
        a, t = d["overrides"]["parties"][side][0], d["overrides"]["parties"][other][0]
        assert a["moves"] == [339] * 4 and t["moves"] == [33] * 4, (side, a["moves"], t["moves"])
        a["species"], a["moves"], t["species"] = SP[atk], [move] * 4, SP[tgt]
        if gender:
            t["gender"] = gender[0]
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
        name = f"sta123-{slug}-{'ply' if side == 'player' else 'opp'}-{atk.lower()}-{tgt.lower()}.json"
        index[name] = {"move": move, "animation": anim, "paths": paths, "attackerSide": side, "attacker": atk, "target": tgt,
                       "seed": S0, "turns": turns, "template": TEMPLATE[side], **({"targetGender": gender[0]} if gender else {})}
        open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
        print(name)
AUDIT_TURN = [{"frames": 2, "buttons": ["A"]}, {"frames": 30, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": 900, "buttons": []}]
LEGAL = [  # (slug, template, seed or None = the template's, B_ANIM_STATUS_*, paths, attacker side)
    ("ice-beam-ply-delcatty-shuckle", "tools/battle-lab/mechanic-ice-beam-player-delcatty-opponent-shuckle.json", 305419958, "FRZ",
     "move-inflicted (MoveEffectFreeze, 10% Ice Beam) + frozen turns", "player"),
    ("ice-beam-opp-delcatty-shuckle", "tools/battle-lab/mechanic-ice-beam-opponent-delcatty-player-shuckle.json", None, "FRZ",
     "move-inflicted (MoveEffectFreeze, 10% Ice Beam) + frozen turns", "opponent"),
    ("nightmare-ply-haunter-shuckle", "tools/battle-lab/mechanic-nightmare-player-haunter-opponent-shuckle.json", None, "NIGHTMARE",
     "Hypnosis + Nightmare (no status2 anim at infliction) + end-turn nightmare tick (status2animation) + sleep turns", "player"),
    ("nightmare-opp-haunter-shuckle", "tools/battle-lab/mechanic-nightmare-opponent-haunter-player-shuckle.json", None, "NIGHTMARE",
     "Hypnosis + Nightmare (no status2 anim at infliction) + end-turn nightmare tick (status2animation) + sleep turns", "opponent"),
]
for slug, template, seed, anim, paths, side in LEGAL:
    d = copy.deepcopy(json.load(open(os.path.join(ROOT, template))))
    for s in ("player", "opponent"):
        for p in d["overrides"]["parties"][s]:
            assert sum(p["evs"].values()) <= 510
    segs = d["trace"]["segments"] + copy.deepcopy(AUDIT_TURN) * 2
    d["trace"] = {"segments": segs, "captureFrames": [0, sum(x["frames"] for x in segs)]}
    if seed is not None:
        d["seed"] = seed
    name = f"sta123-{slug}.json"
    index[name] = {"animation": anim, "paths": paths, "attackerSide": side, "seed": d["seed"], "template": template, "extraTurns": 2}
    open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
    print(name)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
