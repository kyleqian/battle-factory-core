#!/usr/bin/env python3
"""stat101: convert the STAT101_DUMP npz window dumps (gitignored scratch) of the stat-anim windows in stat-anim.json into raw RGB888
frame stacks for stat101ProtoCompare.ts: <out-dir>/<scenario>-<scene>.rgb = frames A-1, A, A+1, ... (240x160x3 each). Scratch only.
usage: stat101NpzToRaw.py <npz-dir> <stat-anim.json> <out-dir>
"""
import json, os, sys
import numpy as np

npz_dir, receipts, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
for scen, v in json.load(open(receipts)).items():
    for scene in ("on", "off"):
        for w in v[scene]["windows"]:
            z = np.load(os.path.join(npz_dir, f"{scen}-{scene}-{w['A']}.npz"))
            frames = [z[f"arr_{i}"] for i in range(len(z.files))]
            open(os.path.join(out, f"{scen}-{scene}.rgb"), "wb").write(b"".join(f.astype(np.uint8).tobytes() for f in frames))
            print(scen, scene, len(frames))
