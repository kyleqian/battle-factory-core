#!/usr/bin/env python3
"""prep34: Memento attacker-init BLDCNT write row (row 7 same-row vs row 8, a CPU phase) is display-neutral in the ROM itself:
consecutive raw RGB frames of rows 5..10 are pixel-identical in every window whichever phase it shows.
usage: prep34Row7Neutral.py <probe dir> <receipt.json>"""
import json, sys
from pathlib import Path

out = {"schema": "prep34-memento-row7-neutral/v1", "windows": []}
for path in sorted(Path(sys.argv[1]).glob("*memento*-r1.json")):
    if path.name.startswith("history-"):
        continue
    d = json.loads(path.read_text()); frames = d["frames"]; rgb = path.with_name(path.stem + "-rgb")
    raw = lambda f: (rgb / f"{f:05d}.rgb").read_bytes()
    pairs = []
    for i in range(5, 10):
        a, b = raw(frames[i]["frame"]), raw(frames[i + 1]["frame"])
        pairs.append({"rows": [i, i + 1], "px": sum(1 for p in range(0, len(a), 3) if a[p:p + 3] != b[p:p + 3])})
    out["windows"].append({"probe": path.name, "bldcntRow7": frames[7]["registers"]["bldcnt"], "bldcntRow8": frames[8]["registers"]["bldcnt"],
                           "phase": "same-row" if frames[7]["registers"]["bldcnt"] != 0x3F40 else "next-row", "consecutiveFramePx": pairs})
Path(sys.argv[2]).write_text(json.dumps(out, indent=1) + "\n")
print(f"wrote {sys.argv[2]}: {len(out['windows'])} windows")
