#!/usr/bin/env python3
"""Live audit 22 (docs/live-audit-22.md): ALIGNED copies of audit20Fixtures.py window fixtures whose production adapter's accepted framing
is not "age 0 = the ROM activation" (the probe's body start, gAnimScriptActive's rising edge). audit20Fixtures.py writes no ageOffset, so
its windows render these moves one framing off; ret88's Double Team "residual" is this.
  DOUBLE_TEAM 104  ageOffset -1 over the same body window: production age 0 = ROM activation + 1 (dt60Fixtures.py AGE_OFFSET {104: -1},
                   "the accepted prep7 framing; the ONIX route is 0 px only there"; dt60's 34 / 36 0 px windows use it);
  EMBER / FLAMETHROWER / SCARY_FACE: audit21Align.py's accepted windows (activation + 4; 63 / 126 rows, ageOffset 0 / -11 / 0), the probe
                   body kept in bodyStartFrame / bodyEndFrame (audit22Check.ts matches the body by them).
Every other fixture is copied unchanged.
usage: audit22Align.py <fixture-dir> <out-dir> [scenario-name ...]   (names: only those scenarios' fixtures)
"""
import json, sys
from pathlib import Path

src, out = Path(sys.argv[1]), Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
AGE_ONLY = {"DOUBLE_TEAM": -1}
ACCEPTED = {"EMBER": (4, 63, 0), "FLAMETHROWER": (4, 126, -11), "SCARY_FACE": (4, 190, 0)}
only = sys.argv[3:]
for p in sorted(src.glob("*.json")):
    if only and p.name.rsplit("-c", 1)[0] not in only:
        continue
    f = json.loads(p.read_text())
    w = f["denseWindow"]
    if f["move"] in AGE_ONLY:
        f["denseWindow"] = {**w, "ageOffset": AGE_ONLY[f["move"]]}
    elif f["move"] in ACCEPTED:
        lead, rows, age = ACCEPTED[f["move"]]
        start = w["startFrame"] + lead
        f["denseWindow"] = {"startFrame": start, "endFrame": min(start + rows - 1, w["endFrame"]), "ageOffset": age,
                            "bodyStartFrame": w["startFrame"], "bodyEndFrame": w["endFrame"]}
    (out / p.name).write_text(json.dumps(f, indent=1) + "\n")
