#!/usr/bin/env python3
"""ont193 dense Scene ON window receipts (docs/ont193-scene-on-tails.md): ROM per-frame screen sha (tmr136Probe.py, direct mGBA, Scene ON, the
off108 lab scenarios) vs production per-row render sha (ont193RouteWindow.ts: renderBattleResolutionLiveView, base and final tree, the
ordinary census battle of the same move) across body end -> script tail -> the next command's first screen change.

usage: ont193DenseWindows.py <work-dir> <out.json>      <work-dir>: <scenario>/p.json (ROM probes) and prod-<key>-{base,final}.json
Row coordinate c: ROM frame f is c = f - G (G = off108 receipts' used-print last glyph frame), production row r is c = r (btl188Rows.ts).
Per window: the last screen change inside the body, the first screen change after it, the number of byte-identical frames/rows between
(the tail is a held screen: zero px between), and the ROM's btl188 release/next-wait row for reference."""
import json, sys

work, out = sys.argv[1:3]
rom_r1 = json.load(open("tools/integration/fixtures/off108/receipts/rom-r1.json"))["scenarios"]
CASES = [("bulk", "bulk-up-ply-primeape-onix", "Bulk Up"), ("protect", "protect-ply-primeape-onix", "Protect"),
         ("detect", "detect-ply-primeape-onix", "Detect"), ("sand", "sand-attack-ply-primeape-snorlax", "Sand-Attack")]


def changes(shas):
    return [i for i in range(1, len(shas)) if shas[i] != shas[i - 1]]


START = {"bulk": 1, "protect": 1, "detect": 1, "sand": 3}  # production body start row in c (btl188Rows.ts; the used-print length differs per move)
res = {"schema": "ont193-dense-windows/v1", "windows": []}
for key, name, label in CASES:
    use = rom_r1["off108-" + name]["on"][0]
    off = use["G"]
    d = json.load(open(f"{work}/{name}/p.json"))
    sha = {f["frame"]: f["sha256"] for f in d["frames"]}
    chf = sorted(x for x in sha if x - 1 in sha and sha[x] != sha[x - 1])
    stat_run = [r for r in use["runs"] if r[2] > 2 and r[6] > 0][1 if key != "dt" else 2]  # the controller wait after the body wait run (btl188Rows.ts)
    nx = off + stat_run[5][0]  # that wait run's first screen change, c = f - G
    assert nx in chf, (name, nx)
    lb = max(x for x in chf if x < nx)
    rom = {"offset": off, "nextChangeC": nx - off, "lastBodyChangeC": lb - off, "heldRows": nx - lb,
           "heldByteIdentical": len({sha[f] for f in range(lb, nx) if f in sha}) == 1,
           "sha": {str(f - off): sha[f][:8] for f in range(lb - 3, nx + 3) if f in sha}}
    w = {"move": label, "rom": rom, "production": {}}
    for tree in ("base", "final"):
        r = json.load(open(f"{work}/prod-{key}-{tree}.json"))
        nbody = r["targetRows"]
        shas = [x["sha"] for x in r["render"]]
        c0 = START[key]
        chg = [i for i in range(1, len(shas)) if shas[i] != shas[i - 1]]
        inbody = [i for i in chg if i < nbody]
        nxt_i = min(i for i in chg if i >= nbody)
        last_i = max(inbody)
        w["production"][tree] = {"bodyRows": nbody, "bodyStartC": c0, "bodyEndC": c0 + nbody - 1, "lastBodyChangeC": c0 + last_i, "nextChangeC": c0 + nxt_i,
                                 "heldRows": nxt_i - last_i, "heldByteIdentical": len(set(shas[last_i:nxt_i])) == 1,
                                 "nextChangeVsRom": c0 + nxt_i - rom["nextChangeC"], "lastBodyChangeVsRom": c0 + last_i - rom["lastBodyChangeC"],
                                 "sha": {str(c0 + i): shas[i][:8] for i in range(last_i - 3, nxt_i + 3)}}
    res["windows"].append(w)
json.dump(res, open(out, "w"), indent=1)
print("move | ROM body c..c / last body change / next change / held | tree: body end / last change(resid) / next change(resid) / held / byte-identical")
for w in res["windows"]:
    r = w["rom"]
    print(f'{w["move"]}: ROM last body change c{r["lastBodyChangeC"]}, next change c{r["nextChangeC"]}, held {r["heldRows"]} (identical {r["heldByteIdentical"]})')
    for t in ("base", "final"):
        q = w["production"][t]
        print(f'   {t:5} body c{q["bodyStartC"]}..c{q["bodyEndC"]} last c{q["lastBodyChangeC"]} ({q["lastBodyChangeVsRom"]:+d}) next c{q["nextChangeC"]} ({q["nextChangeVsRom"]:+d}) held {q["heldRows"]} identical {q["heldByteIdentical"]}')
