#!/usr/bin/env python3
"""offs152 R4 (docs/offs152-scene-off-send-in-tail.md): the Scene ON census (sar131Census.sh shards, seeds 0..999) base vs final.
R0-R3 are Scene OFF only, R6 is render-only: the claim is that every shard file is byte-identical except segment records whose only
changed commands are `switch-in` commands whose span moved by an R5 species' correction (MAGNEMITE +16, STARYU +80, LUNATONE +18,
SOLROCK +45 slide = span; METAGROSS +7, REGIROCK +15 message), the move records (r*.jsonl) and battleDigestExcludingFrames identical.
usage: offs152CensusDelta.py <base-dir> <final-dir> <out.json>   (exit 1 if the claim fails)"""
import collections, json, sys
bdir, fdir, out = sys.argv[1:4]
R5_DELTAS = {16, 80, 18, 45, 7, 15}
lines = lambda p: [json.loads(l) for l in open(p) if l.strip()]
res = {"shards": 10, "moveRecordsIdentical": True, "digestExcludingFramesIdentical": True, "segments": 0, "segmentsChanged": 0,
       "typeSequenceChanges": 0, "nonSwitchInChanges": 0, "switchInChanged": 0, "switchInDeltas": collections.Counter(),
       "frameDeltaTotal": 0}
for k in range(10):
    if open(f"{bdir}/r{k}.jsonl").read() != open(f"{fdir}/r{k}.jsonl").read():
        res["moveRecordsIdentical"] = False
    jb, jf = json.load(open(f"{bdir}/r{k}.json")), json.load(open(f"{fdir}/r{k}.json"))
    if jb["battleDigestExcludingFrames"] != jf["battleDigestExcludingFrames"]:
        res["digestExcludingFramesIdentical"] = False
    seg = lambda d: {(r["battle"], r["seg"]): r["keys"] for r in lines(f"{d}/s{k}.jsonl") if r["kind"] == "segment"}
    gb, gf = seg(bdir), seg(fdir)
    for s, kb in gb.items():
        res["segments"] += 1
        kf = gf.get(s)
        if kf == kb:
            continue
        res["segmentsChanged"] += 1
        cb = [c.split(":") for c in kb.split(",")]
        cf = [c.split(":") for c in (kf or "").split(",")]
        if [c[0] for c in cb] != [c[0] for c in cf]:
            res["typeSequenceChanges"] += 1
            continue
        for a, b in zip(cb, cf):
            if a == b:
                continue
            if a[0] != "switch-in":
                res["nonSwitchInChanges"] += 1
                continue
            d = int(b[1]) + int(b[2] or 0) - int(a[1]) - int(a[2] or 0)
            res["switchInChanged"] += 1
            res["switchInDeltas"][d] += 1
            res["frameDeltaTotal"] += d
res["switchInDeltas"] = dict(sorted(res["switchInDeltas"].items()))
ok = (res["moveRecordsIdentical"] and res["digestExcludingFramesIdentical"] and res["typeSequenceChanges"] == 0
      and res["nonSwitchInChanges"] == 0 and set(res["switchInDeltas"]) <= R5_DELTAS)
res["claimHolds"] = ok
json.dump(res, open(out, "w"), indent=1); open(out, "a").write("\n")
print(json.dumps(res))
sys.exit(0 if ok else 1)
