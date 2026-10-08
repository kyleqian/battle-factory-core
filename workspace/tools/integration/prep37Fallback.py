#!/usr/bin/env python3
"""prep37 item 3(c): pixel cost of a STATIC fallback for each status window around the subbed battler (ROM frames only).

usage: prep37Fallback.py <field.json> <out.json> <probe.json:rgb-dir>...
For every body / own-swap-to-mon / own-swap-to-doll / fade / other-move window of field.json, the fallback shows the field
held at the window's pre-state (ROM frame from-1) or post-state (ROM frame to+3, after the 2-row display tail) for the
whole window (+ its 2-row tail).  Cost = pixels differing from the ROM frame inside the subbed battler's band (the 64 rows
of its doll/mon canvas, full width, rows < 112 so the text box is excluded); the HUD/text are drawn by their own
producers and are not attributed to the window.  Reported per window: rows, frames with a residual, total px (min of
the two holds).
"""
import json, sys, zlib
from pathlib import Path

field = json.loads(Path(sys.argv[1]).read_text())
out = Path(sys.argv[2])
dirs = {Path(a.split(":")[0]).name: a.split(":")[1] for a in sys.argv[3:]}
res = []
for r in field["results"]:
    rgb_dir = Path(dirs[r["probe"]])
    load = lambda f: zlib.decompress((rgb_dir / f"{f:05d}.rgb.z").read_bytes())  # noqa: E731
    # band: union of the mon canvas (player y 87-32 / opponent 47-32) and the doll canvas (97-32 / 56-32), 64 rows each
    y0, y1 = (55, 112) if r["subbed"] == "player" else (15, 88 + 1)
    for w in r["phaseWindows"]:
        if w["value"] == "own-move":
            continue
        frames = list(range(w["from"], w["to"] + 3))
        holds = {}
        for name, ref in (("pre", w["from"] - 1), ("post", w["to"] + 3)):
            base = load(ref)
            px_total, rows_hit = 0, 0
            for f in frames:
                cur = load(f)
                px = 0
                for y in range(y0, min(y1, 112)):
                    o = y * 720
                    a, b = cur[o:o + 720], base[o:o + 720]
                    if a != b:
                        px += sum(1 for x in range(240) if a[x * 3:x * 3 + 3] != b[x * 3:x * 3 + 3])
                px_total += px
                rows_hit += px > 0
            holds[name] = {"rowsWithResidual": rows_hit, "px": px_total}
        best = min(holds, key=lambda k: holds[k]["px"])
        res.append({"probe": r["probe"], "subbed": r["subbed"], "window": w["value"], "from": w["from"], "rows": len(frames),
                    "band": [y0, min(y1, 112)], "holds": holds, "cheapest": best})
out.write_text(json.dumps({"schema": "prep37-fallback/v1", "results": res}, indent=1) + "\n")
for x in res:
    print(x["probe"][:28], x["window"], x["from"], x["rows"], "pre", x["holds"]["pre"], "post", x["holds"]["post"])
