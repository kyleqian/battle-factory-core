#!/usr/bin/env python3
"""snd182 census delta (docs/snd182-scene-on-forced-player-send-in-live.md): trn178Census.ts output of two trees (base, final), one scene.

usage: snd182CensusDelta.py <base-arm-dir> <final-arm-dir> [<out.json>]

Per battle: the kernel-event digest must be identical (gameplay / RNG / damage / turn order unchanged) and the error field equal.
Commands are compared pairwise (the command LISTS must have equal length and types: a duration change adds or removes no command). A changed
command must be a forced PLAYER switch-in (flag [7] == 1, same species) whose only changed fields are minimumFrames [2], healthboxSlideElapsed [5]
and sendInVisualDelay [6] -- attributed per species. Anything else is UNATTRIBUTED (exit 1). Scene OFF must be byte-identical.
A battle that hits the tool's 200k-frame budget in BOTH trees (434 / 796 / 881, pre-existing) is reported, not attributed (its digest covers
different events once a duration moves)."""
import glob, json, os, sys

base_dir, final_dir = sys.argv[1:3]
out_path = sys.argv[3] if len(sys.argv) > 3 else None
TYPE, MIN, SLIDE, DELAY, FORCED, SPECIES = 0, 2, 5, 6, 7, 8


def load(path):
    return {r["seed"]: r for r in map(json.loads, filter(None, open(path).read().split("\n")))}


res = {"schema": "snd182-census-delta/v1", "battles": 0, "digestMismatch": [], "errorMismatch": [], "budgetStalled": [],
       "baseCommands": 0, "commands": 0, "unchanged": 0, "identicalBattles": 0, "typeSequenceChanged": [],
       "forcedPlayerSwitchIns": {"changed": 0, "unchangedForced": 0, "frames": 0, "battles": 0, "bySpecies": {}, "bySeed": {}},
       "budgetTail": {}, "unattributed": []}
scene = None
for bpath in sorted(glob.glob(os.path.join(base_dir, "r*.jsonl"))):
    base, final = load(bpath), load(os.path.join(final_dir, os.path.basename(bpath)))
    for seed in sorted(base):
        b, f = base[seed], final[seed]
        scene = f["scene"]
        res["battles"] += 1
        stalled = bool(b["error"]) and b["error"] == f["error"] and "frame budget" in b["error"]
        if b["eventsDigest"] != f["eventsDigest"] and not stalled:
            res["digestMismatch"].append(seed)
        if b["error"] != f["error"]:
            res["errorMismatch"].append(seed)
        elif b["error"]:
            res["budgetStalled"].append(seed)
        bc, fc = b["commands"], f["commands"]
        res["baseCommands"] += len(bc)
        res["commands"] += len(fc)
        if bc == fc:
            res["identicalBattles"] += 1
            res["unchanged"] += len(fc)
            res["forcedPlayerSwitchIns"]["unchangedForced"] += sum(1 for c in fc if c[FORCED] == 1)
            continue
        if stalled:
            res["budgetTail"][str(seed)] = {"baseCommands": len(bc), "finalCommands": len(fc), "digestSame": b["eventsDigest"] == f["eventsDigest"]}
            continue
        if [c[TYPE] for c in bc] != [c[TYPE] for c in fc]:
            res["typeSequenceChanged"].append(seed)
            continue
        changed = False
        for k, (x, y) in enumerate(zip(bc, fc)):
            if x == y:
                res["unchanged"] += 1
                continue
            rest_equal = all(x[n] == y[n] for n in range(len(x)) if n not in (MIN, SLIDE, DELAY))
            if x[TYPE] == "switch-in" and y[FORCED] == 1 and x[FORCED] == 1 and rest_equal:
                fp = res["forcedPlayerSwitchIns"]
                fp["changed"] += 1
                fp["frames"] += y[MIN] - x[MIN]
                sp = str(y[SPECIES])
                e = fp["bySpecies"].setdefault(sp, {"count": 0, "baseMin": x[MIN], "finalMin": [], "slide": y[SLIDE], "delay": y[DELAY]})
                e["count"] += 1
                e["finalMin"].append(y[MIN])
                fp["bySeed"].setdefault(str(seed), []).append([sp, x[MIN], y[MIN]])
                changed = True
            else:
                res["unattributed"].append({"seed": seed, "at": k, "base": x, "final": y})
                break
        res["forcedPlayerSwitchIns"]["battles"] += 1 if changed else 0
res["scene"] = scene
res["unattributedCount"] = len(res["unattributed"]) + len(res["typeSequenceChanged"])
res["unattributed"] = res["unattributed"][:20]
fp = res["forcedPlayerSwitchIns"]
fp["bySeed"] = dict(sorted(fp["bySeed"].items(), key=lambda kv: int(kv[0])))
txt = json.dumps(res, indent=1)
if out_path:
    open(out_path, "w").write(txt + "\n")
print(json.dumps({k: v for k, v in res.items() if k not in ("unattributed",)})[:1800])
for u in res["unattributed"][:5]:
    print("UNATTRIBUTED", json.dumps(u)[:400])
ok = not res["digestMismatch"] and not res["errorMismatch"] and not res["unattributedCount"] \
    and (scene != "off" or res["identicalBattles"] == res["battles"])
print("snd182CensusDelta:", "OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
