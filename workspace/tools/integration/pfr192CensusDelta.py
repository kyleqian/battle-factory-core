#!/usr/bin/env python3
"""pfr192 census delta: pfr192Census.ts output of the base tree and the final tree, one scene.
usage: pfr192CensusDelta.py <base-arm-dir> <final-arm-dir> [<out.json>]

Per battle: kernel-event digest and error identical (gameplay / RNG / damage / AI / turn order unchanged) and every presentation command row
identical (the keyed clock lives in the party select / orchestrator, no projected command changes).  What may change is each PLAYER
replacement's send-in length (sendIn = [species, name length, personality, frames confirm->action menu, readyAt, expected prompt, trailing]).
A changed sendIn is attributed iff  final - base == readyAt - 311  (base resumes the lifecycle at the fixed party-select frame 311, final at
the keyed readyAt; everything after is the same commands) AND, when only `turn-end` follows the switch-in, final == 91 + name + D + 17 (the
ROM prompt frame).  A battle's total frame delta must equal the sum of its sendIn deltas; a residual of +-1 is the census driver's
`frame % 2` message-dismiss A press landing on the other parity ("parity"), anything else is UNATTRIBUTED (exit 1).  A battle that hits the
200k-frame input budget in BOTH trees is "budget-tail" (its event digest covers different events), as in fpc180CensusDelta.py.
"""
import glob, json, os, sys

base_dir, final_dir = sys.argv[1:3]
out_path = sys.argv[3] if len(sys.argv) > 3 else None
res = {"schema": "pfr192-census-delta/v1", "battles": 0, "digestMismatch": [], "errorMismatch": [], "budgetStalled": [], "commandRows": 0, "commandRowsChanged": 0,
       "sendIns": 0, "sendInsChanged": 0, "sendInsUnchanged": 0, "byTrailing": {}, "turnEndOnlyExact": 0, "deltaMin": None, "deltaMax": None,
       "battlesWithSendIn": 0, "battlesFrameChanged": 0, "paritySteps": 0, "budgetTail": [], "unattributed": []}
scene = None
for bpath in sorted(glob.glob(os.path.join(base_dir, "r*.jsonl"))):
    load = lambda p: {r["seed"]: r for r in map(json.loads, filter(None, open(p).read().split("\n")))}
    base, final = load(bpath), load(os.path.join(final_dir, os.path.basename(bpath)))
    for seed in sorted(base):
        b, f = base[seed], final[seed]
        scene = f["scene"]
        res["battles"] += 1
        stalled = bool(b["error"]) and b["error"] == f["error"] and "frame budget" in b["error"]
        if b["error"] != f["error"]:
            res["errorMismatch"].append(seed)
        elif b["error"]:
            res["budgetStalled"].append(seed)
        if b["eventsDigest"] != f["eventsDigest"] and not stalled:
            res["digestMismatch"].append(seed)
        res["commandRows"] += len(f["commands"])
        if b["commands"] != f["commands"] and not stalled:
            res["commandRowsChanged"] += sum(1 for x, y in zip(b["commands"], f["commands"]) if x != y) + abs(len(b["commands"]) - len(f["commands"]))
            res["unattributed"].append({"seed": seed, "why": "command rows differ"})
            continue
        if stalled:
            res["budgetTail"].append(seed)
            continue
        bs, fs = b["sendIns"], f["sendIns"]
        if len(bs) != len(fs):
            res["unattributed"].append({"seed": seed, "why": "sendIn count", "base": len(bs), "final": len(fs)})
            continue
        total = 0
        bad = False
        for x, y in zip(bs, fs):
            res["sendIns"] += 1
            tr = y[6]
            key = tr if tr == "turn-end" else "other:" + tr
            if x[:3] != y[:3] or x[6] != y[6]:
                res["unattributed"].append({"seed": seed, "why": "sendIn identity", "base": x, "final": y}); bad = True; break
            d = y[3] - x[3]
            total += d
            if d == 0:
                res["sendInsUnchanged"] += 1
            res["sendInsChanged"] += 1 if d else 0
            ok = d == y[4] - 311 and (tr != "turn-end" or y[3] == y[5])
            if tr == "turn-end" and y[3] == y[5]:
                res["turnEndOnlyExact"] += 1
            res["byTrailing"][key] = res["byTrailing"].get(key, 0) + 1
            res["deltaMin"] = d if res["deltaMin"] is None else min(res["deltaMin"], d)
            res["deltaMax"] = d if res["deltaMax"] is None else max(res["deltaMax"], d)
            if not ok:
                res["unattributed"].append({"seed": seed, "why": "sendIn delta", "base": x, "final": y}); bad = True; break
        if bad:
            continue
        if bs:
            res["battlesWithSendIn"] += 1
        extra = (f["frames"] - b["frames"]) - total
        if f["frames"] != b["frames"]:
            res["battlesFrameChanged"] += 1
        if extra == 0:
            continue
        if abs(extra) <= 1:
            res["paritySteps"] += 1
        else:
            res["unattributed"].append({"seed": seed, "why": "frame residual", "extra": extra, "base": b["frames"], "final": f["frames"]})
res["scene"] = scene
res["unattributedCount"] = len(res["unattributed"])
res["unattributed"] = res["unattributed"][:20]
if out_path:
    open(out_path, "w").write(json.dumps(res, indent=1) + "\n")
print(json.dumps({k: v for k, v in res.items() if k != "unattributed"})[:1800])
for u in res["unattributed"][:5]:
    print("UNATTRIBUTED", json.dumps(u)[:400])
ok = not res["digestMismatch"] and not res["errorMismatch"] and not res["unattributedCount"]
print("pfr192CensusDelta:", "OK" if ok else "FAIL")
sys.exit(0 if ok else 1)
