#!/usr/bin/env python3
"""prep34: compact receipt of the gScanlineEffect history probes (r1 == r2 checked by prep34Probes.sh): per scenario the
animation edges before the selected body, the scanline state at trace frame 0 and at activation (bank run-lengths), and the
number of scanline-state changes in between.  usage: prep34HistorySummary.py <probe dir> <receipt.json>"""
import json, sys
from pathlib import Path

out = {"schema": "prep34-scanline-history-summary/v1", "scenarios": []}
for path in sorted(Path(sys.argv[1]).glob("history-*-r1.json")):
    d = json.loads(path.read_text())
    first, act = d["changes"][0], d["changes"][-1]
    state = lambda c: {k: c[k] for k in ("state", "srcBuffer", "dmaDest", "dmaControl")} | {"bankRuns": c.get("bankRuns")}
    out["scenarios"].append({"scenario": d["scenario"], "move": d["move"], "activationFrame": d["activationFrame"],
                             "animationEdges": d["animationEdges"], "frame0": state(first), "activation": state(act),
                             "scanlineChangesBetween": len(d["changes"]) - 2,
                             "activationRelativeToFirstBody": act["bankRuns"][act["srcBuffer"]] == [[0, 320]]
                             and act["bankRuns"][act["srcBuffer"] ^ 1] == [[2, 80], [-2, 80], [0, 160]]})
Path(sys.argv[2]).write_text(json.dumps(out, indent=1) + "\n")
print(f"wrote {sys.argv[2]}: {len(out['scenarios'])} scenarios")
