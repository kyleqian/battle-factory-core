#!/usr/bin/env python3
"""lbw1: per-trace facts from the ROM probe JSON (entry / spawn / lock / release frames, player tile, rng, draw accounting)."""
import json, sys
from pathlib import Path
CB2 = 0x8085E5D
for p in sys.argv[1:]:
    d = json.loads(Path(p).read_text()); rows = d["rows"]; by = {r["f"]: r for r in rows}
    lob = [r for r in rows if "ev" in r]
    first = lob[0]["f"]
    ovw = next(r["f"] for r in lob if r["cb2"] == CB2)
    def npc(r, g):
        return next((e for e in r["ev"] if e["gfx"] == g and not e["player"]), None)
    spawn = next(r["f"] for r in lob if npc(r, 16) and npc(r, 17))
    last = lob[-1]["f"]
    # frozen transitions of the woman
    tr = []
    pf = None
    for r in lob:
        w = npc(r, 16)
        if not w: continue
        fz = w["frozen"]
        if pf is not None and fz != pf: tr.append((r["f"], fz))
        pf = fz
    ply = lambda r: next(e for e in r["ev"] if e["player"])
    rel = [f for f, fz in tr if fz == 0]
    out = {"trace": d["trace"], "lobbyFirstRow": first, "firstOverworldCb2": ovw, "spawn": spawn, "last": last,
           "frozenTransitions": tr, "amb": sorted({r["amb"] for r in lob})}
    out["rngAtSpawn"] = by[spawn]["rng"]
    out["rngAtOverworld"] = by[ovw]["rng"]
    out["cntAtSpawn"] = by[spawn]["cnt"]
    for f in rel:
        r = by[f]; pl = ply(r); w = npc(r, 16); fm = npc(r, 17)
        out.setdefault("release", []).append({"f": f, "rng": r["rng"], "player": pl["cur"], "playerFace": pl["face"],
            "woman": {k: w[k] for k in ("cur", "prv", "face", "mdir")} | {"ty": w["data"][1], "dl": w["data"][3], "act": w["act"]},
            "fat": {k: fm[k] for k in ("cur", "prv", "face", "mdir")} | {"ty": fm["data"][1], "dl": fm["data"][3], "act": fm["act"]},
            "framesAfter": last - f})
    out["lastRng"] = by[last]["rng"]
    # draw accounting: frames since spawn vs cnt delta
    out["drawsSinceSpawn"] = by[last]["cnt"] - by[spawn]["cnt"]; out["framesSinceSpawn"] = last - spawn
    print(json.dumps(out))
