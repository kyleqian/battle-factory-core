#!/usr/bin/env python3
"""aud129 (docs/aud129-live-audit-27.md): ALIGNED copies of window fixtures whose production accepted window does not start at the ROM
activation and is not in audit21Align.py / aud110Align.py: SPARK 209 = activation + 9 .. + 115 rows, ageOffset 0 (liveMoveAnimation.ts
`case 209: return 115`, "Spark 79..193 / 83..197 (activation + 9, row -9 ...)"; spark62). Run AFTER aud110Align.py (Harden / Taunt);
every other fixture is copied unchanged; the probe body stays in bodyStartFrame / bodyEndFrame (audit21Check.ts names the body by them).
usage: aud129Align.py <fixture-dir> <out-dir>"""
import json, sys
from pathlib import Path

src, out = Path(sys.argv[1]), Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
ACCEPTED = {"SPARK": (9, 115, 0)}
for p in sorted(src.glob("*.json")):
    f = json.loads(p.read_text())
    if f["move"] in ACCEPTED and "bodyStartFrame" not in f["denseWindow"]:
        lead, rows, age = ACCEPTED[f["move"]]
        w = f["denseWindow"]
        start = w["startFrame"] + lead
        f["denseWindow"] = {"startFrame": start, "endFrame": min(start + rows - 1, w["endFrame"]), "ageOffset": age,
                            "bodyStartFrame": w["startFrame"], "bodyEndFrame": w["endFrame"]}
    (out / p.name).write_text(json.dumps(f, indent=1) + "\n")
