#!/usr/bin/env python3
"""ordl126 (docs/ordl126-order-plans-live.md): fold the landed-tree proof into one deterministic receipt.
usage: ordl126Receipt.py <census-pair.json> <census-check.json> <ord124-check.json> <windows-landed.txt> <lends-landed.jsonl> <out.json>"""
import json, re, sys
from pathlib import Path

pair, check, units, windows, lends, out = (Path(a) for a in sys.argv[1:7])
P, C, U = (json.loads(p.read_text()) for p in (pair, check, units))
rows, total = [], None
for line in windows.read_text().splitlines():
    if line.startswith("TOTAL all"):
        total = {k: int(v) for k, v in re.findall(r"(\S+?)=(\d+)", line)}
    m = re.match(r"(\S+)\s+(\S+)\s+(\S+)\s+\S+\s+live=(\d+) rows=(\d+) exact=(\d+) px=(\d+)\s+r1==r2=(\d+)", line)
    if m:
        rows.append({"window": m[1], "move": m[2], "side": m[3], "live": int(m[4]), "rows": int(m[5]), "exact": int(m[6]), "px": int(m[7]), "r1eqr2": int(m[8])})
lend = [json.loads(l) for l in lends.read_text().splitlines() if l.strip()]
doc = {
    "schema": "ordl126-live-receipt/v1",
    "census": {k: P[k] for k in ("commands", "frames", "live", "liveFrames", "livePct", "liveFramePct", "keysIdentical", "framesIdenticalPerCommand",
                                 "battleDigestIdentical", "commandKeyDigestIdentical", "shardBattleDigestsIdentical", "otherStatusChanges", "lifted")},
    "censusCheck": {k: C[k] for k in ("pairingMismatches", "regressionCount", "liveCountBefore", "liveCountAfter", "liveFramesBefore", "liveFramesAfter")},
    "romBodies": {k: {"instances": v["instances"], "exact": v["exact"], "byLend": v["byLend"]} for k, v in sorted(U["bodies"].items())},
    "windowTotals": total,
    "windowRows": rows,
    "windowLendJobs": len(lend),
}
out.write_text(json.dumps(doc, indent=1, sort_keys=True) + "\n")
print(json.dumps({"windowTotals": total, "lifted": P["lifted"]["commands"], "livePct": P["livePct"], "liveFramePct": P["liveFramePct"]}))
