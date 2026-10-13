#!/usr/bin/env python3
"""snd145 (docs/snd145-send-in-tail-live.md): which commands moved between two sar131Census.sh shard dirs (Scene ON 0..999).
Per segment record (s<k>.jsonl "keys" = type:frames:hold per command) every differing command is classified; the snd145 claim is that
only `switch-in` commands change (their species-keyed tail / the faint-replacement hold) and that segment command TYPES are identical.
usage: snd145CensusDelta.py <base-dir> <final-dir> <out.json>"""
import collections, json, sys
bdir, fdir, out = sys.argv[1:4]
lines = lambda p: [json.loads(l) for l in open(p) if l.strip()]
res = {"segments": 0, "segmentsChanged": 0, "typeSequenceChanges": 0, "changedCommandTypes": collections.Counter(),
       "switchInFrameDelta": 0, "switchInCommands": 0, "switchInChanged": 0, "nonSwitchInChanges": []}
for k in range(10):
    seg = lambda d: {(r["battle"], r["seg"]): r["keys"] for r in lines(f"{d}/s{k}.jsonl") if r["kind"] == "segment"}
    gb, gf = seg(bdir), seg(fdir)
    for s, kb in gb.items():
        res["segments"] += 1
        kf = gf.get(s)
        cb = [c.split(":") for c in kb.split(",")]
        cf = [c.split(":") for c in (kf or "").split(",")]
        res["switchInCommands"] += sum(1 for c in cb if c[0] == "switch-in")
        if kf == kb:
            continue
        res["segmentsChanged"] += 1
        if [c[0] for c in cb] != [c[0] for c in cf]:
            res["typeSequenceChanges"] += 1
            continue
        for a, b in zip(cb, cf):
            if a != b:
                res["changedCommandTypes"][a[0]] += 1
                if a[0] == "switch-in":
                    res["switchInChanged"] += 1
                    res["switchInFrameDelta"] += int(b[1]) + int(b[2] or 0) - int(a[1]) - int(a[2] or 0)
                elif len(res["nonSwitchInChanges"]) < 20:
                    res["nonSwitchInChanges"].append([s[0], s[1], a, b])
res["changedCommandTypes"] = dict(res["changedCommandTypes"])
json.dump(res, open(out, "w"), indent=1)
print(json.dumps(res))
