#!/usr/bin/env python3
"""off121: census delta base vs final (docs/off121-status-command.md).

usage: off121CensusDelta.py <on-base-dir> <on-final-dir> <off-base-dir> <off-final-dir> <out.json>
Scene ON (liveShareCensus.ts r<k>.json / r<k>.jsonl + hist73Merge.py merged.json): byte identity per shard file and of the merged
histogram (identical files = 0 live / fallback status changes and 0 per-command frame changes). Scene OFF (off108Route.ts off-<k>.jsonl):
per use, the receipt window (move, attacker, u, opener, attack, hit, follow) must be identical and the projected commands identical
except a `status` command's minimumFrames; every changed status command is classified by its source label (the follow row of the same
event sequence) and the print after it, with base -> final frames and the count. A use line present in only one tree (a battle that
stalls at the census FRAME_BUDGET) is reported per seed with the common-prefix check.
"""
import collections, filecmp, json, os, sys

on_base, on_final, off_base, off_final, out_path = sys.argv[1:6]
res = {"schema": "off121-census-delta/v1", "on": {}, "off": {}}
files = sorted(f for f in os.listdir(on_base) if f.endswith((".json", ".jsonl")))
same = [f for f in files if os.path.exists(os.path.join(on_final, f)) and filecmp.cmp(os.path.join(on_base, f), os.path.join(on_final, f), shallow=False)]
res["on"] = {"files": len(files), "identical": len(same), "different": sorted(set(files) - set(same))}
merged = json.load(open(os.path.join(on_final, "merged.json")))
res["on"]["mergedSummary"] = {k: merged[k] for k in list(merged)[:12] if not isinstance(merged[k], (dict, list))}

uses = {"base": collections.defaultdict(list), "final": collections.defaultdict(list)}
for tree, d in (("base", off_base), ("final", off_final)):
    for f in sorted(os.listdir(d)):
        if f.endswith(".jsonl"):
            for line in open(os.path.join(d, f)):
                if line.strip():
                    r = json.loads(line)
                    uses[tree][r["seed"]].append(r)
classes = collections.Counter()
frames = collections.Counter()
mismatch, compared, changedUses, stalled = 0, 0, 0, {}
for seed in sorted(set(uses["base"]) | set(uses["final"])):
    b, f = uses["base"][seed], uses["final"][seed]
    if len(b) != len(f):
        stalled[seed] = {"base": len(b), "final": len(f)}
    for x, y in zip(b, f):
        compared += 1
        key = ("move", "attacker", "u", "opener", "attack", "hit", "follow")
        if any(x[k] != y[k] for k in key) or len(x["commands"]) != len(y["commands"]):
            mismatch += 1
            continue
        changed = False
        for cx, cy in zip(x["commands"], y["commands"]):
            if cx == cy:
                continue
            if cx[0] != cy[0] or cx[1] != cy[1] or cx[1] != "status" or cx[3] != cy[3]:
                mismatch += 1
                break
            row = next((r for r in x["follow"] if r[0] == cx[0]), None)
            label = row[3].split(":")[0] if row else None
            nxt = None
            if row:
                i = x["follow"].index(row)
                nxt = next((r[2] for r in x["follow"][i + 1:] if r[1] == "message"), None)
            classes[(label, nxt, cx[2], cy[2])] += 1
            frames[(cx[2], cy[2])] += 1
            changed = True
        changedUses += changed
res["off"] = {
    "usesCompared": compared, "commandMismatches": mismatch, "usesWithChangedStatus": changedUses,
    "stalledSeeds": stalled,
    "statusChangedByFrames": sorted([[a, b, n] for (a, b), n in frames.items()], key=lambda r: -r[2]),
    "statusChangedFramesTotal": sum((b - a) * n for (a, b), n in frames.items()),
    "statusChangedByClass": sorted([[l, m, a, b, n] for (l, m, a, b), n in classes.items()], key=lambda r: -r[4]),
}
json.dump(res, open(out_path, "w"), indent=1)
print(json.dumps({"on": {k: res["on"][k] for k in ("files", "identical", "different")},
                  "off": {k: res["off"][k] for k in ("usesCompared", "commandMismatches", "usesWithChangedStatus", "stalledSeeds",
                                                      "statusChangedByFrames", "statusChangedFramesTotal")}}))
