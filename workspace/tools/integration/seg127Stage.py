#!/usr/bin/env python3
"""seg127: stage the Scene ON IsBattleSEPlaying-gate lab scenarios (docs/seg127-status-se-gate.md §3) — CONTROLLED LAB STAGING on the
accepted Bulk Up templates sta123Stage.py uses (tools/battle-lab/mechanic-bulk-up-{player,opponent}-primeape-*-onix.json: legal
parties of three, EV totals <= 510). Only the attacker lead's species / moves, the target lead's species (+ gender for Cute Charm), the
explicit lab seed and the turn count change; every turn is the template's fight-menu press (A, 30 idle, A on slot 1) + 1400 idle, so
later turns repeat the same move (the target lead keeps the template's Tackle x4: contact, so the contact-ability classes are staged on
the TARGET lead's ability, abilitySlot 0 = the source's first ability, checked against species_info.h below). Species are INTERNAL ids
(Kanto ids equal their national numbers). Seeds: the first seed from 305419897 upward (seg127Sweep.sh, sweep log in the doc) on which the
class's receipt occurs on that side; pinned here. Ice Beam FRZ reuses sta123's two legal scenarios unchanged (sta123Stage.py).
usage: seg127Stage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, re, shutil, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
            "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}
SP = {"PRIMEAPE": 57, "ONIX": 95, "SNORLAX": 143, "GYARADOS": 130, "PIKACHU": 25, "MAGMAR": 126, "NIDOKING": 34, "PARASECT": 47,
      "CLEFABLE": 36, "ALAKAZAM": 65, "TYRANITAR": 248}
ABILITY = {"PIKACHU": "STATIC", "MAGMAR": "FLAME_BODY", "NIDOKING": "POISON_POINT", "PARASECT": "EFFECT_SPORE", "CLEFABLE": "CUTE_CHARM",
           "ALAKAZAM": "SYNCHRONIZE", "TYRANITAR": "SAND_STREAM"}
S0 = 305419897
TURN_IDLE = 1400
# (slug, class, move id, attacker, target, turns, expected receipt label prefix, target gender or None)
CASES = [
    ("flamethrower-snorlax", "hit-secondary neutral BRN", 53, "PRIMEAPE", "SNORLAX", 3, "BattleScript_MoveEffectBurn", None),
    ("flamethrower-onix", "hit-secondary not-very-effective BRN", 53, "PRIMEAPE", "ONIX", 3, "BattleScript_MoveEffectBurn", None),
    ("body-slam-snorlax", "hit-secondary neutral PRZ", 34, "PRIMEAPE", "SNORLAX", 3, "BattleScript_MoveEffectParalysis", None),
    ("body-slam-onix", "hit-secondary not-very-effective PRZ", 34, "PRIMEAPE", "ONIX", 3, "BattleScript_MoveEffectParalysis", None),
    ("thunderbolt-gyarados", "hit-secondary super-effective PRZ", 85, "PRIMEAPE", "GYARADOS", 3, "BattleScript_MoveEffectParalysis", None),
    ("sludge-bomb-gyarados", "hit-secondary neutral PSN (Snorlax has Immunity)", 188, "PRIMEAPE", "GYARADOS", 3, "BattleScript_MoveEffectPoison", None),
    ("psybeam-snorlax", "hit-secondary neutral CONFUSION", 60, "PRIMEAPE", "SNORLAX", 3, "BattleScript_MoveEffectConfusion", None),
    ("tackle-pikachu-static", "contact-ability Static PRZ", 33, "PRIMEAPE", "PIKACHU", 3, "BattleScript_MoveEffectParalysis", None),
    ("tackle-magmar-flame-body", "contact-ability Flame Body BRN", 33, "PRIMEAPE", "MAGMAR", 3, "BattleScript_MoveEffectBurn", None),
    ("tackle-nidoking-poison-point", "contact-ability Poison Point PSN", 33, "PRIMEAPE", "NIDOKING", 3, "BattleScript_MoveEffectPoison", None),
    ("tackle-parasect-effect-spore", "contact-ability Effect Spore PSN/PRZ/SLP", 33, "PRIMEAPE", "PARASECT", 3, "BattleScript_MoveEffect", None),
    ("tackle-clefable-cute-charm", "contact-ability Cute Charm INFATUATION", 33, "PRIMEAPE", "CLEFABLE", 3, "BattleScript_CuteCharmActivates", "female"),
    ("thunder-wave-alakazam-synchronize", "synchronize PRZ (after the status move's own PRZ)", 86, "PRIMEAPE", "ALAKAZAM", 2, "BattleScript_MoveEffectParalysis", None),
    ("thrash-snorlax", "thrash-fatigue CONFUSION", 37, "PRIMEAPE", "SNORLAX", 4, "BattleScript_ThrashConfuses", None),
    ("yawn-tyranitar-sand-stream", "yawn after end-turn sandstorm damage (Sand Stream target, Primeape takes sand)", 281, "PRIMEAPE", "TYRANITAR", 3, "BattleScript_YawnMakesAsleep", None),
]
SEEDS = {  # stem -> pinned seed: the first sweep seed (seg127Sweep.sh 305419897 x 12) with the receipt; every other stem: 305419897
    "seg127-tackle-parasect-effect-spore-ply": 305419901, "seg127-tackle-parasect-effect-spore-opp": 305419901,
    "seg127-thunderbolt-gyarados-ply": 305419907, "seg127-thunderbolt-gyarados-opp": 305419901,
}
species_info = open(os.path.join(ROOT, "reference/pokeemerald/src/data/pokemon/species_info.h")).read()
for name, ab in ABILITY.items():
    m = re.search(rf"\[SPECIES_{name}\] =.*?\.abilities = \{{ABILITY_(\w+),", species_info, re.S)
    assert m and m.group(1) == ab, (name, m and m.group(1))
index = {}
for slug, cls, move, atk, tgt, turns, label, gender in CASES:
    for side in ("player", "opponent"):
        d = copy.deepcopy(json.load(open(os.path.join(ROOT, TEMPLATE[side]))))
        other = "opponent" if side == "player" else "player"
        a, t = d["overrides"]["parties"][side][0], d["overrides"]["parties"][other][0]
        assert a["moves"] == [339] * 4 and t["moves"] == [33] * 4 and a["abilitySlot"] == 0 and t["abilitySlot"] == 0, side
        assert a.get("gender") == "male", a.get("gender")
        a["species"], a["moves"], t["species"] = SP[atk], [move] * 4, SP[tgt]
        if gender:
            t["gender"] = gender
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
        stem = f"seg127-{slug}-{'ply' if side == 'player' else 'opp'}"
        d["seed"] = SEEDS.get(stem, S0)
        index[stem + ".json"] = {"class": cls, "move": move, "attackerSide": side, "attacker": atk, "target": tgt,
                                 "targetAbility": ABILITY.get(tgt), "expectedLabel": label, "seed": d["seed"], "turns": turns,
                                 "template": TEMPLATE[side], **({"targetGender": gender} if gender else {})}
        open(os.path.join(out, stem + ".json"), "w").write(json.dumps(d, indent=1) + "\n")
        print(stem)
# sta123's two legal Ice Beam FRZ scenarios, byte-identical to sta123Stage.py's output (its own staging run into a sibling dir)
tmp = os.path.join(out, "..", "sta123-tmp")
sta = os.path.join(tmp, "scenarios")
subprocess.run([sys.executable, os.path.join(ROOT, "tools/integration/sta123Stage.py"), sta], check=True, stdout=subprocess.DEVNULL)
sta_index = json.load(open(os.path.join(sta, "..", "scenario-index.json")))
for side in ("ply", "opp"):
    name = f"sta123-ice-beam-{side}-delcatty-shuckle.json"
    shutil.copyfile(os.path.join(sta, name), os.path.join(out, f"seg127-{name[7:]}"))
    m = sta_index[name]
    index[f"seg127-{name[7:]}"] = {"class": "hit-secondary neutral FRZ (sta123 legal scenario)", "move": 58, "attackerSide": m["attackerSide"],
                                   "attacker": "DELCATTY", "target": "SHUCKLE", "expectedLabel": "BattleScript_MoveEffectFreeze",
                                   "seed": m["seed"], "template": m["template"], "extraTurns": m["extraTurns"]}
    print(f"seg127-{name[7:-5]}")
shutil.rmtree(tmp)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
