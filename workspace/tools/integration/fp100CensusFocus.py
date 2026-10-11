#!/usr/bin/env python3
"""fp100 (docs/fp100-focus-punch-d4.md): pair a base and a final liveShareCensus command stream (hist73Merge.py JSONL) command by
command and report (1) the Focus Punch 264 commands by side, status and presented length (base -> final), (2) every paired command
whose key (battle, kind, moveId, side, attacker, target) differs, and (3) every non-Focus-Punch command whose frames / status / duration
differ. The streams must have the same length (a budget-cut stall tail would break the pairing; see ctl95CensusPair.py then).
usage: fp100CensusFocus.py <base.jsonl> <final.jsonl>
"""
import collections, json, sys

base = [json.loads(l) for l in open(sys.argv[1])]
final = [json.loads(l) for l in open(sys.argv[2])]
print(f"commands {len(base)} -> {len(final)}")
assert len(base) == len(final), "stream lengths differ (stall tail?): pair with ctl95CensusPair.py"
KEY = ("battle", "kind", "moveId", "side", "attacker", "target")
key_mismatch = [i for i, (b, f) in enumerate(zip(base, final)) if tuple(b.get(k) for k in KEY) != tuple(f.get(k) for k in KEY)]
print(f"command key mismatches: {len(key_mismatch)}")
fp = collections.Counter()
other = []
reason = lambda d: None if d is None else d.get("reason", json.dumps(d, sort_keys=True)) if isinstance(d, dict) else d
for b, f in zip(base, final):
    if b.get("moveId") == 264 and b.get("kind") == "move":
        fp[(b["side"], b["status"], b["frames"], f["status"], f["frames"], reason(b.get("decline")), reason(f.get("decline")))] += 1
    elif (b["status"], b["frames"], b.get("duration")) != (f["status"], f["frames"], f.get("duration")):
        other.append((b, f))
print("Focus Punch 264 commands (side, status base -> final, frames base -> final, decline base / final): count")
for (side, sb, fb, sf, ff, db, df), n in sorted(fp.items()):
    print(f"  {side:8s} {sb} -> {sf}  {fb} -> {ff}  {db or '-'} / {df or '-'}: {n}")
print(f"other commands with a status / frames / duration change: {len(other)}")
for b, f in other[:20]:
    print("  ", json.dumps(b), "->", json.dumps(f))
