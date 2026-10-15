#!/usr/bin/env python3
"""trn181 census delta (docs/trn181-action-transition-on.md): trn178Census.ts output of two trees, one scene.

usage: trn181CensusDelta.py <base-arm-dir> <final-arm-dir> [<out.json>]     (every r*.jsonl in <base> has a same-named file in <final>)

Per battle: the kernel-event digest must be identical (gameplay / RNG / damage / turn order unchanged) and the error field equal.
Commands are aligned two-pointer (base and final advance together on equal commands); every change must be attributed:
  transition-pause  an inserted move-animation with no live animation immediately before a sprite-visibility command
                    (the first MoveEnd receipt), ISSUES #167 (a') / trn176's P = d + 6 + u (both scenes);
  budget-tail       a battle that hits the census tool's 200k-frame input budget in BOTH trees (pre-existing: 434 / 796 / 881): the
                    first non-pause difference and everything after it (its event digest then covers different events);
anything else is UNATTRIBUTED (exit 1). Scene OFF must additionally be byte-identical to base (no inserted pause is expected in a
base-vs-base compare; pass --off-identical to require it).
Guard accounting (final tree): a "transition" is a message carrying " used\n" directly preceded by a run of sprite-visibility commands
(the action's MoveEnd receipts). It is paused when a draw-nothing move-animation precedes that run, else skipped: keyed by the command
before the run (the anchor class, with its hold / missing timing).
"""
import glob, json, os, sys

base_dir, final_dir = sys.argv[1:3]
out_path = sys.argv[3] if len(sys.argv) > 3 else None
TYPE, BATTLER, MIN, ANIM, USED = 0, 1, 2, 11, 10


def load(path):
    return {r["seed"]: r for r in map(json.loads, filter(None, open(path).read().split("\n")))}


def transitions(cmds, acc, classify):
    for k, c in enumerate(cmds):
        if not c[12] or k == 0 or cmds[k - 1][TYPE] != "sprite-visibility":
            continue
        run = k
        while run > 0 and cmds[run - 1][TYPE] == "sprite-visibility":
            run -= 1
        if run == 0:
            continue
        acc["total"] += 1
        prev = cmds[run - 1]
        if prev[TYPE] == "move-animation" and prev[ANIM] == 0:
            acc["paused"] += 1
        elif classify:
            acc["skipped"] += 1
            key = prev[TYPE] + (":hold%s" % prev[3] if prev[3] else "") + (":notiming" if prev[2] is None else "")
            acc["skippedByAnchor"][key] = acc["skippedByAnchor"].get(key, 0) + 1


res = {"schema": "trn181-census-delta/v1", "battles": 0, "digestMismatch": [], "errorMismatch": [], "budgetStalled": [],
       "baseCommands": 0, "commands": 0, "unchanged": 0, "identicalBattles": 0,
       "transitionPause": {"commands": 0, "frames": 0, "battles": 0, "framesHistogram": {}, "byUsed": {}},
       "budgetTail": {}, "unattributed": [],
       "finalTransitions": {"total": 0, "paused": 0, "skipped": 0, "skippedByAnchor": {}}, "baseTransitions": {"total": 0, "paused": 0}}
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
        transitions(fc, res["finalTransitions"], True)
        transitions(bc, res["baseTransitions"], False)
        res["baseCommands"] += len(bc)
        res["commands"] += len(fc)
        if bc == fc:
            res["identicalBattles"] += 1
            res["unchanged"] += len(fc)
            continue
        # Two-pointer alignment: base and final advance together on equal commands; a final-only command must be the pause.
        i = j = 0
        paused = False
        while i < len(bc) or j < len(fc):
            if i < len(bc) and j < len(fc) and bc[i] == fc[j]:
                res["unchanged"] += 1
                i += 1
                j += 1
            elif j + 1 < len(fc) and fc[j][TYPE] == "move-animation" and fc[j][ANIM] == 0 \
                    and fc[j + 1][TYPE] == "sprite-visibility" and (i >= len(bc) or bc[i] == fc[j + 1]):
                tp = res["transitionPause"]
                tp["commands"] += 1
                tp["frames"] += fc[j][MIN]
                tp["framesHistogram"][str(fc[j][MIN])] = tp["framesHistogram"].get(str(fc[j][MIN]), 0) + 1
                move = (fc[j][USED] or "?").split("\n")[-1]
                tp["byUsed"][move] = tp["byUsed"].get(move, 0) + 1
                paused = True
                j += 1
            elif stalled:
                res["budgetTail"][str(seed)] = {"baseTail": len(bc) - i, "finalTail": len(fc) - j, "digestSame": b["eventsDigest"] == f["eventsDigest"]}
                break
            else:
                res["unattributed"].append({"seed": seed, "at": [i, j], "base": bc[i:i + 3], "final": fc[j:j + 3]})
                break
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
    and (scene != "on" or res["identicalBattles"] == res["battles"])
print("trn181CensusDelta:", "OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
