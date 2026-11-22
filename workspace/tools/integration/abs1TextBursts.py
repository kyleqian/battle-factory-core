#!/usr/bin/env python3
"""abs1: first / last glyph frame of every text burst, ROM vs engine, from a compare run directory.

usage: abs1TextBursts.py RUNDIR [--rows Y0:Y1] [--gap N]
A burst is a run of frames whose text-box rows differ from the previous captured frame,
split where more than --gap unchanged frames follow. Prints oracle and app bursts side by side.
"""
import sys, glob, re, os
from PIL import Image, ImageChops

def load(rundir, prefix, y0, y1):
    frames = {}
    for p in sorted(glob.glob(os.path.join(rundir, f"{prefix}-*.png"))):
        n = int(re.search(r"-(\d+)\.png$", p).group(1))
        frames[n] = Image.open(p).convert("RGB").crop((0, y0, 240, y1))
    return frames

def bursts(frames, gap):
    keys = sorted(frames)
    changed = [k for a, k in zip(keys, keys[1:]) if ImageChops.difference(frames[a], frames[k]).getbbox()]
    out = []
    for k in changed:
        if out and k - out[-1][1] <= gap:
            out[-1][1] = k
            out[-1][2] += 1
        else:
            out.append([k, k, 1])
    return out

def main():
    a = sys.argv[1:]
    rundir = a[0]
    y0, y1 = 112, 160
    gap = 6
    if "--rows" in a:
        y0, y1 = map(int, a[a.index("--rows") + 1].split(":"))
    if "--gap" in a:
        gap = int(a[a.index("--gap") + 1])
    res = {}
    for side in ("oracle", "app"):
        res[side] = bursts(load(rundir, side, y0, y1), gap)
    print("side    burst  first  last  changedFrames")
    for side in ("oracle", "app"):
        for i, (f, l, c) in enumerate(res[side]):
            print(f"{side:7s} {i:5d} {f:6d} {l:5d} {c:6d}")
    print("same_bursts", res["oracle"] == res["app"])

main()
