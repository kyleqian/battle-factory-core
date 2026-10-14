#!/usr/bin/env python3
"""plr162: compare two plr162Census.ts outputs (base, final; same seeds / scene). Every battle's kernel-events digest must be equal and
the command lists must match except FORCED PLAYER switch-in commands (column 7 = 1); prints the per-change histogram as JSON.
  python3 tools/integration/plr162CensusDelta.py <base.jsonl...> -- <final.jsonl...>"""
import json, sys, collections
args = sys.argv[1:]; k = args.index("--")
load = lambda fs: {(d["scene"], d["seed"]): d for f in fs for d in map(json.loads, filter(None, open(f).read().split("\n")))}
base, final = load(args[:k]), load(args[k + 1:])
assert base.keys() == final.keys(), "seed sets differ"
res = {"battles": len(base), "forcedPlayerSwitchInsByScene": collections.Counter(), "errors": [], "eventsDigestDiffer": [], "typeSequenceDiffer": [], "commands": 0, "changed": 0,
       "changedNonForcedPlayer": [], "forcedPlayerSwitchIns": 0, "frameDelta": 0, "changes": collections.Counter()}
for key in sorted(base):
    b, f = base[key], final[key]
    if b["error"] or f["error"]: res["errors"].append([key, b["error"], f["error"]])  # same error in both trees: reported, not a failure
    if b["eventsDigest"] != f["eventsDigest"]: res["eventsDigestDiffer"].append(key)
    if [c[0] for c in b["commands"]] != [c[0] for c in f["commands"]]: res["typeSequenceDiffer"].append(key); continue
    res["commands"] += len(f["commands"])
    for cb, cf in zip(b["commands"], f["commands"]):
        if cf[7] == 1: res["forcedPlayerSwitchIns"] += 1; res["forcedPlayerSwitchInsByScene"][key[0]] += 1
        if cb == cf: continue
        res["changed"] += 1
        if cf[7] != 1 or cf[0] != "switch-in": res["changedNonForcedPlayer"].append([key, cb, cf]); continue
        d = (cf[2] + (cf[4] or 0)) - (cb[2] + (cb[4] or 0)); res["frameDelta"] += d
        res["changes"][f"{key[0]} species {cf[8]}: {cb[2]}+{cb[4]} slide {cb[5]} vd {cb[6]} -> {cf[2]}+{cf[4]} slide {cf[5]} vd {cf[6]}"] += 1
res["changes"] = dict(sorted(res["changes"].items())); res["changedByScene"] = collections.Counter(k.split(" ")[0] for k in res["changes"])
print(json.dumps(res, indent=1))
ok = all(e[1] == e[2] for e in res["errors"]) and not res["eventsDigestDiffer"] and not res["typeSequenceDiffer"] and not res["changedNonForcedPlayer"]
print("OK: only forced player switch-in commands move" if ok else "FAIL")
sys.exit(0 if ok else 1)
