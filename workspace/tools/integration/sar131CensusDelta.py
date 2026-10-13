#!/usr/bin/env python3
"""sar131: census delta, Scene ON 0..999 (sar131Census.sh shards of sa125LiveShareCensus.ts, base vs final; sc106 / scd112 model).
usage: sar131CensusDelta.py <base-shard-dir> <final-shard-dir> <out.json>
Checks per shard k = 0..9 (r<k>.json report, r<k>.jsonl move / substitute-fade records, s<k>.jsonl segment / status-animation / battle
records): battleDigestExcludingFrames, battleDigest, battleFrames, commandDigest; per battle (seed, streak, frames, end, turns); per
segment the command key / frames sequence; per move record the key (battle, kind, moveId, side, attacker, target), frames, status,
liveFrames, decline. Every status / liveFrames change is listed (battle, record index, move, side, base -> final status, decline).
"""
import collections, json, sys

bdir, fdir, out = sys.argv[1:4]
lines = lambda p: [json.loads(l) for l in open(p) if l.strip()]
key = lambda c: (c["battle"], c["kind"], c.get("moveId"), c["side"], c["attacker"], c["target"])
res = {"shards": {}, "moveRecords": 0, "keyMismatches": 0, "frameChanges": 0, "statusChanges": [], "liveFrameChanges": 0,
       "declineChanges": 0, "battleMismatches": 0, "segmentMismatches": 0, "totals": {}}
tot = collections.Counter()
for k in range(10):
    rb, rf = json.load(open(f"{bdir}/r{k}.json")), json.load(open(f"{fdir}/r{k}.json"))
    B, F = lines(f"{bdir}/r{k}.jsonl"), lines(f"{fdir}/r{k}.jsonl")
    sb, sf = lines(f"{bdir}/s{k}.jsonl"), lines(f"{fdir}/s{k}.jsonl")
    res["shards"][k] = {d: rb[d] == rf[d] for d in ("battleDigestExcludingFrames", "battleDigest", "battleFrames", "commandDigest")}
    bat = lambda s: {r["battle"]: (r["seed"], r["streak"], r["frames"], r["end"], r["turns"]) for r in s if r["kind"] == "battle"}
    res["battleMismatches"] += sum(1 for b, v in bat(sb).items() if bat(sf).get(b) != v)
    seg = lambda s: {(r["battle"], r["seg"]): (r["keys"], r["anims"]) for r in s if r["kind"] == "segment"}
    gb, gf = seg(sb), seg(sf)
    res["segmentMismatches"] += sum(1 for s, v in gb.items() if gf.get(s) != v) + len(set(gf) - set(gb))
    if [key(c) for c in B] != [key(c) for c in F]:
        res["keyMismatches"] += 1
    idx = collections.Counter()
    for a, c in zip(B, F):
        i = idx[a["battle"]]; idx[a["battle"]] += 1
        res["moveRecords"] += 1
        res["frameChanges"] += a["frames"] != c["frames"]
        res["liveFrameChanges"] += a["liveFrames"] != c["liveFrames"]
        res["declineChanges"] += a.get("decline") != c.get("decline")
        if a["status"] != c["status"] or a["liveFrames"] != c["liveFrames"] or a.get("decline") != c.get("decline"):
            res["statusChanges"].append({"battle": a["battle"], "record": i, "move": a.get("move"), "moveId": a.get("moveId"), "side": a["side"],
                                         "attacker": a["attacker"], "target": a["target"], "status": [a["status"], c["status"]],
                                         "liveFrames": [a["liveFrames"], c["liveFrames"]], "frames": a["frames"],
                                         "decline": [a.get("decline"), c.get("decline")]})
    for t, cs in (("base", B), ("final", F)):
        for c in cs:
            if c["kind"] == "move":
                tot[f"{t}.live"] += c["status"] == "live"; tot[f"{t}.commands"] += 1
                tot[f"{t}.liveFrames"] += c["liveFrames"]; tot[f"{t}.frames"] += c["frames"]
    for t, s in (("base", sb), ("final", sf)):
        for r in s:
            if r["kind"] == "battle":
                tot[f"{t}.battleFrames"] += r["frames"]
            if r["kind"] == "anim" and r.get("presented"):
                tot[f"{t}.statusAnimationCommands"] += 1
res["totals"] = dict(tot)
res["allShardDigestsSame"] = {d: all(v[d] for v in res["shards"].values()) for d in ("battleDigestExcludingFrames", "battleDigest", "battleFrames", "commandDigest")}
res["verdict"] = {"zeroFrameChanges": res["frameChanges"] == 0 and res["battleMismatches"] == 0 and res["segmentMismatches"] == 0
                  and res["keyMismatches"] == 0 and res["allShardDigestsSame"]["battleDigestExcludingFrames"]}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps({k: res[k] for k in ("moveRecords", "keyMismatches", "frameChanges", "liveFrameChanges", "declineChanges", "battleMismatches",
                                      "segmentMismatches", "allShardDigestsSame", "verdict", "totals")}))
print("status changes:", len(res["statusChanges"]))
for c in res["statusChanges"][:40]:
    print(" ", json.dumps(c))
