#!/usr/bin/env python3
"""msg175 census delta (docs/msg175-used-message-duration.md): msg175Census.ts output of two trees, per scene.

usage: msg175CensusDelta.py <base-dir> <final-dir> [<out.json>]     (every *.jsonl in <base-dir> has a same-named file in <final-dir>)

Per battle: the kernel-event digest must be identical (gameplay / RNG / damage / turn order unchanged) and the error field equal.
Commands are aligned with difflib on (type, battler); every change must be attributed:
  used-print   a "used" message (24, h) -> (0, h); frames max(24, L) - L;
  wish-pause   an inserted Scene OFF move-animation (no live animation) right after a "...used\\nWISH!" print (ISSUES #167 (a));
  budget-tail  a battle that hits the census tool's 200k-frame input budget in BOTH trees (pre-existing: 434 / 796 / 881) and, with
               shorter prints, reaches further: commands appended after the base's last one only (its event digest then covers more
               events; reported as budgetTail, not a gameplay change);
anything else is UNATTRIBUTED (exit 1).
"""
import difflib, glob, json, os, sys

base_dir, final_dir = sys.argv[1:3]
out_path = sys.argv[3] if len(sys.argv) > 3 else None
TYPE, BATTLER, MIN, HOLD, LEN, USED = 0, 1, 2, 3, 9, 10


def load(path):
    return {r["seed"]: r for r in map(json.loads, filter(None, open(path).read().split("\n")))}


def frames(c):
    if c[TYPE] == "message":
        return max(c[MIN] or 0, c[LEN] or 0) + (c[HOLD] or 0)
    return None  # only message durations are derivable from the census record alone


res = {"schema": "msg175-census-delta/v1", "battles": 0, "digestMismatch": [], "errorMismatch": [], "budgetStalled": [],
       "commands": 0, "unchanged": 0, "usedPrint": {"commands": 0, "framesSaved": 0, "noFrameChange": 0},
       "wishPause": {"commands": 0, "frames": 0}, "budgetTail": {}, "unattributed": []}
for bpath in sorted(glob.glob(os.path.join(base_dir, "*.jsonl"))):
    base, final = load(bpath), load(os.path.join(final_dir, os.path.basename(bpath)))
    for seed in sorted(base):
        b, f = base[seed], final[seed]
        res["battles"] += 1
        stalled = bool(b["error"]) and b["error"] == f["error"] and "frame budget" in b["error"]
        if b["eventsDigest"] != f["eventsDigest"] and not stalled:
            res["digestMismatch"].append(seed)
        if b["error"] != f["error"]:
            res["errorMismatch"].append(seed)
        elif b["error"]:
            res["budgetStalled"].append(seed)
        bc, fc = b["commands"], f["commands"]
        res["commands"] += len(fc)
        sm = difflib.SequenceMatcher(a=[(c[TYPE], c[BATTLER]) for c in bc], b=[(c[TYPE], c[BATTLER]) for c in fc], autojunk=False)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == "equal":
                for x, y in zip(bc[i1:i2], fc[j1:j2]):
                    if x == y:
                        res["unchanged"] += 1
                    elif x[TYPE] == "message" and x[USED] is not None and x[LEN] == y[LEN] and " used\n" in (y[USED] or "") \
                            and x[MIN] == 24 and y[MIN] == 0 and x[HOLD] == y[HOLD] and x[:MIN] == y[:MIN] and x[4:] == y[4:]:
                        res["usedPrint"]["commands"] += 1
                        saved = frames(x) - frames(y)
                        res["usedPrint"]["framesSaved"] += saved
                        if saved == 0:
                            res["usedPrint"]["noFrameChange"] += 1
                    else:
                        res["unattributed"].append({"seed": seed, "base": x, "final": y})
            elif tag == "insert" and all(c[TYPE] == "move-animation" and (c[USED] or "").endswith("\nWISH!") for c in fc[j1:j2]) \
                    and f["scene"] == "off":
                res["wishPause"]["commands"] += j2 - j1
                res["wishPause"]["frames"] += sum(c[MIN] for c in fc[j1:j2])
            elif tag == "insert" and stalled and i1 == len(bc) and j2 == len(fc):
                res["budgetTail"][str(seed)] = {"appendedCommands": j2 - j1, "digestSame": b["eventsDigest"] == f["eventsDigest"]}
            else:
                res["unattributed"].append({"seed": seed, "tag": tag, "base": bc[i1:i2], "final": fc[j1:j2]})
res["unattributedCount"] = len(res["unattributed"])
res["unattributed"] = res["unattributed"][:20]
txt = json.dumps(res, indent=1)
if out_path:
    open(out_path, "w").write(txt + "\n")
print(json.dumps({k: v for k, v in res.items() if k != "unattributed"}))
for u in res["unattributed"][:5]:
    print("UNATTRIBUTED", json.dumps(u)[:400])
ok = not res["digestMismatch"] and not res["errorMismatch"] and not res["unattributedCount"]
print("msg175CensusDelta:", "OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
