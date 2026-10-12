#!/usr/bin/env python3
"""scf117 (S10A, ISSUES #166; docs/scf117-stats-change-finish.md): census delta base vs final (sc106LiveShareCensus.ts seeds 0..999,
ten --index-from shards per tree, Scene ON). Expected: only the documented changes.
- move / substitute-fade commands (r<k>.jsonl, KEY = battle, kind, moveId, side, attacker, target): KEY sequence identical per
  battle, or (a battle that stalls at the census FRAME_BUDGET in either tree) one tree's commands a proven prefix of the other's;
  every status change listed (rung 2 / 3 lifts; live -> fallback must be 0) with its frames;
- per-event stats-change rows (s<k>.jsonl): the same events / presented flags; rows(final) - rows(base) = the rung-1 hold;
- battleDigestExcludingFrames per shard: identical, or the difference confined to the budget-stalled battles;
- frames: per battle, final - base = sum(stats-change row deltas) + sum(changed move commands' frame deltas) outside stalled battles.
usage: scf117CensusDelta.py <base-shard-dir> <final-shard-dir> <out.json>
"""
import collections, json, sys

bdir, fdir, out = sys.argv[1:4]
lines = lambda path: [json.loads(l) for l in open(path) if l.strip()]
key = lambda c: (c["kind"], c.get("moveId"), c["side"], c["attacker"], c["target"])
res = {"shards": {}, "commandsBase": 0, "commandsFinal": 0, "liveBase": 0, "liveFinal": 0, "liveFramesBase": 0, "liveFramesFinal": 0,
       "framesBase": 0, "framesFinal": 0, "statusChanges": [], "liveToFallback": 0, "frameChangesWithoutStatusChange": 0,
       "stalledBattles": [], "keyMismatchBattles": [], "statsEventsBase": 0, "statsEventsFinal": 0, "statsEventMismatches": 0,
       "presentedBase": 0, "presentedFinal": 0, "presentedRowsBase": 0, "presentedRowsFinal": 0, "holdHistogram": {},
       "frameBalanceMismatches": [], "digestExcludingFramesEqualShards": 0}
for k in range(10):
    B, F = lines(f"{bdir}/r{k}.jsonl"), lines(f"{fdir}/r{k}.jsonl")
    rb, rf = json.load(open(f"{bdir}/r{k}.json")), json.load(open(f"{fdir}/r{k}.json"))
    sb = [r for r in lines(f"{bdir}/s{k}.jsonl") if r.get("kind") == "stats"]
    sf = [r for r in lines(f"{fdir}/s{k}.jsonl") if r.get("kind") == "stats"]
    res["commandsBase"] += len(B); res["commandsFinal"] += len(F)
    res["liveBase"] += sum(c["status"] == "live" for c in B); res["liveFinal"] += sum(c["status"] == "live" for c in F)
    res["liveFramesBase"] += sum(c["liveFrames"] for c in B); res["liveFramesFinal"] += sum(c["liveFrames"] for c in F)
    fb_, ff_ = rb["battleFrames"], rf["battleFrames"]
    res["framesBase"] += sum(fb_); res["framesFinal"] += sum(ff_)
    eq = rb["battleDigestExcludingFrames"] == rf["battleDigestExcludingFrames"]
    res["digestExcludingFramesEqualShards"] += eq
    byB, byF = collections.defaultdict(list), collections.defaultdict(list)
    for c in B: byB[c["battle"]].append(c)
    for c in F: byF[c["battle"]].append(c)
    sbB, sbF = collections.defaultdict(list), collections.defaultdict(list)
    for r in sb: sbB[r["battle"]].append(r)
    for r in sf: sbF[r["battle"]].append(r)
    battles = sorted(set(byB) | set(byF) | set(sbB) | set(sbF))
    for i, battle in enumerate(range(k * 100, k * 100 + 100)):
        cb, cf = byB.get(battle, []), byF.get(battle, [])
        stalled = fb_[i] > 199000 or ff_[i] > 199000
        n = min(len(cb), len(cf))
        if [key(c) for c in cb[:n]] != [key(c) for c in cf[:n]] or (len(cb) != len(cf) and not stalled):
            res["keyMismatchBattles"].append(battle)
        if stalled:
            res["stalledBattles"].append({"battle": battle, "commandsBase": len(cb), "commandsFinal": len(cf), "prefix": [key(c) for c in cb[:n]] == [key(c) for c in cf[:n]],
                                          "framesBase": fb_[i], "framesFinal": ff_[i]})
        moveDelta = 0
        for b, f in zip(cb, cf):
            if b["status"] != f["status"]:
                res["statusChanges"].append({"battle": battle, "moveId": b.get("moveId"), "move": b.get("move"), "side": b["side"], "attacker": b["attacker"],
                    "target": b["target"], "base": b["status"], "final": f["status"], "baseDecline": (b.get("decline") or {}).get("reason"),
                    "baseDetail": (b.get("decline") or {}).get("detail"), "framesBase": b["frames"], "framesFinal": f["frames"]})
                if b["status"] == "live": res["liveToFallback"] += 1
            elif b["frames"] != f["frames"]:
                res["frameChangesWithoutStatusChange"] += 1
            moveDelta += f["frames"] - b["frames"]
        tb, tf = sbB.get(battle, []), sbF.get(battle, [])
        m = min(len(tb), len(tf))
        res["statsEventsBase"] += len(tb); res["statsEventsFinal"] += len(tf)
        statsDelta = 0
        for b, f in zip(tb[:m], tf[:m]):
            if (b["sequence"], b["argument"], b["presented"]) != (f["sequence"], f["argument"], f["presented"]): res["statsEventMismatches"] += 1
            if f["presented"]:
                h = f["rows"] - b["rows"]
                res["holdHistogram"][str(h)] = res["holdHistogram"].get(str(h), 0) + 1
                statsDelta += h
        if len(tb) != len(tf) and not stalled: res["statsEventMismatches"] += abs(len(tb) - len(tf))
        res["presentedBase"] += sum(r["presented"] for r in tb); res["presentedFinal"] += sum(r["presented"] for r in tf)
        res["presentedRowsBase"] += sum(r["rows"] for r in tb if r["presented"]); res["presentedRowsFinal"] += sum(r["rows"] for r in tf if r["presented"])
        if not stalled and ff_[i] - fb_[i] != statsDelta + moveDelta:
            res["frameBalanceMismatches"].append({"battle": battle, "delta": ff_[i] - fb_[i], "stats": statsDelta, "moves": moveDelta})
    res["shards"][k] = {"digestExcludingFramesEqual": eq, "commandsBase": len(B), "commandsFinal": len(F)}
res["statusChangeCount"] = len(res["statusChanges"])
res["statusChangesByMove"] = dict(collections.Counter(f'{c["move"]}:{c["base"]}->{c["final"]}:{c["baseDecline"]}' for c in res["statusChanges"]))
for side in ("Base", "Final"):
    res[f"liveShareCount{side}"] = round(100 * res[f"live{side}"] / res[f"commands{side}"], 2)
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k: v for k, v in res.items() if k not in ("statusChanges", "shards")}, indent=None)[:3000])
