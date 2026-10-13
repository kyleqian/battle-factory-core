#!/usr/bin/env python3
"""offs152 R4 (docs/offs152-scene-off-send-in-tail.md): the Scene OFF route census (off108Route.ts --scene=off, seeds 0..999, 5 shards per
tree) base vs final. Claim: every move use's kernel receipts (follow rows: sequence, kind, id, source, delta) are identical (gameplay /
RNG unchanged), the projected command TYPES differ only where a `returntoball` receipt became the forced switch-out (switch-out +
sprite-visibility keep their types), and the only changed command timings are the Roar / Whirlwind / Baton Pass pause, the forced
switch-out / recall receipt and Scene OFF opponent `switch-in` commands.
usage: offs152RouteDelta.py <base-prefix> <final-prefix> <out.json>     (reads <prefix>-off-<0..4>.jsonl)"""
import collections, json, sys
bp, fp, out = sys.argv[1:4]
load = lambda p: [json.loads(l) for k in range(5) for l in open(f"{p}-off-{k}.jsonl") if l.strip()]
b, f = load(bp), load(fp)
res = {"uses": len(b), "usesFinal": len(f), "followIdentical": 0, "commandTypesIdentical": 0, "changedUses": 0,
       "changedCommands": collections.Counter(), "unexpected": [], "pauseAdded": collections.Counter()}
FORCED = {46, 18, 226}
for x, y in zip(b, f):
    if (x["seed"], x["move"], x["attacker"], x["follow"]) == (y["seed"], y["move"], y["attacker"], y["follow"]):
        res["followIdentical"] += 1
    else:
        res["unexpected"].append(["follow", x["seed"], x["move"]])
        continue
    tb, tf = [c[:2] for c in x["commands"]], [c[:2] for c in y["commands"]]
    if tb == tf:
        res["commandTypesIdentical"] += 1
    if x["commands"] == y["commands"]:
        continue
    res["changedUses"] += 1
    if tb != tf:
        # the only allowed type change: a Scene OFF no-hit pause (move-animation) added before a forced switch-out
        extra = [c for c in y["commands"] if c[:2] not in tb]
        if x["move"] in FORCED and all(c[1] == "move-animation" for c in extra):
            res["pauseAdded"][f'{x["move"]}:{extra[0][2]}'] += 1
        else:
            res["unexpected"].append(["types", x["seed"], x["move"], tb, tf])
        continue
    for c, d in zip(x["commands"], y["commands"]):
        if c != d:
            res["changedCommands"][c[1]] += 1
            if c[1] not in ("switch-in", "switch-out", "sprite-visibility") and not (c[1] == "move-animation" and x["move"] in FORCED):
                res["unexpected"].append(["timing", x["seed"], x["move"], c, d])
res["changedCommands"] = dict(res["changedCommands"]); res["pauseAdded"] = dict(res["pauseAdded"])
res["unexpected"] = res["unexpected"][:20]
res["claimHolds"] = res["uses"] == res["usesFinal"] and not res["unexpected"]
json.dump(res, open(out, "w"), indent=1); open(out, "a").write("\n")
print(json.dumps(res))
sys.exit(0 if res["claimHolds"] else 1)
