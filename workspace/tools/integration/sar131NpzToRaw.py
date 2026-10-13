#!/usr/bin/env python3
"""sar131: the STAT101_DUMP npz window dumps (gitignored scratch) of every window in sar131Rom.py's receipt (status animations and the
next live bodies) -> raw RGB888 stacks <out-dir>/<stem>-on-<R>.rgb = rows R-1, R, R+1, ... (240x160x3 each). Scratch only.
usage: sar131NpzToRaw.py <npz-dir> <rom.json> <out-dir>
"""
import json, os, sys
import numpy as np

npz_dir, receipt, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
names = set()
for v in json.load(open(receipt)).values():
    for w in v["windows"]:
        names.add(w["dump"])
        if w["nextBody"]:
            names.add(w["nextBody"]["dump"])
for n in sorted(names):
    z = np.load(os.path.join(npz_dir, n))
    frames = [z[f"arr_{i}"] for i in range(len(z.files))]
    open(os.path.join(out, n[:-4] + ".rgb"), "wb").write(b"".join(f.astype(np.uint8).tobytes() for f in frames))
print(len(names), "windows")
