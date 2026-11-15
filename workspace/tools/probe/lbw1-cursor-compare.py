#!/usr/bin/env python3
"""lbw1: ROM gRngValue vs engine rngValue at Lobby entry / spawn / lock / release and the first divergence, per trace.
usage: python3 tools/probe/lbw1-cursor-compare.py TRACE_NAME...   (reads .integration/evidence/lbw1/{rom,app}-NAME.json)"""
import json, sys
from pathlib import Path
D = Path(".integration/evidence/lbw1")
for name in sys.argv[1:]:
    rom = json.loads((D / f"rom-{name}.json").read_text())["rows"]; app = json.loads((D / f"app-{name}.json").read_text())["rows"]
    R = {r["f"]: r for r in rom}; A = {r["f"]: r for r in app}
    lob = [r for r in rom if "ev" in r]
    entry = lob[0]["f"]
    ovw = next(r["f"] for r in lob if r["cb2"] == 0x8085E5D)
    npc = lambda r, g: next((e for e in r["ev"] if e["gfx"] == g and not e["player"]), None)
    spawn = next(r["f"] for r in lob if npc(r, 16) and npc(r, 17))
    fz = []; pf = None
    for r in lob:
        w = npc(r, 16)
        if w:
            if pf is not None and w["frozen"] != pf: fz.append((r["f"], w["frozen"]))
            pf = w["frozen"]
    lock = next(f for f, v in fz if v == 1)
    rel = [f for f, v in fz if v == 0]
    freeOn = next((r["f"] for r in app if r["free"]), None)
    out = {"trace": name, "romLobbyMapFirstFrame": entry, "romFirstOverworldCb2": ovw, "romSpawn": spawn, "romLock": lock, "romScriptRelease": rel[-1],
           "appFreeRoamFirstFrame": freeOn}
    for label, f in (("entry", entry), ("overworld", ovw), ("spawn", spawn), ("lock", lock), ("release", rel[-1])):
        out[label] = {"f": f, "rom": R[f]["rng"], "app": A[f]["rng"], "eq": R[f]["rng"] == A[f]["rng"]}
    # first divergence in the whole trace and after Lobby map first row
    first = next((f for f in sorted(R) if R[f]["rng"] != A[f]["rng"]), None)
    out["firstCursorDivergenceFrame"] = first
    # does a constant per-frame offset exist? (app cursor equals ROM cursor shifted by k frames of vblank draws)
    def lcg(v, n):
        for _ in range(n): v = (1103515245 * v + 24691) & 0xFFFFFFFF
        return v
    shifts = []
    for f in (entry, spawn, lock, rel[-1]):
        a = A[f]["rng"]
        found = None
        for k in range(0, 3000):
            if lcg(R[f]["rng"], k) == a: found = k; break
        if found is None:
            for k in range(0, 3000):
                if lcg(a, k) == R[f]["rng"]: found = -k; break
        shifts.append((f, found))
    out["appAheadOfRomByDraws(f,k)"] = shifts
    out["appModeAtEntry"] = {k: A[entry][k] for k in ("mode", "free", "att", "keep")}
    print(json.dumps(out))
