#!/usr/bin/env python3
"""prep13: compare each alternate-species body's allocator signature with the accepted scenario's (same orientation) -> fixtures/prep13/prep13-alt-compare.json.
Signature = rows, bitmap/tasks/in-use at activation, spawn list (age, slot, template, bank, tile, matrix) and task (slot, func, first age) list, order shape, battler subpriorities.
Species-dependent positions (x/y/x2/y2) are reported separately (they come from liveBattlerAnchors, not from the allocator)."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
A = json.loads((ROOT / "tools/integration/fixtures/prep13/prep13-analysis.json").read_text())
sig = lambda r: {"rows": r["rows"], "bitmap": r["bitmap"], "tasksAtAct": r["tasksAtAct"], "inUseAtAct": r["inUseAtAct"], "orderShape": r["orderShape"], "battlerSub": r["battlerSub"], "battlerSpriteIds": r["battlerSpriteIds"],
                 "spawns": [[x["age"], x["slot"], x["tmpl"], x["bank"], x["tile"], x["matrix"]] for x in r["sprites"] if x["tmpl"] != "ALLOCATE_SCRIPT_CMD_TABLE"],
                 "tasks": [[t["age"], t["slot"], t["func"]] for t in r["tasks"]], "netZero": r["netZeroAtEnd1"]}
res = {}
for sc, rows in A.items():
    if not sc.startswith("prep13-"): continue
    mv = sc.split("-alt-")[0].replace("prep13-", ""); side = sc.split("-alt-")[1].split("-")[0]
    acc = next(k for k in A if k.startswith(f"mechanic-{mv}-{side}-"))
    ra = A[acc][0]; rb = next(r for r in rows if r["move"].lower().replace("_", "-") == mv)
    sa, sb = sig(ra), sig(rb)
    diff = {k: [sa[k], sb[k]] for k in sa if sa[k] != sb[k]}
    res[sc] = {"accepted": acc, "move": mv, "side": side, "actActivation": [ra["act"], rb["act"]], "identicalSignature": not diff, "diff": diff,
               "species": [[m["species"] for m in ra["monsAtAct"]], [m["species"] for m in rb["monsAtAct"]]], "bodyCount": len(rows), "rng2AtAct": [ra["rng2"], rb["rng2"]],
               "positionsDiffer": [ra["battlerXY"], rb["battlerXY"]]}
    print(sc, "SAME" if not diff else "DIFF " + json.dumps({k: (v if k not in ("spawns", "tasks") else "...") for k, v in diff.items()})[:400], "act", res[sc]["actActivation"], "species", res[sc]["species"])
    if "spawns" in diff:
        sa_, sb_ = {tuple(x) for x in sa["spawns"]}, {tuple(x) for x in sb["spawns"]}
        print("    spawns only accepted", sorted(sa_ - sb_)[:8], "only alt", sorted(sb_ - sa_)[:8])
(ROOT / "tools/integration/fixtures/prep13/prep13-alt-compare.json").write_text(json.dumps(res, indent=1))
