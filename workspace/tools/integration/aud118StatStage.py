#!/usr/bin/env python3
"""aud118 (docs/aud118-live-audit-26.md): WIDENED General_StatsChange (stats-change banner) scenarios, staged exactly as stat101Stage.py does
(the accepted Bulk Up templates, parties of three, EV totals <= 510, the user's lead species / moves, the other lead's species (Tackle x4),
optional bench species, the stat101 lab seed 305419897, the idle / Roar tails). Species are INTERNAL ids. Only the case list differs:
new species, both sides, opponent front idle rests x2 = 1 (ONIX, RATTATA) as the animated battler, an elevated user (CROBAT), multi-stat
moves (Dragon Dance / Calm Mind / Bulk Up on new species), Superpower's self drop right after its own x2-moving body, a CASTFORM target,
Intimidate FROM an elevated MASQUERAIN and Intimidate ONTO an elevated CROBAT (the opponent Roars the player's Intimidate bench in).
`bench` in the index is the field the scd112 comparator models (scd112Windows.ts: the opponent's slot 1 when set); the onto-Crobat case
switches the PLAYER, so its index bench is None and the staged bench is `stagedBench` (the banner battler, the opponent, is its lead).
usage: aud118StatStage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
            "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}
SP = {"ONIX": 95, "RATTATA": 19, "DRAGONITE": 149, "CROBAT": 169, "STEELIX": 208, "WAILORD": 314, "DIGLETT": 50, "CASTFORM": 385,
      "MASQUERAIN": 312, "MIGHTYENA": 287, "SALAMENCE": 397}
SEED = 305419897
# (slug, move id, user side, user species, other lead species, expected animArg, animated battler side, variant, idle frames, bench, bench side)
CASES = [
    ("dragon-dance", 349, "player", "DRAGONITE", "RATTATA", 55, "player", "up multiple (ATK + SPEED), new species", 900, None, None),
    ("calm-mind", 347, "opponent", "CROBAT", "STEELIX", 55, "opponent", "up multiple (SPATK + SPDEF), ELEVATED opponent user", 900, None, None),
    ("bulk-up", 339, "opponent", "RATTATA", "DIGLETT", 55, "opponent", "up multiple, opponent RATTATA (front idle rest x2 1)", 900, None, None),
    ("leer", 43, "player", "STEELIX", "CASTFORM", 23, "opponent", "down1 DEF onto an opponent CASTFORM (normal form)", 900, None, None),
    ("superpower", 276, "opponent", "ONIX", "WAILORD", 57, "opponent", "self down multiple right after its own x2 body, ONIX rest 1", 900, None, None),
    ("swords-dance", 14, "opponent", "ONIX", "DIGLETT", 39, "opponent", "up2 ATK sharply, opponent ONIX (rest x2 1)", 900, None, None),
    ("screech", 103, "player", "DIGLETT", "RATTATA", 47, "opponent", "down2 DEF sharply onto opponent RATTATA (rest x2 1)", 900, None, None),
    ("roar-intimidate-masq", 46, "player", "DRAGONITE", "ONIX", 22, "player", "Intimidate FROM the elevated MASQUERAIN switch-in", 470,
     ["MASQUERAIN", "MASQUERAIN"], "opponent"),
    ("roar-intimidate-onto-crobat", 46, "opponent", "CROBAT", "STEELIX", 22, "opponent", "Intimidate ONTO the elevated opponent CROBAT", 470,
     ["MIGHTYENA", "SALAMENCE"], "player"),
]
TAIL = [{"frames": 2, "buttons": ["A"]}, {"frames": 600, "buttons": []}]  # STRINGID_PKMNWASDRAGGEDOUT waits for A in the lab (stat101)
index = {}
for slug, move, side, user, other_sp, arg, anim_side, variant, idle, bench, bench_side in CASES:
    d = copy.deepcopy(json.load(open(os.path.join(ROOT, TEMPLATE[side]))))
    other = "opponent" if side == "player" else "player"
    a, t = d["overrides"]["parties"][side][0], d["overrides"]["parties"][other][0]
    assert a["moves"] == [339] * 4 and t["moves"] == [33] * 4, (side, a["moves"], t["moves"])
    a["species"], a["moves"], t["species"] = SP[user], [move] * 4, SP[other_sp]
    if bench:
        for slot, sp in zip(d["overrides"]["parties"][bench_side][1:], bench):
            slot["species"], slot["abilitySlot"] = SP[sp], 0
    for p in d["overrides"]["parties"]["player"] + d["overrides"]["parties"]["opponent"]:
        assert sum(p["evs"].values()) <= 510
    segs = d["trace"]["segments"]
    assert segs[-1] == {"frames": 700, "buttons": []}, segs[-1]
    segs[-1]["frames"] = idle
    if bench:
        segs.extend(copy.deepcopy(TAIL))
    d["trace"]["captureFrames"] = [0, sum(s["frames"] for s in segs)]
    d["seed"] = SEED
    name = f"aud118-{slug}-{'ply' if side == 'player' else 'opp'}-{user.lower()}-{other_sp.lower()}.json"
    index[name] = {"move": move, "userSide": side, "user": user, "otherLead": other_sp, "bench": bench if bench_side == "opponent" else None,
                   "stagedBench": bench, "stagedBenchSide": bench_side, "expectedAnimArg": arg, "animatedSide": anim_side, "variant": variant,
                   "seed": SEED, "template": TEMPLATE[side]}
    open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
    print(name)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
