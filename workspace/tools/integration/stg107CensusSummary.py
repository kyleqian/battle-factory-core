#!/usr/bin/env python3
"""stg107: census receipt (docs/stg107-struggle.md s3.5) from two hist73Merge.py outputs (base, patched): overall shares, the Struggle 165
bucket (commands, live, frames, live frames, decline reasons) per arm, and every non-Struggle status change on the aligned per-battle
command prefixes (budget-cut stalled tails are compared by land82CensusCheck.py). usage: stg107CensusSummary.py <base-dir> <patched-dir> <out.json>"""
import collections, json, sys
from pathlib import Path


def load(d: str):
    return json.loads(Path(d, "merged.json").read_text()), [json.loads(l) for l in Path(d, "merged.jsonl").read_text().splitlines()]


def reason(r):
    d = r["decline"]
    return (d.get("reason") or json.dumps(d, sort_keys=True)) if isinstance(d, dict) else d


out = {}
arms = {"base": load(sys.argv[1]), "patched": load(sys.argv[2])}
for name, (merged, rows) in arms.items():
    s = [r for r in rows if r.get("moveId") == 165]
    out[name] = {"overall": merged["overall"], "commandKeyDigest": merged.get("commandKeyDigest"), "struggle": {
        "commands": len(s), "live": sum(r["status"] == "live" for r in s), "frames": sum(r["frames"] for r in s),
        "liveFrames": sum(r["liveFrames"] for r in s),
        "byReason": dict(sorted(collections.Counter(str(reason(r)) for r in s if r["status"] != "live").items()))}}
by = {k: collections.defaultdict(list) for k in arms}
for k, (_, rows) in arms.items():
    for r in rows:
        by[k][r["battle"]].append(r)
flips = collections.Counter()
for battle, base_rows in by["base"].items():
    for x, y in zip(base_rows, by["patched"].get(battle, [])):
        if x.get("moveId") != 165 and x["status"] != y["status"]:
            flips[f"{x.get('move')}:{x['status']}->{y['status']}"] += 1
out["nonStruggleStatusChanges"] = dict(flips)
Path(sys.argv[3]).write_text(json.dumps(out, indent=1, sort_keys=True) + "\n")
print(json.dumps({k: out[k]["struggle"] for k in arms}), "non-Struggle changes", sum(flips.values()))
