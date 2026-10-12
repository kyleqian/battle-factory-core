#!/usr/bin/env python3
"""sta123: summarise sta123Exposure.ts shards (census seeds, Scene ON production kernel) into per B_ANIM_STATUS_* x kernel-path counts.
The path is read from the message right before the status-animation receipt (turn-start / end-turn scripts print first, then animate:
BattleScript_MoveUsedIsAsleep / IsParalyzed / IsFrozen / IsConfused / IsInLove, PoisonTurnDmg / BurnTurnDmg / CurseTurnDmg /
NightmareTurnDmg), otherwise from the message right after it (MoveEffect* / ThrashConfuses / CuteCharmActivates animate first, then print).
usage: sta123ExposureSummary.py <shard-dir> <out.json>        (<shard-dir>/e*.jsonl)
"""
import glob, json, os, sys
from collections import Counter

PREV = {"STRINGID_PKMNHURTBYPOISON": "end-turn poison tick", "STRINGID_PKMNHURTBYBURN": "end-turn burn tick",
        "STRINGID_PKMNFASTASLEEP": "sleep turn", "STRINGID_PKMNISPARALYZED": "can't move", "STRINGID_PKMNISFROZEN": "frozen turn",
        "STRINGID_PKMNISCONFUSED": "confusion self-check", "STRINGID_PKMNINLOVE": "in-love check",
        "STRINGID_PKMNAFFLICTEDBYCURSE": "end-turn curse tick", "STRINGID_PKMNLOCKEDINNIGHTMARE": "end-turn nightmare tick"}
NEXT = {"STRINGID_PKMNFATIGUECONFUSION": "thrash fatigue", "STRINGID_PKMNSXINFATUATEDY": "cute charm"}
battles, ends, per, sides, withAny = 0, Counter(), Counter(), Counter(), Counter()
for f in sorted(glob.glob(os.path.join(sys.argv[1], "e*.jsonl"))):
    for line in open(f):
        b = json.loads(line)
        battles += 1
        ends["terminal" if b["end"] == "terminal" else "other"] += 1
        seen = set()
        for a in b["anims"]:
            path = PREV.get(a["prevMessage"]) or NEXT.get(a["nextMessage"]) or f"inflicted (next {a['nextMessage']})"
            k = f"{a['anim']}|{path}"
            per[k] += 1
            sides[f"{a['anim']}|{'player' if a['battler'] == 0 else 'opponent'}"] += 1
            seen.add(a["anim"])
        for s in seen:
            withAny[s] += 1
byAnim = Counter()
for k, v in per.items():
    byAnim[k.split("|")[0]] += v
out = {"schema": "sta123-exposure/v1", "battles": battles, "ends": dict(ends), "byAnimation": dict(sorted(byAnim.items())),
       "battlesWithAnimation": dict(sorted(withAny.items())), "byAnimationAndPath": dict(sorted(per.items())),
       "byAnimationAndSide": dict(sorted(sides.items())), "total": sum(per.values())}
json.dump(out, open(sys.argv[2], "w"), indent=1)
open(sys.argv[2], "a").write("\n")
print(json.dumps(out, indent=1))
