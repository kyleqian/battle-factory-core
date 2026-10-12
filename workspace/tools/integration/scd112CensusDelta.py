#!/usr/bin/env python3
"""scd112 (S10A, ISSUES #166 slice d): census delta of the stats-change RENDERER (sc106LiveShareCensus.ts seeds 0..999, ten
--index-from shards per tree). This slice adds pixels, not frames, so base and final must be identical:
- every command record (r<k>.jsonl: KEY = battle, kind, moveId, side, attacker, target; status, frames, liveFrames, swapFrames,
  duration, decline) identical, in order;
- every shard's battleDigest, battleDigestExcludingFrames, commandDigest and battleFrames identical;
- every per-event stats-change row (s<k>.jsonl: presented, minimumFrames, rows, ...) identical.
usage: scd112CensusDelta.py <base-shard-dir> <final-shard-dir> <out.json>
"""
import json, sys

bdir, fdir, out = sys.argv[1:4]
lines = lambda path: [json.loads(l) for l in open(path) if l.strip()]
key = lambda c: (c["battle"], c["kind"], c.get("moveId"), c["side"], c["attacker"], c["target"])
res = {"shards": {}, "commands": 0, "keyMismatches": 0, "statusChanges": 0, "frameChanges": 0, "otherFieldChanges": 0,
       "digestMismatches": 0, "statsRows": 0, "statsRowMismatches": 0, "framesBase": 0, "framesFinal": 0,
       "presentedStatsChange": 0, "presentedStatsChangeRows": 0}
for k in range(10):
    B, F = lines(f"{bdir}/r{k}.jsonl"), lines(f"{fdir}/r{k}.jsonl")
    rb, rf = json.load(open(f"{bdir}/r{k}.json")), json.load(open(f"{fdir}/r{k}.json"))
    sb, sf = lines(f"{bdir}/s{k}.jsonl"), lines(f"{fdir}/s{k}.jsonl")
    shard = {"commands": len(F), "lengthEqual": len(B) == len(F)}
    for b, f in zip(B, F):
        res["commands"] += 1
        if key(b) != key(f): res["keyMismatches"] += 1
        if b["status"] != f["status"]: res["statusChanges"] += 1
        if b["frames"] != f["frames"] or b.get("liveFrames") != f.get("liveFrames"): res["frameChanges"] += 1
        if b != f: res["otherFieldChanges"] += 1
    if len(B) != len(F): res["keyMismatches"] += abs(len(B) - len(F))
    for d in ("battleDigest", "battleDigestExcludingFrames", "commandDigest", "battleFrames"):
        same = rb.get(d) == rf.get(d)
        shard[d] = same
        if not same: res["digestMismatches"] += 1
    res["framesBase"] += sum(x if isinstance(x, int) else x.get("frames", 0) for x in rb["battleFrames"])
    res["framesFinal"] += sum(x if isinstance(x, int) else x.get("frames", 0) for x in rf["battleFrames"])
    shard["statsRowsEqual"] = sb == sf
    res["statsRows"] += len(sf)
    res["statsRowMismatches"] += sum(1 for b, f in zip(sb, sf) if b != f) + abs(len(sb) - len(sf))
    res["presentedStatsChange"] += sum(1 for r in sf if r.get("kind") == "stats" and r.get("presented"))
    res["presentedStatsChangeRows"] += sum(r.get("rows") or 0 for r in sf if r.get("kind") == "stats" and r.get("presented"))
    res["shards"][k] = shard
res["identical"] = all(res[x] == 0 for x in ("keyMismatches", "statusChanges", "frameChanges", "otherFieldChanges", "digestMismatches",
                                               "statsRowMismatches")) and res["framesBase"] == res["framesFinal"]
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k: v for k, v in res.items() if k != "shards"}))
sys.exit(0 if res["identical"] else 1)
