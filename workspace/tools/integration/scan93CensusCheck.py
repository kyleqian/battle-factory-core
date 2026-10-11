#!/usr/bin/env python3
"""scan93: census summary (base vs a temp patch) from hist73Merge.py merged reports + their jsonl and prep43CensusDelta.py's delta.

usage: scan93CensusCheck.py <base.json> <patched.json> <delta.json> <out.json>   (the .jsonl sit beside the .json)
Records live counts / frames, gains per (moveId, attacker side), live -> non-live regressions, the command KEY digest, the battle digest
and the ten shards' battleDigestExcludingFrames (must be identical: the patch is presentation-only).
"""
import json, sys
from collections import Counter
from pathlib import Path

base_p, pat_p, delta_p, out_p = map(Path, sys.argv[1:5])
base, pat, delta = (json.loads(p.read_text()) for p in (base_p, pat_p, delta_p))
load = lambda p: [json.loads(l) for l in p.with_suffix(".jsonl").read_text().splitlines() if l.strip()]
bl, pl = load(base_p), load(pat_p)
assert len(bl) == len(pl)
live = lambda c: c["liveFrames"] > 0
gains, regress = Counter(), 0
for b, p in zip(bl, pl):
    if not live(b) and live(p):
        gains[f'{p.get("moveId")}:{p["side"]}'] += 1
    if live(b) and not live(p):
        regress += 1
excl = lambda rep, d: [json.loads((d / f"r{k}.json").read_text())["battleDigestExcludingFrames"] for k in range(10)]
bx, px = excl(base, base_p.with_suffix("")), excl(pat, pat_p.with_suffix(""))
s = lambda c: (sum(1 for x in c if live(x)), sum(x["liveFrames"] for x in c), sum(x["frames"] for x in c))
out = {"schema": "scan93-census-summary/v1", "seeds": "0..999 (10 shards, --index-from)", "commands": len(bl),
       "base": dict(zip(("live", "liveFrames", "frames"), s(bl))), "patched": dict(zip(("live", "liveFrames", "frames"), s(pl))),
       "gainsByMoveSide": dict(sorted(gains.items())), "regressionsLiveToNonLive": regress,
       "commandKeyDigestEqual": base["commandKeyDigest"] == pat["commandKeyDigest"],
       "battleDigestEqual": base["battleDigest"] == pat["battleDigest"],
       "battleDigestExcludingFramesEqual": bx == px,
       "deltaPairingMismatches": delta.get("pairingMismatches", delta.get("mismatches")),
       "deltaKeys": sorted(delta.keys())}
out_p.write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps({k: v for k, v in out.items() if k != "deltaKeys"}))
