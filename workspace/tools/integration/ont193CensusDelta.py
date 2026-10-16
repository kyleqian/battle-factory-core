#!/usr/bin/env python3
"""ont193 census delta (docs/ont193-scene-on-tails.md): ont193Census.ts output of two trees (base, final), one scene.

usage: ont193CensusDelta.py <base-arm-dir> <final-arm-dir> [<out.json>]

Per battle: the kernel-event digest must be identical (gameplay / RNG / damage / turn order unchanged) and the error field equal.
Commands are compared pairwise (equal length and types). A changed command must be
  (A) a move-animation whose ONLY changes are [17] scriptTailRows 0 -> y > 0 and [16] presented frames + d (d >= 0)
      (class "script tail": per move id; ROM-measured moves Bulk Up 339 / Protect 182 / Detect 197 / Sand-Attack 28 are counted apart), or
  (B) a Focus Punch pre-pass print ("is tightening", [12] not null) whose ONLY change is minimumFrames [2] - 2 (fpo187 animWait 2 -> 0).
Anything else is UNATTRIBUTED (exit 1). A battle that hits the tool's 200k-frame budget in BOTH trees is reported as budget-tail from its
first non-explainable difference on."""
import glob, json, os, sys
from collections import defaultdict

base_dir, final_dir = sys.argv[1:3]
out_path = sys.argv[3] if len(sys.argv) > 3 else None
TYPE, MIN, PRE, MOVE, DUR, TAIL = 0, 2, 12, 15, 16, 17
ROM = {339: "Bulk Up", 182: "Protect", 197: "Detect", 28: "Sand-Attack"}


def load(path):
    return {r["seed"]: r for r in map(json.loads, filter(None, open(path).read().split("\n")))}


def only(x, y, idxs):
    return len(x) == len(y) and all(x[k] == y[k] for k in range(len(x)) if k not in idxs)


res = {"schema": "ont193-census-delta/v1", "battles": 0, "digestMismatch": [], "errorMismatch": [], "budgetStalled": [],
       "baseCommands": 0, "commands": 0, "unchanged": 0, "identicalBattles": 0, "changedBattles": 0, "typeSequenceChanged": [],
       "scriptTail": {"commands": 0, "frames": 0, "byMove": {}}, "prePassTightening": {"commands": 0, "frames": 0},
       "budgetTail": {}, "unattributed": []}
by_move = defaultdict(lambda: {"commands": 0, "frames": 0, "tailRows": defaultdict(int), "frameDelta": defaultdict(int)})
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
        if [c[TYPE] for c in bc] != [c[TYPE] for c in fc] and not stalled:
            res["typeSequenceChanged"].append(seed)
        if bc == fc:
            res["identicalBattles"] += 1
            res["unchanged"] += len(fc)
            continue
        changed = False
        for i in range(max(len(bc), len(fc))):
            x = bc[i] if i < len(bc) else None
            y = fc[i] if i < len(fc) else None
            if x == y:
                res["unchanged"] += 1
                continue
            if x is not None and y is not None and x[TYPE] == y[TYPE] == "move-animation" and only(x, y, (DUR, TAIL)) \
                    and x[TAIL] == 0 and y[TAIL] > 0 and y[DUR] >= x[DUR]:
                d = y[DUR] - x[DUR]
                st = res["scriptTail"]
                st["commands"] += 1
                st["frames"] += d
                m = by_move[y[MOVE]]
                m["commands"] += 1
                m["frames"] += d
                m["tailRows"][y[TAIL]] += 1
                m["frameDelta"][d] += 1
                changed = True
            elif x is not None and y is not None and x[TYPE] == y[TYPE] == "message" and x[PRE] is not None and only(x, y, (MIN,)) \
                    and y[MIN] == x[MIN] - 2:
                res["prePassTightening"]["commands"] += 1
                res["prePassTightening"]["frames"] -= 2
                changed = True
            elif stalled:
                res["budgetTail"][str(seed)] = {"baseTail": len(bc) - i, "finalTail": len(fc) - i, "digestSame": b["eventsDigest"] == f["eventsDigest"]}
                break
            else:
                res["unattributed"].append({"seed": seed, "at": i, "base": x, "final": y})
                break
        if changed:
            res["changedBattles"] += 1
for mv, m in sorted(by_move.items(), key=lambda kv: -kv[1]["commands"]):
    res["scriptTail"]["byMove"][str(mv)] = {"rom": ROM.get(mv), "commands": m["commands"], "frames": m["frames"],
                                           "tailRows": dict(m["tailRows"]), "frameDelta": dict(m["frameDelta"])}
res["scene"] = scene
res["unattributedCount"] = len(res["unattributed"])
res["unattributed"] = res["unattributed"][:20]
txt = json.dumps(res, indent=1)
if out_path:
    open(out_path, "w").write(txt + "\n")
print(json.dumps({k: v for k, v in res.items() if k not in ("unattributed",)})[:2500])
for u in res["unattributed"][:5]:
    print("UNATTRIBUTED", json.dumps(u)[:400])
ok = not res["digestMismatch"] and not res["errorMismatch"] and not res["unattributedCount"] and not res["typeSequenceChanged"]
print("ont193CensusDelta:", "OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
