#!/usr/bin/env python3
"""lsd194 census delta (docs/lsd194-print-floor-and-drain.md): lsd194Census.ts output of two trees (base, final), one scene.

usage: lsd194CensusDelta.py <base-arm-dir> <final-arm-dir> [<out.json>]

Per battle the kernel-event digest and error field must be equal (gameplay / RNG / damage unchanged). Commands are compared pairwise after skipping the
inserted LEECH_SEED_DRAIN general-animation commands of the final tree. A changed command must be
  (A) a message with timing (24, h) -> (0, h) (any equal hold h: 64 plain, larger when the print carries extra hold rows) whose ONLY other change is the presented frames [18] (WAITMESSAGE_LONG floor drop):
      L = printable length [9]; L >= 24 -> frames unchanged ("floor L>=24"), L < 24 -> frames - (24 - L) ("floor L<24", per L), or
  (B) the hp command right after an inserted drain animation (seeded: min 28 -> 0, tail 0 -> 8) or the next hp command (receiver: min 28 -> 0, tail 0 -> 3),
      whose ONLY changes are [2] / [20] minimumFrames, [14] tailFrames and the frames [18]; frame deltas counted per role.
Inserted drain animations are counted with their frames (the field-hold of the animation + the lead). Anything else is UNATTRIBUTED (exit 1).
A battle that hits the 200k-frame budget in BOTH trees is reported as budget-tail from its first non-explainable difference on."""
import glob, json, os, sys
from collections import defaultdict

base_dir, final_dir = sys.argv[1:3]
out_path = sys.argv[3] if len(sys.argv) > 3 else None
TYPE, MIN, HOLD, LEN, TAILF, FRAMES, ANIM, HPMIN = 0, 2, 3, 9, 14, 18, 19, 20


def load(path):
    return {r["seed"]: r for r in map(json.loads, filter(None, open(path).read().split("\n")))}


def only(x, y, idxs):
    return len(x) == len(y) and all(x[k] == y[k] for k in range(len(x)) if k not in idxs)


res = {"schema": "lsd194-census-delta/v1", "battles": 0, "digestMismatch": [], "errorMismatch": [], "budgetStalled": [], "baseCommands": 0,
       "commands": 0, "unchanged": 0, "identicalBattles": 0, "changedBattles": 0, "typeSequenceChanged": [], "budgetTail": {}, "unattributed": [],
       "printFloor": {"commandsL_lt_24": 0, "framesL_lt_24": 0, "byL": {}, "commandsL_ge_24": 0, "framesL_ge_24": 0},
       "drain": {"battlesWithDrain": 0, "insertedAnimations": 0, "animationFrames": {}, "seededHp": {"commands": 0, "frameDelta": {}}, "receiverHp": {"commands": 0, "frameDelta": {}}}}
by_l = defaultdict(lambda: {"commands": 0, "frames": 0})
scene = None
for bpath in sorted(glob.glob(os.path.join(base_dir, "r[0-9].jsonl"))):
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
        inserted = [i for i, c in enumerate(fc) if c[TYPE] == "general-animation" and c[ANIM] == "LEECH_SEED_DRAIN"]
        fcore = [c for i, c in enumerate(fc) if i not in set(inserted)]
        if inserted:
            res["drain"]["battlesWithDrain"] += 1
        # role of an hp command in the final tree: seeded = right after an inserted animation, receiver = the next hp after that
        role = {}
        for i in inserted:
            j = i + 1
            if j < len(fc) and fc[j][TYPE] == "hp":
                role[j - sum(1 for k in inserted if k < j)] = "seeded"
                for k in range(j + 1, len(fc)):
                    if fc[k][TYPE] == "hp":
                        role[k - sum(1 for q in inserted if q < k)] = "receiver"
                        break
        for i in inserted:
            res["drain"]["insertedAnimations"] += 1
            d = res["drain"]["animationFrames"]
            d[str(fc[i][FRAMES])] = d.get(str(fc[i][FRAMES]), 0) + 1
        if [c[TYPE] for c in bc] != [c[TYPE] for c in fcore] and not stalled:
            res["typeSequenceChanged"].append(seed)
        if bc == fc:
            res["identicalBattles"] += 1
            res["unchanged"] += len(fc)
            continue
        changed = bool(inserted)
        for i in range(max(len(bc), len(fcore))):
            x = bc[i] if i < len(bc) else None
            y = fcore[i] if i < len(fcore) else None
            if x == y:
                res["unchanged"] += 1
                continue
            if x is not None and y is not None and x[TYPE] == y[TYPE] == "message" and only(x, y, (MIN, FRAMES)) and x[MIN] == 24 and y[MIN] == 0 \
                    and x[HOLD] == y[HOLD]:
                L = y[LEN]
                dlt = y[FRAMES] - x[FRAMES]
                p = res["printFloor"]
                if L is not None and L >= 24 and dlt == 0:
                    p["commandsL_ge_24"] += 1
                elif L is not None and L < 24 and dlt == L - 24:
                    p["commandsL_lt_24"] += 1
                    p["framesL_lt_24"] += dlt
                    by_l[L]["commands"] += 1
                    by_l[L]["frames"] += dlt
                else:
                    res["unattributed"].append({"seed": seed, "at": i, "base": x, "final": y, "why": "print frames"})
                    break
                changed = True
            elif x is not None and y is not None and x[TYPE] == y[TYPE] == "hp" and role.get(i) and only(x, y, (MIN, HPMIN, TAILF, FRAMES)) \
                    and x[MIN] == 28 and y[MIN] == 0 and x[HPMIN] == 28 and y[HPMIN] == 0 and x[TAILF] == 0 and y[TAILF] == (8 if role[i] == "seeded" else 3):
                key = "seededHp" if role[i] == "seeded" else "receiverHp"
                d = res["drain"][key]
                d["commands"] += 1
                dl = str(y[FRAMES] - x[FRAMES])
                d["frameDelta"][dl] = d["frameDelta"].get(dl, 0) + 1
                changed = True
            elif stalled:
                res["budgetTail"][str(seed)] = {"baseTail": len(bc) - i, "finalTail": len(fcore) - i, "digestSame": b["eventsDigest"] == f["eventsDigest"]}
                break
            else:
                res["unattributed"].append({"seed": seed, "at": i, "base": x, "final": y})
                break
        if changed:
            res["changedBattles"] += 1
res["printFloor"]["byL"] = {str(k): v for k, v in sorted(by_l.items())}
res["scene"] = scene
res["unattributedCount"] = len(res["unattributed"])
res["unattributed"] = res["unattributed"][:20]
txt = json.dumps(res, indent=1)
if out_path:
    open(out_path, "w").write(txt + "\n")
print(json.dumps({k: v for k, v in res.items() if k not in ("unattributed",)})[:3000])
for u in res["unattributed"][:5]:
    print("UNATTRIBUTED", json.dumps(u)[:400])
ok = not res["digestMismatch"] and not res["errorMismatch"] and not res["unattributedCount"] and not res["typeSequenceChanged"]
print("lsd194CensusDelta:", "OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
