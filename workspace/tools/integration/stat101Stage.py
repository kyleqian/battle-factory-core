#!/usr/bin/env python3
"""stat101: stage the General_StatsChange (B_ANIM_STATS_CHANGE) battle-lab scenarios (ISSUES #166 prep, docs/stat101-stats-change-design.md)
from the accepted Bulk Up templates idle94 / idle98 used (tools/battle-lab/mechanic-bulk-up-{player,opponent}-primeape-*-onix.json: parties
of three, EV totals <= 510). Only the move user's lead species / moves, the other lead's species (it keeps Tackle x4), optionally the
other side's two bench species (Intimidate), the explicit lab seed and the final idle segment change. Species are INTERNAL ids.
usage: stat101Stage.py <out-dir>   (also writes <out-dir>/../scenario-index.json)
"""
import copy, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
TEMPLATE = {"player": "tools/battle-lab/mechanic-bulk-up-player-primeape-opponent-onix.json",
            "opponent": "tools/battle-lab/mechanic-bulk-up-opponent-primeape-player-onix.json"}
SP = {"PRIMEAPE": 57, "ONIX": 95, "SNORLAX": 143, "GOLBAT": 42, "MACHAMP": 68, "GYARADOS": 130, "GRANBULL": 210}
SEED = 305419897
# (slug, move id, user side, user species, other lead species, expected animArg, animated battler side, variant, idle frames, bench)
CASES = [
    ("harden", 106, "player", "PRIMEAPE", "ONIX", 16, "player", "up1 DEF single", 900, None),
    ("agility", 97, "opponent", "GOLBAT", "SNORLAX", 41, "opponent", "up2 SPEED single sharply, elevated opponent", 900, None),
    ("growl", 45, "player", "PRIMEAPE", "ONIX", 22, "opponent", "down1 ATK single, big opponent picture (ONIX)", 900, None),
    ("screech", 103, "opponent", "GOLBAT", "ONIX", 47, "player", "down2 DEF single sharply, player ONIX", 900, None),
    ("cosmic-power", 322, "player", "SNORLAX", "GOLBAT", 55, "player", "up multiple (DEF + SPDEF), player SNORLAX", 900, None),
    ("tickle", 321, "opponent", "GOLBAT", "SNORLAX", 57, "player", "down multiple (ATK + DEF), player SNORLAX", 900, None),
    ("superpower", 276, "opponent", "MACHAMP", "SNORLAX", 57, "opponent", "down multiple self (secondary, BattleScript_AtkDefDown)", 900, None),
    ("memento", 262, "player", "PRIMEAPE", "ONIX", 58, "opponent", "down multiple sharply (ATK + SPATK -2), opponent ONIX", 900, None),
    ("icy-wind", 196, "player", "PRIMEAPE", "GOLBAT", 24, "opponent", "secondary-effect SPEED -1 on the elevated opponent", 900, None),
    ("roar-intimidate", 46, "player", "PRIMEAPE", "ONIX", 22, "player", "Intimidate on the Roar-forced switch-in (both bench mons Intimidate)", 470,
     ["GYARADOS", "GRANBULL"]),
]
# STRINGID_PKMNWASDRAGGEDOUT (BattleScript_TrainerBattleForceOut) waits for A in the lab: idle 470, press A once, then idle 600.
TAIL = {"roar-intimidate": [{"frames": 2, "buttons": ["A"]}, {"frames": 600, "buttons": []}]}
index = {}
for slug, move, side, user, other_sp, arg, anim_side, variant, idle, bench in CASES:
    d = copy.deepcopy(json.load(open(os.path.join(ROOT, TEMPLATE[side]))))
    other = "opponent" if side == "player" else "player"
    a, t = d["overrides"]["parties"][side][0], d["overrides"]["parties"][other][0]
    assert a["moves"] == [339] * 4 and t["moves"] == [33] * 4, (side, a["moves"], t["moves"])
    a["species"], a["moves"], t["species"] = SP[user], [move] * 4, SP[other_sp]
    if bench:
        for slot, sp in zip(d["overrides"]["parties"][other][1:], bench):
            slot["species"], slot["abilitySlot"] = SP[sp], 0
    for p in d["overrides"]["parties"]["player"] + d["overrides"]["parties"]["opponent"]:
        assert sum(p["evs"].values()) <= 510
    segs = d["trace"]["segments"]
    assert segs[-1] == {"frames": 700, "buttons": []}, segs[-1]
    segs[-1]["frames"] = idle
    segs.extend(TAIL.get(slug, []))
    d["trace"]["captureFrames"] = [0, sum(s["frames"] for s in segs)]
    d["seed"] = SEED
    name = f"stat101-{slug}-{'ply' if side == 'player' else 'opp'}-{user.lower()}-{other_sp.lower()}.json"
    index[name] = {"move": move, "userSide": side, "user": user, "otherLead": other_sp, "bench": bench, "expectedAnimArg": arg,
                   "animatedSide": anim_side, "variant": variant, "seed": SEED, "template": TEMPLATE[side]}
    open(os.path.join(out, name), "w").write(json.dumps(d, indent=1) + "\n")
    print(name)
open(os.path.join(out, "..", "scenario-index.json"), "w").write(json.dumps(index, indent=1) + "\n")
