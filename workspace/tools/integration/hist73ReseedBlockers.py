#!/usr/bin/env python3
"""hist73: why the post-KO / forced send-out did not reseed the allocator host, for every allocator decline whose chain holds a
switch-in unit (hist73AllocatorCensus.ts records allocatorLastFailedReseed: the order host's invalidReason at the failed reseed).

usage: hist73ReseedBlockers.py <chains.jsonl> <out.json>
Groups by the order host's invalidReason (lastUnit dropped); `ice72` marks the reasons Ice Ball 301 clears (a words unit landing
in a sibling worker: treated as cleared).
"""
import json, re, sys
from collections import defaultdict

rows = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
fb = lambda c: c["frames"] - c["liveFrames"]
units = {"command switch-in", "forced switch-in (allocator not reseedable)"}
groups = defaultdict(lambda: {"commands": 0, "frames": 0, "battles": set()})
for c in rows:
    if c.get("allocatorChain") is None or not units & set(c["allocatorChain"]):
        continue
    k = re.sub(r"lastUnit=\S+ ", "", c.get("allocatorLastFailedReseed") or "none")
    g = groups[k]; g["commands"] += 1; g["frames"] += fb(c); g["battles"].add(c["battle"])
out = [{"reseed": k, "orderInvalidReason": (re.search(r"order=(.*)$", k) or [None, None])[1], "commands": v["commands"],
        "frames": v["frames"], "battles": sorted(v["battles"]), "clearedByIce72": "body 301" in k}
       for k, v in sorted(groups.items(), key=lambda kv: (-kv[1]["frames"], kv[0]))]
open(sys.argv[2], "w").write(json.dumps({"schema": "hist73-reseed-blockers/v1", "groups": out,
    "commands": sum(g["commands"] for g in out), "frames": sum(g["frames"] for g in out)}, indent=1) + "\n")
for g in out:
    print(f'{g["frames"]:>6} / {g["commands"]:>3}  {g["reseed"]}')
