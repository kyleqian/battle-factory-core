#!/usr/bin/env python3
"""inv142: gaf140Probe.py npz window dumps of the INVISIBLE windows (with a gAnimScriptActive rise) in inv142Rom.py's receipt -> raw
RGB888 stacks <out-dir>/<name>-<R>.rgb = rows R - 32, R - 31, ... (240x160x3 each). Scratch only (never committed).
usage: inv142NpzToRaw.py <npz-dir> <rom.json> <out-dir>
"""
import json, os, sys
import numpy as np

npz_dir, receipt, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
names = sorted(w["dump"] for v in json.load(open(receipt)).values() for w in v if w["invisible"] and "dump" in w)
for n in names:
    z = np.load(os.path.join(npz_dir, n))
    open(os.path.join(out, n[:-4] + ".rgb"), "wb").write(b"".join(z[f"arr_{i}"].astype(np.uint8).tobytes() for i in range(len(z.files))))
print(len(names), "windows")
