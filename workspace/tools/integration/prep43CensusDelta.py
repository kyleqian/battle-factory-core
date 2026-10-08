#!/usr/bin/env python3
"""prep43: live-share census delta (same seeds, master src vs the temporary prep43 patch), per order-host unit.

usage: prep43CensusDelta.py <before.json> <before.jsonl> <after.json> <after.jsonl> <out.json>
The .json are liveShareCensus.ts reports, the .jsonl its --commands output. Commands are paired line by line and must be the same
(battle, kind, moveId, side, frames) sequence (the patch is presentation-only). Each command that was not live before is attributed
to its BEFORE decline detail (for the order lend: the host's invalidReason, "order host: ..."); the delta counts commands / presented
frames that became live (or partial), and any live -> non-live regression.
"""
import json, sys
from collections import defaultdict


def load(path):
    return [json.loads(line) for line in open(path) if line.strip()]


def detail(c):
    d = c.get("decline")
    if d is None:
        return None
    return d.get("detail") or f'{d["stage"]}: {d["reason"]}'


bj, bl, aj, al, out = sys.argv[1:6]
before, after = load(bl), load(al)
assert len(before) == len(after), (len(before), len(after))
ident = lambda c: (c["battle"], c["kind"], c.get("moveId"), c["side"], c["frames"])
mismatched = sum(ident(b) != ident(a) for b, a in zip(before, after))
units = defaultdict(lambda: {"commands": 0, "frames": 0, "liveAfterCommands": 0, "liveAfterFrames": 0, "stillFallbackAfter": defaultdict(int)})
regressions = []
for b, a in zip(before, after):
    if b["status"] == "live":
        if a["status"] != "live":
            regressions.append({"before": b, "after": a})
        continue
    u = units[detail(b) or b["status"]]
    u["commands"] += 1
    u["frames"] += b["frames"] - b["liveFrames"]
    gained = a["liveFrames"] - b["liveFrames"]
    if gained > 0:
        u["liveAfterCommands"] += 1
        u["liveAfterFrames"] += gained
    if a["status"] != "live":
        u["stillFallbackAfter"][detail(a) or a["status"]] += 1
rb, ra = json.load(open(bj)), json.load(open(aj))


def headline(r):
    s = r["summary"] if "summary" in r else r
    return s


rows = sorted(units.items(), key=lambda kv: -kv[1]["liveAfterFrames"])
total_frames = sum(c["frames"] for c in before)
result = {
    "schema": "prep43-census-delta/v1", "commands": len(before), "presentedFrames": total_frames, "pairingMismatches": mismatched,
    "liveFramesBefore": sum(c["liveFrames"] for c in before), "liveFramesAfter": sum(c["liveFrames"] for c in after),
    "liveCountBefore": sum(c["status"] == "live" for c in before), "liveCountAfter": sum(c["status"] == "live" for c in after),
    "regressions": regressions[:20], "regressionCount": len(regressions),
    "units": [{"beforeDetail": k, **{x: v[x] for x in ("commands", "frames", "liveAfterCommands", "liveAfterFrames")},
               "stillFallbackAfterTop": sorted(v["stillFallbackAfter"].items(), key=lambda kv: -kv[1])[:3]} for k, v in rows],
}
for key in ("liveFramesBefore", "liveFramesAfter"):
    result[key.replace("Frames", "FramePct")] = round(100 * result[key] / total_frames, 2)
for key in ("liveCountBefore", "liveCountAfter"):
    result[key.replace("Count", "CountPct")] = round(100 * result[key] / len(before), 2)
open(out, "w").write(json.dumps(result, indent=1) + "\n")
print(f'commands {len(before)} (pairing mismatches {mismatched}, regressions {len(regressions)}); live by count {result["liveCountPctBefore"] if "liveCountPctBefore" in result else ""}')
print(f'live count {result["liveCountBefore"]} -> {result["liveCountAfter"]} ({result["liveCountPctBefore"]} % -> {result["liveCountPctAfter"]} %), '
      f'live frames {result["liveFramesBefore"]} -> {result["liveFramesAfter"]} ({result["liveFramePctBefore"]} % -> {result["liveFramePctAfter"]} %)')
for r in result["units"][:16]:
    print(f'  {r["liveAfterFrames"]:>7} frames / {r["liveAfterCommands"]:>4} cmds live of {r["frames"]:>7} / {r["commands"]:>4}  {r["beforeDetail"]}  | still: {r["stillFallbackAfterTop"][:2]}')
