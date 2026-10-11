#!/usr/bin/env python3
"""Live audit 21: ALIGNED copies of the window fixtures whose production adapter's accepted window does not start at the ROM activation
(the probe's body start, gAnimScriptActive's rising edge). The accepted windows (tools/integration/fixtures/):
  EMBER 52         altspecies9-ember-*: acceptedActivation / altActivation + 4 = window start, ageOffset 0, 63 rows (liveMoveAnimation.ts
                   `case 52: return 63`);
  FLAMETHROWER 53  altspecies9-flamethrower-*: activation + 4 = window start, ageOffset -11 (11 negative-age rows), 126 rows (duration 115);
  SCARY_FACE 184   next-scary-face-*: draft.activationFrame + 4 = window start (shadowRow -4), ageOffset 0, 190 rows.
Every other fixture is copied unchanged. The aligned denseWindow keeps the probe body in bodyStartFrame / bodyEndFrame (audit21Check.ts).
usage: audit21Align.py <fixture-dir> <out-dir> [scenario-name ...]   (names: only those scenarios' fixtures)
"""
import json, sys
from pathlib import Path

src, out = Path(sys.argv[1]), Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
ACCEPTED = {"EMBER": (4, 63, 0), "FLAMETHROWER": (4, 126, -11), "SCARY_FACE": (4, 190, 0)}
only = sys.argv[3:]
for p in sorted(src.glob("*.json")):
    if only and p.name.rsplit("-c", 1)[0] not in only:
        continue
    f = json.loads(p.read_text())
    if f["move"] in ACCEPTED:
        lead, rows, age = ACCEPTED[f["move"]]
        w = f["denseWindow"]
        start = w["startFrame"] + lead
        f["denseWindow"] = {"startFrame": start, "endFrame": min(start + rows - 1, w["endFrame"]), "ageOffset": age,
                            "bodyStartFrame": w["startFrame"], "bodyEndFrame": w["endFrame"]}
    (out / p.name).write_text(json.dumps(f, indent=1) + "\n")
