#!/usr/bin/env python3
"""aud110: ALIGNED copies of the audit20 window fixtures for Taunt 269, Harden 106 and Swagger 207 (audit21Align.py's method; those two moves are
not in its table). Production's accepted body starts N rows after the ROM activation (land97 LIVE_MOVE_IDLE_LEAD_ROWS: Taunt 10, Harden 1, Swagger 7;
liveMoveAnimationDuration: Taunt 125 rows, Harden 101 rows, Swagger 161 rows): window = activation + N .. + D - 1, ageOffset 0, the probe body kept in
bodyStartFrame / bodyEndFrame (audit21Check.ts names the body by them). Every other fixture is copied unchanged.
usage: aud110Align.py <fixture-dir> <out-dir>"""
import json, sys
from pathlib import Path

src, out = Path(sys.argv[1]), Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
ACCEPTED = {"TAUNT": (10, 125), "HARDEN": (1, 101), "SWAGGER": (7, 161)}
for p in sorted(src.glob("*.json")):
    f = json.loads(p.read_text())
    if f["move"] in ACCEPTED:
        lead, rows = ACCEPTED[f["move"]]
        w = f["denseWindow"]
        start = w["startFrame"] + lead
        f["denseWindow"] = {"startFrame": start, "endFrame": min(start + rows - 1, w["endFrame"]), "ageOffset": 0,
                            "bodyStartFrame": w["startFrame"], "bodyEndFrame": w["endFrame"]}
    (out / p.name).write_text(json.dumps(f, indent=1) + "\n")
