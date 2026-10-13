#!/usr/bin/env python3
"""gaf140: the gaf140Probe.py npz window dumps of the gated windows in gaf140Rom.py's receipt -> raw RGB888 stacks
<out-dir>/<stem>-on-<R>.rgb = rows R - 32, R - 31, ... (240x160x3 each). Scratch only (never committed).
usage: gaf140NpzToRaw.py <npz-dir> <rom.json> <out-dir>
"""
import json, os, sys
import numpy as np

npz_dir, receipt, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
names = sorted(w["dump"] for v in json.load(open(receipt)).values() for w in v["windows"] if w["gated"])
for n in names:
    z = np.load(os.path.join(npz_dir, n))
    open(os.path.join(out, n[:-4] + ".rgb"), "wb").write(b"".join(z[f"arr_{i}"].astype(np.uint8).tobytes() for i in range(len(z.files))))
print(len(names), "windows")
