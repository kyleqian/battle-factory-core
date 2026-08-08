#!/usr/bin/env python3
"""Per-frame framebuffer change map for a dense animation probe window.

Every Scene-ON move probe writes one raw RGB888 framebuffer per captured frame
into an `--rgb-dir`. This tool diffs each frame against the previous one and
prints only the frames that actually changed, with the changed-pixel count and
bounding box. Frames that are byte-identical to their predecessor are collapsed
into `static` runs.

Why this exists: a move's RAM state and its pixels do NOT change on the same
frame. Every visible event in this engine displays exactly ONE frame after the
RAM state that causes it (OAM edits, `x2` translation and palette writes alike),
and some RAM transitions never reach pixels at all — the third metallic-shine
sweep is invisible because `ClearBattleAnimBg` has already run. A worker that
reads RAM frame numbers as displayed frame numbers cannot make the reducer fit,
and re-deriving the lag by hand costs a whole session cap (measured: one
45-minute round produced zero commits doing exactly that).

So: run this ONCE against the probe's RGB output, and the resulting table is the
displayed-timing specification for the reducer. Bank it under
`tools/compare/evidence/` next to the move's fixtures.

Usage:
    python3 tools/compare/frame-changemap.py <rgb-dir> [--width 240] [--height 160]
    python3 tools/compare/frame-changemap.py /tmp/foo/rgb-player > \
        tools/compare/evidence/<move>-changemap-player.txt

Example (MOVE_IRON_TAIL, player-back): the 135-frame window has just 9 classes of
visible event; frames 286-323 are entirely static. See
`tools/compare/evidence/iron-tail-changemap-player.txt`.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


def frame_number(path: Path) -> int:
    digits = re.findall(r"\d+", path.name)
    if not digits:
        raise SystemExit(f"cannot read a frame number from {path.name}")
    return int(digits[-1])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("rgb_dir", help="directory of <frame>.rgb raw RGB888 framebuffers")
    parser.add_argument("--width", type=int, default=240)
    parser.add_argument("--height", type=int, default=160)
    args = parser.parse_args()

    directory = Path(args.rgb_dir)
    if not directory.is_dir():
        raise SystemExit(f"not a directory: {directory}")
    frames = sorted(directory.glob("*.rgb"), key=frame_number)
    if not frames:
        raise SystemExit(f"no .rgb frames in {directory}")

    expected = args.width * args.height * 3
    print(f"# {directory} — {len(frames)} frames, {args.width}x{args.height}")
    print("# frames absent from this table are byte-identical to the previous frame")
    print("frame  changedPx  bbox(minx,miny-maxx,maxy)")

    previous: bytes | None = None
    static_from: int | None = None
    for path in frames:
        number = frame_number(path)
        current = path.read_bytes()
        if len(current) != expected:
            raise SystemExit(
                f"{path.name}: {len(current)} bytes, expected {expected}"
                f" — wrong --width/--height?"
            )
        if previous is None:
            print(f"{number}  (first frame)")
            previous = current
            continue
        if current == previous:
            if static_from is None:
                static_from = number
            continue
        if static_from is not None:
            end = number - 1
            span = f"{static_from}-{end}" if end > static_from else f"{static_from}"
            print(f"  static {span}")
            static_from = None

        count = 0
        min_x, min_y, max_x, max_y = args.width, args.height, -1, -1
        for pixel in range(args.width * args.height):
            offset = pixel * 3
            if current[offset:offset + 3] == previous[offset:offset + 3]:
                continue
            count += 1
            x = pixel % args.width
            y = pixel // args.width
            min_x = min(min_x, x)
            max_x = max(max_x, x)
            min_y = min(min_y, y)
            max_y = max(max_y, y)
        print(f"{number}  {count}  {min_x},{min_y}-{max_x},{max_y}")
        previous = current

    if static_from is not None:
        end = frame_number(frames[-1])
        span = f"{static_from}-{end}" if end > static_from else f"{static_from}"
        print(f"  static {span}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
