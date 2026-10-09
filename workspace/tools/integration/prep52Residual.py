#!/usr/bin/env python3
"""prep52: the allocator residual after the prep52 patch, attributed to the switch-in reseed that failed before each decline
(docs/next-adapters-prep52.md "Residual").

usage: prep52Residual.py <after-reseed-detail.jsonl> <out.json>
Input: prep52AllocatorCensus.ts --reseed-detail --commands output with prep52-temp-src.diff applied. Each "sprite allocator history
unknown" decline carries allocatorLastFailedReseed: the last switch-in command / forced switch-in whose reseed left the allocator
host unknown (liveSpriteOrderHost.ts reseedLiveSpriteAllocatorAfterSendOut declined: order host invalid, or roles not
isomorphic). Groups the declines by that record's order-host state (allocator before -> after dropped) and by chain.
"""
import json, re, sys
from collections import defaultdict

src, out = sys.argv[1], sys.argv[2]
rows = [c for c in (json.loads(l) for l in open(src) if l.strip()) if c.get("allocatorChain") is not None]
fb = lambda c: c["frames"] - c["liveFrames"]
by_reason, by_chain = defaultdict(lambda: [0, 0, set()]), defaultdict(lambda: [0, 0])
for c in rows:
    r = c.get("allocatorLastFailedReseed")
    key = "none recorded" if r is None else re.sub(r"allocator \S+ -> \S+; ", "", r)
    by_reason[key][0] += 1; by_reason[key][1] += fb(c); by_reason[key][2].add(f'{c["move"]}/{c["side"]}')
    ch = " + ".join(sorted(set(c["allocatorChain"])))
    by_chain[ch][0] += 1; by_chain[ch][1] += fb(c)
doc = {"schema": "prep52-allocator-residual/v1", "declines": len(rows), "fallbackFrames": sum(fb(c) for c in rows),
       "byLastFailedReseed": sorted(({"reseed": k, "commands": v[0], "frames": v[1], "bodies": sorted(v[2])} for k, v in by_reason.items()),
                                    key=lambda r: (-r["frames"], r["reseed"])),
       "byChain": sorted(({"chain": k, "commands": v[0], "frames": v[1]} for k, v in by_chain.items()), key=lambda r: (-r["frames"], r["chain"]))}
open(out, "w").write(json.dumps(doc, indent=1) + "\n")
print(f'{doc["declines"]} declines / {doc["fallbackFrames"]} frames')
for r in doc["byLastFailedReseed"]:
    print(f'  {r["frames"]:>5} / {r["commands"]:>2}  {r["reseed"]}  {r["bodies"]}')
for r in doc["byChain"]:
    print(f'  chain {r["frames"]:>5} / {r["commands"]:>2}  {r["chain"]}')
