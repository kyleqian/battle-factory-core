#!/usr/bin/env python3
"""Frame catcher: a contact sheet of recorded frames (needs a run compared with --keep-stores, or not compared yet).

  python3 tools/frame-catcher/peek.py RUNDIR OUT.png engine:F1,F2,... [rom:F1,F2,...]   (F may be A-B/STEP)
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from compare import Side, W, H  # noqa: E402


def frames(spec):
    out = []
    for part in spec.split(","):
        if "-" in part:
            a, rest = part.split("-")
            b, step = (rest.split("/") + ["1"])[:2]
            out += list(range(int(a), int(b) + 1, int(step)))
        else:
            out.append(int(part))
    return out


def main():
    run, outp = Path(sys.argv[1]), sys.argv[2]
    rows = []
    for spec in sys.argv[3:]:
        side, fs = spec.split(":")
        s = Side(run / ("engine" if side == "engine" else "rom"))
        rows.append([(f"{side} {f}", s.rgb(int(s.per[f]))) for f in frames(fs) if f < len(s.per)])
    cols = max(len(r) for r in rows)
    img = Image.new("RGB", (cols * (W + 4) + 4, len(rows) * (H + 18) + 4), (20, 20, 24))
    d = ImageDraw.Draw(img)
    for y, row in enumerate(rows):
        for x, (label, rgb) in enumerate(row):
            img.paste(Image.fromarray(rgb), (4 + x * (W + 4), 16 + y * (H + 18)))
            d.text((4 + x * (W + 4), 3 + y * (H + 18)), label, fill=(220, 220, 220))
    img.save(outp)


if __name__ == "__main__":
    main()
