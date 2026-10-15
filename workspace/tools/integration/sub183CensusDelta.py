#!/usr/bin/env python3
"""sub183 census delta (docs/sub183-substitute-turn-timing.md): sub183Census.ts output of two trees (base, final), one scene.

usage: sub183CensusDelta.py <base-arm-dir> <final-arm-dir> [<out.json>]

Per battle: the kernel-event digest must be identical (gameplay / RNG / damage / turn order unchanged) and the error field equal.
Commands are compared pairwise (equal length and types: a duration change adds or removes no command). A changed command must be
  (a) a Substitute (request move 164) move-animation whose ONLY change is scriptLeadFrames [13] 0 -> 4  (+6 frames when the body is live
      [11] == 1: 4 lead rows + 2 universal post rows; +0 when it is a draw-nothing pause), or
  (b) the hp command right after such a body whose ONLY change is tailFrames [14] 0 -> 3  (+3 frames).
Anything else is UNATTRIBUTED (exit 1). A battle that hits the tool's 200k-frame budget in BOTH trees (434 / 796 / 881, pre-existing) is
reported as budget-tail from its first non-explainable difference on (its event digest then covers different events)."""
import glob, json, os, sys

base_dir, final_dir = sys.argv[1:3]
out_path = sys.argv[3] if len(sys.argv) > 3 else None
TYPE, LIVE, LEAD, TAIL, MOVE = 0, 11, 13, 14, 15


def load(path):
    return {r["seed"]: r for r in map(json.loads, filter(None, open(path).read().split("\n")))}


def only(x, y, idx, a, b):
    return len(x) == len(y) and x[idx] == a and y[idx] == b and all(x[k] == y[k] for k in range(len(x)) if k != idx)


res = {"schema": "sub183-census-delta/v1", "battles": 0, "digestMismatch": [], "errorMismatch": [], "budgetStalled": [],
       "baseCommands": 0, "commands": 0, "unchanged": 0, "identicalBattles": 0, "typeSequenceChanged": [],
       "substituteBodies": {"liveChanged": 0, "nonLiveChanged": 0, "frames": 0, "battles": 0},
       "hpTails": {"changed": 0, "frames": 0}, "substituteBodiesInBase": 0, "budgetTail": {}, "unattributed": []}
scene = None
seen_bodies = set()
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
        if [c[TYPE] for c in bc] != [c[TYPE] for c in fc] and not stalled:
            res["typeSequenceChanged"].append(seed)
        res["substituteBodiesInBase"] += sum(1 for c in bc if c[TYPE] == "move-animation" and c[MOVE] == 164)
        if bc == fc:
            res["identicalBattles"] += 1
            res["unchanged"] += len(fc)
            continue
        changed = False
        bodyChanged = set()
        for i in range(max(len(bc), len(fc))):
            x = bc[i] if i < len(bc) else None
            y = fc[i] if i < len(fc) else None
            if x == y:
                res["unchanged"] += 1
                continue
            if x is not None and y is not None and x[TYPE] == y[TYPE] == "move-animation" and x[MOVE] == 164 and only(x, y, LEAD, 0, 4):
                sb = res["substituteBodies"]
                if y[LIVE] == 1:
                    sb["liveChanged"] += 1
                    sb["frames"] += 6
                else:
                    sb["nonLiveChanged"] += 1
                bodyChanged.add(i)
                changed = True
            elif x is not None and y is not None and x[TYPE] == y[TYPE] == "hp" and (i - 1) in bodyChanged and only(x, y, TAIL, 0, 3):
                res["hpTails"]["changed"] += 1
                res["hpTails"]["frames"] += 3
                changed = True
            elif stalled:
                res["budgetTail"][str(seed)] = {"baseTail": len(bc) - i, "finalTail": len(fc) - i, "digestSame": b["eventsDigest"] == f["eventsDigest"]}
                break
            else:
                res["unattributed"].append({"seed": seed, "at": i, "base": x, "final": y})
                break
        if changed:
            res["substituteBodies"]["battles"] += 1
res["scene"] = scene
res["unattributedCount"] = len(res["unattributed"])
res["unattributed"] = res["unattributed"][:20]
txt = json.dumps(res, indent=1)
if out_path:
    open(out_path, "w").write(txt + "\n")
print(json.dumps({k: v for k, v in res.items() if k not in ("unattributed",)})[:1800])
for u in res["unattributed"][:5]:
    print("UNATTRIBUTED", json.dumps(u)[:400])
ok = not res["digestMismatch"] and not res["errorMismatch"] and not res["unattributedCount"] and not res["typeSequenceChanged"]
print("sub183CensusDelta:", "OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
