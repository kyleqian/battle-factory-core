#!/usr/bin/env python3
"""stp128: convert the STP128_DUMP window npz files (scratch) into raw RGB888 stacks for stp128Compare.ts:
<out-dir>/<window key>.rgb = rows rel -2, -1, 0, ... E + 3 (240x160x3 each); <window key> = <scenario stem>#<k> as rom-windows.json.
usage: stp128NpzToRaw.py <npz-dir> <rom-windows.json> <out-dir>
"""
import json, os, sys
import numpy as np

npz_dir, rom, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
for key, w in json.load(open(rom))["windows"].items():
    z = np.load(os.path.join(npz_dir, f"{w['scenario'][:-5]}-{w['rise']}.npz"))
    frames = [z[f"arr_{i}"] for i in range(len(z.files))]
    assert len(frames) == len(w["rows"]), (key, len(frames), len(w["rows"]))
    open(os.path.join(out, f"{key}.rgb"), "wb").write(b"".join(f.astype(np.uint8).tobytes() for f in frames))
print("windows", len(json.load(open(rom))["windows"]))
