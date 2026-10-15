#!/usr/bin/env python3
"""trn178 census delta (docs/trn178-action-transition-live.md): trn178Census.ts output of two trees, one scene.

usage: trn178CensusDelta.py <base-arm-dir> <final-arm-dir> [<out.json>]     (every r*.jsonl in <base> has a same-named file in <final>)

Per battle: the kernel-event digest must be identical (gameplay / RNG / damage / turn order unchanged) and the error field equal.
Commands are aligned with difflib on (type, battler, live-animation flag); every change must be attributed:
  transition-pause  an inserted Scene OFF move-animation with no live animation immediately before a sprite-visibility command
                    (the first MoveEnd receipt), ISSUES #167 (a') / trn176's P = d + 6 + u;
  budget-tail       a battle that hits the census tool's 200k-frame input budget in BOTH trees (pre-existing: 434 / 796 / 881): a
                    change confined to the commands after the last aligned one (its event digest then covers different events);
anything else is UNATTRIBUTED (exit 1). In Scene ON every battle's command list must be byte-identical.
"""
import difflib, glob, json, os, sys

base_dir, final_dir = sys.argv[1:3]
out_path = sys.argv[3] if len(sys.argv) > 3 else None
TYPE, BATTLER, MIN, ANIM, USED = 0, 1, 2, 11, 10


def load(path):
    return {r["seed"]: r for r in map(json.loads, filter(None, open(path).read().split("\n")))}


res = {"schema": "trn178-census-delta/v1", "battles": 0, "digestMismatch": [], "errorMismatch": [], "budgetStalled": [],
       "baseCommands": 0, "commands": 0, "unchanged": 0, "identicalBattles": 0,
       "transitionPause": {"commands": 0, "frames": 0, "battles": 0, "framesHistogram": {}, "byUsed": {}},
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
            continue
        key = lambda c: (c[TYPE], c[BATTLER], c[ANIM])
        ops = difflib.SequenceMatcher(a=[key(c) for c in bc], b=[key(c) for c in fc], autojunk=False).get_opcodes()
        last_equal = max((k for k, op in enumerate(ops) if op[0] == "equal"), default=-1)
        paused = False
        for k, (tag, i1, i2, j1, j2) in enumerate(ops):
            if tag == "equal":
                for x, y in zip(bc[i1:i2], fc[j1:j2]):
                    if x == y:
                        res["unchanged"] += 1
                    else:
                        res["unattributed"].append({"seed": seed, "base": x, "final": y})
            elif tag == "insert" and scene == "off" and j2 - j1 == 1 and fc[j1][TYPE] == "move-animation" and fc[j1][ANIM] == 0 \
                    and j2 < len(fc) and fc[j2][TYPE] == "sprite-visibility":
                tp = res["transitionPause"]
                tp["commands"] += 1
                tp["frames"] += fc[j1][MIN]
                tp["framesHistogram"][str(fc[j1][MIN])] = tp["framesHistogram"].get(str(fc[j1][MIN]), 0) + 1
                move = (fc[j1][USED] or "?").split("\n")[-1]
                tp["byUsed"][move] = tp["byUsed"].get(move, 0) + 1
                paused = True
            elif stalled and k > last_equal:
                res["budgetTail"][str(seed)] = {"baseTail": i2 - i1, "finalTail": j2 - j1, "digestSame": b["eventsDigest"] == f["eventsDigest"]}
            else:
                res["unattributed"].append({"seed": seed, "tag": tag, "base": bc[i1:i2], "final": fc[j1:j2]})
        res["transitionPause"]["battles"] += 1 if paused else 0
res["scene"] = scene
res["unattributedCount"] = len(res["unattributed"])
res["unattributed"] = res["unattributed"][:20]
res["transitionPause"]["byUsed"] = dict(sorted(res["transitionPause"]["byUsed"].items(), key=lambda kv: -kv[1]))
txt = json.dumps(res, indent=1)
if out_path:
    open(out_path, "w").write(txt + "\n")
print(json.dumps({k: v for k, v in res.items() if k not in ("unattributed",)})[:1500])
for u in res["unattributed"][:5]:
    print("UNATTRIBUTED", json.dumps(u)[:400])
ok = not res["digestMismatch"] and not res["errorMismatch"] and not res["unattributedCount"] \
    and (scene != "on" or res["identicalBattles"] == res["battles"] - len(res["budgetStalled"]))
print("trn178CensusDelta:", "OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
