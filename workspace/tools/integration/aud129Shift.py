#!/usr/bin/env python3
"""aud129 (docs/aud129-live-audit-27.md s1 / s2): the ONE-FRAME-SHIFT proof of every PHASE window of aud129Phase.py. A copy of the window's
fixture whose denseWindow renders only the shifted ROM rows against production one age off (audit21Check.ts: live age = row - start + ageOffset):
  tail   ROM rows s .. last, production ages s + 1 .. (the ROM is one frame AHEAD: the optional lag absent) -
         SMOKESCREEN s = 49, CRUNCH s = 123, MEGA_PUNCH s = 141 (only a 159-row body);
  write  MEGA_PUNCH ROM row 71 vs production age 70 (the ROM's changebg BG write lands one row LATER).
0 px on these rows (with the unshifted rows already exact in aud129-phase-base.txt) = the window is exactly the other one-frame phase.
usage: aud129Shift.py <aligned-fixture-dir> <aud129-phase-base.txt> <out-tail-dir> <out-write-dir>"""
import json, sys
from pathlib import Path

src, phase, tail, write = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4])
tail.mkdir(parents=True, exist_ok=True); write.mkdir(parents=True, exist_ok=True)
TAIL = {"SMOKESCREEN": 49, "CRUNCH": 123, "MEGA_PUNCH": 141}
for line in phase.read_text().splitlines():
    p = line.split()
    if not line.startswith("pb-") or p[-1] != "PHASE":
        continue
    f = json.loads((src / f"{p[0]}.json").read_text())
    w = f["denseWindow"]
    act, end, move = w.get("bodyStartFrame", w["startFrame"]), w.get("bodyEndFrame", w["endFrame"]), p[1]
    residual = p[-2].removeprefix("residual=")
    if move != "MEGA_PUNCH" or "141" in residual:
        s = TAIL[move]
        g = dict(f, denseWindow={"startFrame": act + s, "endFrame": end, "ageOffset": s + 1, "bodyStartFrame": act, "bodyEndFrame": end})
        (tail / f"{p[0]}.json").write_text(json.dumps(g, indent=1) + "\n")
    if move == "MEGA_PUNCH" and residual.startswith("71"):
        g = dict(f, denseWindow={"startFrame": act + 71, "endFrame": act + 71, "ageOffset": 70, "bodyStartFrame": act, "bodyEndFrame": end})
        (write / f"{p[0]}.json").write_text(json.dumps(g, indent=1) + "\n")
