#!/usr/bin/env python3
"""ISSUES #71 Slice A pixel consequence: verify the app's settled RATTATA
draw (no offset applied) is byte-exact against the oracle's settled frame,
and quantify what the hypothetical `{+1,0}` Slice-A offset would have cost.

Uses the extracted `battle-opponent-front-sprites.json` RATTATA tileset +
palette (the same asset the engine's `drawGeneratedOpponentRelease` settles
with) rendered with the engine's own `drawSpriteSheet` convention (8x8-tile
grid, index 0 = transparent, `setPixel` overwrite) at the app's generated
route origin `(144, 8 + picCoords.yOffset)` = `(144, 24)` for RATTATA.

Usage:
    python3 tools/probe/pixel-consequence-sendout-slice-a.py <settled-frame.png>
"""

from __future__ import annotations

import json
import struct
import sys
import zlib
from pathlib import Path

from PIL import Image


def load_png(path: Path) -> tuple[int, int, bytes]:
    im = Image.open(path).convert("RGB")
    return im.size[0], im.size[1], im.tobytes()


def render_sprite(tileset: dict, palette: list[dict], ox: int, oy: int) -> set[tuple[int, int, tuple[int, int, int]]]:
    """Render per the engine's drawSpriteSheet: 8x8 tiles, index 0 skipped."""
    out: dict[tuple[int, int], tuple[int, int, int]] = {}
    rows = tileset["rows"]
    cols = tileset["columns"]
    for ty in range(rows):
        for tx in range(cols):
            tile = tileset["tiles"][ty * cols + tx]
            for py in range(8):
                for px in range(8):
                    idx = tile[py * 8 + px]
                    if idx == 0:
                        continue
                    c = palette[idx]
                    out[(ox + tx * 8 + px, oy + ty * 8 + py)] = (c["r"], c["g"], c["b"])
    return set((x, y, c) for (x, y), c in out.items())


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit(f"usage: {sys.argv[0]} <settled-frame.png>")
    frame_path = Path(sys.argv[1])
    w, h, fb = load_png(frame_path)
    asset = json.loads(
        Path("src/assets/gen/battle-opponent-front-sprites.json").read_text()
    )
    rattata = asset["RATTATA"]
    tileset = rattata["tileset"]
    palette = rattata["palette"]

    ox, oy = 144, 8 + 16  # app origin for RATTATA (yOffset 16)

    sprite = render_sprite(tileset, palette, ox, oy)
    sprite_px = { (x, y): c for x, y, c in sprite }

    def px_at(x: int, y: int) -> tuple[int, int, int]:
        i = (y * w + x) * 3
        return fb[i], fb[i + 1], fb[i + 2]

    # ---- 1. Verify the app's settled draw (offset 0) reproduces the oracle ----
    region = [(x, y) for x in range(ox, ox + 64) for y in range(oy, oy + 64)]
    mismatches = []
    for x, y in region:
        if (x, y) in sprite_px:
            got = px_at(x, y)
            want = sprite_px[(x, y)]
            if got != want:
                mismatches.append((x, y, got, want))
    print(f"app settled draw @ ({ox},{oy}): {len(sprite)} opaque px; "
          f"{len(mismatches)} mismatch vs oracle frame within 64x64 canvas")
    for m in mismatches[:8]:
        print(f"   mismatch at {m[0]},{m[1]}: oracle {m[2]} vs sprite {m[3]}")

    # ---- 2. Literal brief computation: shift back by (-x2,-y2) = (0,0) ----
    shifted = set((x, y, c) for (x, y), c in sprite_px.items())
    diff_shift = {(x, y) for x, y, c in sprite} - {(x, y) for x, y, c in shifted}
    print(f"literal (-x2,-y2)=(0,0) shift: {len(diff_shift)} differing pixels (bbox empty)")

    # ---- 3. Hypothetical: sprite drawn at x2=+1 (old Slice-A wiring) ----
    sprite_plus = render_sprite(tileset, palette, ox + 1, oy)
    set0 = {(x, y): c for x, y, c in sprite}
    set1 = {(x, y): c for x, y, c in sprite_plus}
    all_xy = set(set0) | set(set1)
    # framebuffer-correct: at each screen pixel, oracle shows sprite@0 (already
    # baked into fb); app-hypothetical would show sprite@+1 over the same bg.
    # For overlap positions, both draw the sprite; differ iff colors differ.
    # For positions covered only by one side, the other side shows the bg which
    # we take from fb where the sprite@0 does not cover it (i.e. set1-only px).
    differing = []
    for xy in sorted(all_xy, key=lambda p: (p[1], p[0])):
        c0 = set0.get(xy)
        c1 = set1.get(xy)
        if c0 is not None and c1 is not None:
            if c0 != c1:
                differing.append(xy)
        elif c0 is not None:
            # sprite@0 covers, sprite@+1 does not -> app-hypothetical shows bg
            bg = px_at(*xy)
            if c0 != bg:
                differing.append(xy)
        else:
            # sprite@+1 covers, sprite@0 does not -> app-hypothetical shows sprite over bg
            bg = px_at(*xy)
            if c1 != bg:
                differing.append(xy)
    bbox = (min(x for x, y in differing), min(y for x, y in differing),
            max(x for x, y in differing), max(y for x, y in differing)) if differing else None
    print(f"hypothetical x2=+1 vs oracle: {len(differing)} differing pixels, "
          f"bbox (x0,y0,x1,y1)={bbox}")
    # oracle sprite bbox (its own footprint)
    oxs = [x for x, y, c in sprite]
    oys = [y for x, y, c in sprite]
    print(f"oracle RATTATA sprite footprint: {len(sprite)} px, "
          f"bbox ({min(oxs)},{min(oys)})-({max(oxs)},{max(oys)})")
    return 0


main()
