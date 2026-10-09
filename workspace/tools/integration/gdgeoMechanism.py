#!/usr/bin/env python3
"""gdgeo mechanism receipt: for every body-202 (Giga Drain) / body-72 (Mega Drain) destroy window that frees two or more slots at once, the SortSprites keys of the
destroyed sprites at the last frame they were live (spriteOrderEventProbe.py keeps keys on the frame before a mask change:
[oam.priority, subpriority, oam.y, affineMode, size, shape, invisible]) and their order in sSpriteOrder before / after the destroy.

usage (from workspace/): gdgeoMechanism.py <raw-dir> <out.json> [job ...]   (pure python3; reads <raw-dir>/<job>-A.json)
"""
import json, sys
from pathlib import Path


def groups(path):
    rows = json.loads(Path(path).read_text())["rows"]
    out, last_keys, prev = [], None, None
    for row in rows:
        n, _, order_hex, mask_hex, act, mv = row[:6]
        keys = row[6] if len(row) > 6 else None
        mask = int(mask_hex, 16)
        order = list(bytes.fromhex(order_hex))
        if prev is not None and act and mv in (202, 72):
            gone = [s for s in range(64) if prev["mask"] >> s & 1 and not mask >> s & 1]
            if len(gone) >= 2 and prev["keys"] is not None:
                before = [s for s in prev["order"] if s in gone]
                after = [s for s in order if s in gone]
                out.append({"frame": n, "slots": gone, "orderBefore": before, "orderAfter": after,
                            "keys": {str(s): prev["keys"][str(s)] for s in gone}})
        prev = {"mask": mask, "order": order, "keys": keys if keys is not None else None}
    return out


if __name__ == "__main__":
    raw, dest = Path(sys.argv[1]), Path(sys.argv[2])
    jobs = sys.argv[3:] or sorted({p.name[:-7] for p in raw.glob("*-A.json")})
    result = {}
    for job in jobs:
        gs = groups(raw / f"{job}-A.json")
        for g in gs:
            ks = [g["keys"][str(s)] for s in g["orderBefore"]]
            g["samePriorityWord"] = len({(k[0], k[1]) for k in ks}) == 1
            ys = [k[2] for k in ks]
            g["yDescendingOrEqual"] = all(a >= b for a, b in zip(ys, ys[1:]))
            g["orderKept"] = g["orderBefore"] == g["orderAfter"]
        result[job] = gs
    Path(dest).write_text(json.dumps({"schema": "gdgeo-mechanism/v1", "jobs": result}, indent=1, sort_keys=True) + "\n")
    bad = [(j, g["frame"]) for j, gs in result.items() for g in gs if not (g["samePriorityWord"] and g["yDescendingOrEqual"] and g["orderKept"])]
    print(len(result), "jobs;", sum(len(g) for g in result.values()), "multi-destroy windows; violations:", bad or "none")
