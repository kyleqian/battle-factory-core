#!/usr/bin/env python3
"""fpc180 census delta (docs/fpc180-focus-punch-live.md): fpc180Census.ts output of two trees, one scene.

usage: fpc180CensusDelta.py <base-arm-dir> <final-arm-dir> [<out.json>]     (every r*.jsonl in <base> has a same-named file in <final>)

Per battle: the kernel-event digest must be identical (gameplay / RNG / damage / turn order unchanged) and the error field equal.
Commands are compared one to one (the change never adds or removes a command in a census battle: the census never plays a voluntary
switch, so the recall reorder does not occur). A changed command is attributed to the Focus Punch rules only when it is a pre-pass
focus print ("is tightening", field [12] = the next USEDMOVE print's u, "pre" when another pre-pass print follows, -1 when the next
print is not a USEDMOVE) whose ONLY difference is holdFrames [3], by exactly
    u >= 0:   (5 + u) - 11        "pre":   5 - 7 = -2        -1:   0 (so it must not change at all).
A battle that hits the census tool's 200k-frame input budget in BOTH trees (pre-existing: 434 / 796 / 881) is attributed from its
first non-explainable difference on as budget-tail (its event digest then covers different events). Anything else is UNATTRIBUTED (exit 1).
"""
import glob, json, os, sys

base_dir, final_dir = sys.argv[1:3]
out_path = sys.argv[3] if len(sys.argv) > 3 else None
TYPE, HOLD, USEDU = 0, 3, 12


def load(path):
    return {r["seed"]: r for r in map(json.loads, filter(None, open(path).read().split("\n")))}


def expected_delta(u):
    return -2 if u == "pre" else (0 if u == -1 else (5 + u) - 11)


res = {"schema": "fpc180-census-delta/v1", "battles": 0, "digestMismatch": [], "errorMismatch": [], "budgetStalled": [],
       "baseCommands": 0, "commands": 0, "unchanged": 0, "identicalBattles": 0, "prePassPrints": 0,
       "prePassByClass": {}, "focusPunchChanged": {"commands": 0, "battles": 0, "byDelta": {}, "byU": {}},
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
        for c in fc:
            if len(c) > USEDU and c[USEDU] is not None:
                res["prePassPrints"] += 1
                key = "pre" if c[USEDU] == "pre" else ("none" if c[USEDU] == -1 else "u=%d" % c[USEDU])
                res["prePassByClass"][key] = res["prePassByClass"].get(key, 0) + 1
        if bc == fc:
            res["identicalBattles"] += 1
            res["unchanged"] += len(fc)
            continue
        fp = False
        for i in range(max(len(bc), len(fc))):
            x = bc[i] if i < len(bc) else None
            y = fc[i] if i < len(fc) else None
            if x == y:
                res["unchanged"] += 1
                continue
            ok = (x is not None and y is not None and x[TYPE] == "message" and y[TYPE] == "message" and len(x) > USEDU
                  and x[USEDU] is not None and x[USEDU] == y[USEDU] and x[:HOLD] == y[:HOLD] and x[HOLD + 1:] == y[HOLD + 1:]
                  and y[HOLD] - x[HOLD] == expected_delta(x[USEDU]) and expected_delta(x[USEDU]) != 0)
            if ok:
                fcp = res["focusPunchChanged"]
                fcp["commands"] += 1
                d = str(y[HOLD] - x[HOLD])
                fcp["byDelta"][d] = fcp["byDelta"].get(d, 0) + 1
                u = "pre" if x[USEDU] == "pre" else "u=%d" % x[USEDU]
                fcp["byU"][u] = fcp["byU"].get(u, 0) + 1
                fp = True
            elif stalled:
                res["budgetTail"][str(seed)] = {"baseTail": len(bc) - i, "finalTail": len(fc) - i, "digestSame": b["eventsDigest"] == f["eventsDigest"]}
                break
            else:
                res["unattributed"].append({"seed": seed, "at": i, "base": x, "final": y})
                break
        res["focusPunchChanged"]["battles"] += 1 if fp else 0
res["scene"] = scene
res["unattributedCount"] = len(res["unattributed"])
res["unattributed"] = res["unattributed"][:20]
txt = json.dumps(res, indent=1)
if out_path:
    open(out_path, "w").write(txt + "\n")
print(json.dumps({k: v for k, v in res.items() if k not in ("unattributed",)})[:1800])
for u in res["unattributed"][:5]:
    print("UNATTRIBUTED", json.dumps(u)[:400])
ok = not res["digestMismatch"] and not res["errorMismatch"] and not res["unattributedCount"]
print("fpc180CensusDelta:", "OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
