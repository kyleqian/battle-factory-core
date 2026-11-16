#!/usr/bin/env python3
"""lbw5: write a compare trace = lbw4-woman-block-off's route up to frame 5254 (Lobby free roam, player idle at map (4,8) facing south) + a candidate timeline.
usage: python3 tools/probe/lbw5-make-trace.py CANDS.json NAME OUT_TRACE.json [CAPTURE_FIRST] [CAPTURE_PAD]
CANDS.json is a lbw5-sweep.py candidate list; NAME selects the candidate. Captures every frame from CAPTURE_FIRST (default 5254) to the end + PAD."""
import json, sys
from pathlib import Path

cands, name, out = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
first = int(sys.argv[4]) if len(sys.argv) > 4 else 5254
base = json.loads((Path(__file__).resolve().parent.parent / "compare" / "traces" / "lbw4-woman-block-off.json").read_text())
cand = next(c for c in json.loads(cands.read_text()) if c["name"] == name)
segs, f = [], 0
for s in base["segments"]:
    if f >= 5254:
        break
    segs.append(s)
    f += s["frames"]
assert f == 5254
segs += cand["segments"]
total = f + sum(s["frames"] for s in cand["segments"])
trace = {k: v for k, v in base.items() if k not in ("segments", "captureFrames")}
trace["segments"] = segs
trace["captureFrames"] = list(range(first, total + 1))
out.write_text(json.dumps(trace, separators=(",", ":")))
print(out, "frames", total)
