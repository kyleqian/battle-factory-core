#!/usr/bin/env python3
"""prep9: do the ROM's faded BG/OBJ palette rows follow BlendPalette(unfaded@activation, color, y(age - lag)) with the PRODUCTION reducer schedule (prep9-blend-schedule.json)?
Per scenario/bank/lag in {0,1}: number of body ages whose faded-bank hash == the expected blend hash; also which banks change at all during the body (faded) and whether unfaded banks stay at their activation value.
usage (workspace root): python3 tools/integration/prep9PaletteBlendCheck.py [run=r1] > tools/integration/fixtures/prep9-blend-check.json"""
import json, glob, hashlib, sys
from pathlib import Path
RUN = sys.argv[1] if len(sys.argv) > 1 else "r1"
FX = Path("tools/integration/fixtures"); sched = json.load(open(FX / "prep9-blend-schedule.json"))
H = lambda w: hashlib.md5(bytes(x & 255 for x in w) + bytes(x >> 8 for x in w)).hexdigest()[:10]
def blend(row, color, y):
    cr, cg, cb = color & 31, (color >> 5) & 31, (color >> 10) & 31; out = []
    for c in row:
        r, g, b = c & 31, (c >> 5) & 31, (c >> 10) & 31
        out.append((r + (((cr - r) * y) >> 4)) | ((g + (((cg - g) * y) >> 4)) << 5) | ((b + (((cb - b) * y) >> 4)) << 10))
    return out
out = {"run": RUN, "scenarios": {}}
for f in sorted(glob.glob(str(FX / f"prep9-probes/{RUN}/*.json"))):
    d = json.load(open(f)); n = Path(f).stem
    if d["activation"] is None or str(d["move"]) not in ("71", "72", "202", "241"): continue
    a0, mv = d["activation"], d["move"]; act = d["snapshots"]["act"]; S = d["series"]; ys = sched[str(mv)]
    color = 0x7FFF if mv == 241 else 0x33ED
    banks = {"BG1": 1, "BG2": 2, "BG3": 3, "BG4": 4} | ({"OBJ0": 16, "OBJ1": 17} if mv == 241 else {})
    r = {"move": mv, "changedFadedBanks": [], "unfadedBanksChangedDuringBody": []}
    for b in range(32):
        hs = {S[str(a0 + a)]["faded"][b] for a in range(0, d["end"] - a0)}; us = {S[str(a0 + a)]["unfaded"][b] for a in range(0, d["end"] - a0)}
        nm = f"BG{b}" if b < 16 else f"OBJ{b - 16}"
        if len(hs) > 1: r["changedFadedBanks"].append(nm)
        if len(us) > 1: r["unfadedBanksChangedDuringBody"].append(nm)
    for nm, b in banks.items():
        row = act["unfaded"][b * 16:b * 16 + 16] if b < 16 else act["unfaded"][256 + (b - 16) * 16:256 + (b - 15) * 16]
        res = {}
        for lag in (0, 1, 2, 10):
            ok = bad = 0; firstbad = None
            for a in range(0, d["end"] - a0):
                y = ys[a - lag] if 0 <= a - lag < len(ys) else 0
                exp = H(blend(row, color, y)); got = S[str(a0 + a)]["faded"][b]
                if exp == got: ok += 1
                else:
                    bad += 1; firstbad = a if firstbad is None else firstbad
            res[f"lag{lag}"] = {"match": ok, "mismatch": bad, "firstMismatchAge": firstbad}
        r[nm] = res
    out["scenarios"][n] = r
print(json.dumps(out, indent=1))
