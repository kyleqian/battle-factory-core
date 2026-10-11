#!/usr/bin/env python3
"""Live audit 23 (docs/live-audit-23.md): audit22Align.py's ACCEPTED-window copies of audit20Fixtures.py window fixtures (the production
adapter's accepted framing, not the ROM activation .. first inactive row the probe body gives), plus tonight's folds:
  GRASS_WHISTLE 320  225 rows from the activation (liveMoveAnimation.ts `case 320: return GRASS_WHISTLE_WINDOW_FRAMES`, ctl95: the 220-row
                     script + the elevated-opponent shadow return rows 221..224, LIVE_MOVE_OPPONENT_SHADOW_RETURN_ROWS[320] = 4), ageOffset 0;
  RECOVER 105        the first orb = activation + 10, 169 rows (ctl95 section 1: `case 105: return 169`, ctl95ControlCheck --shift=10);
  DOUBLE_TEAM 104    ageOffset -1 over the body (dt60 / audit 22);
  EMBER / FLAMETHROWER / SCARY_FACE: audit21Align.py's windows.
IRON_TAIL 231 (135 rows), FURY_CUTTER 210 (43 rows) and MEMENTO 262 (the reducer length, the first inactive row included: scan93) ARE the
probe body window (activation .. first inactive row) and are copied unchanged. The probe body is kept in bodyStartFrame / bodyEndFrame
(audit22Check.ts / audit23Check.ts match the body by them).
usage: audit23Align.py <fixture-dir> <out-dir> [--moves=A,B,...]   (--moves: write only those moves' windows: the claims; Splash 150 has
       no live adapter and liveView refuses it)
"""
import json, sys
from pathlib import Path

src, out = Path(sys.argv[1]), Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
only = next((a.split("=", 1)[1].split(",") for a in sys.argv[3:] if a.startswith("--moves=")), None)
AGE_ONLY = {"DOUBLE_TEAM": -1}
# move: (lead rows after the activation, window rows, ageOffset, may extend past the body's first inactive row)
ACCEPTED = {"EMBER": (4, 63, 0, False), "FLAMETHROWER": (4, 126, -11, False), "SCARY_FACE": (4, 190, 0, False),
            "GRASS_WHISTLE": (0, 225, 0, True), "RECOVER": (10, 169, 0, False)}
for p in sorted(src.glob("*.json")):
    f = json.loads(p.read_text())
    if only is not None and f["move"] not in only:
        continue
    w = f["denseWindow"]
    if f["move"] in AGE_ONLY:
        f["denseWindow"] = {**w, "ageOffset": AGE_ONLY[f["move"]]}
    elif f["move"] in ACCEPTED:
        lead, rows, age, past = ACCEPTED[f["move"]]
        start = w["startFrame"] + lead
        end = start + rows - 1 if past else min(start + rows - 1, w["endFrame"])
        f["denseWindow"] = {"startFrame": start, "endFrame": end, "ageOffset": age, "bodyStartFrame": w["startFrame"], "bodyEndFrame": w["endFrame"]}
    (out / p.name).write_text(json.dumps(f, indent=1) + "\n")
