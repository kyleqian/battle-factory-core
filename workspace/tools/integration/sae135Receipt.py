#!/usr/bin/env python3
"""sae135 (docs/sae135-status-animation-render-3.md): the live receipt from a sae135Run.sh run dir.
usage: sae135Receipt.py <run-dir> <out.json> [--census]   (without --census the census section is the committed census-delta.json)"""
import json, os, sys

run, out = sys.argv[1], sys.argv[2]
census = len(sys.argv) > 3 and sys.argv[3] == "--census"
FX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures/sae135")
load = lambda p: json.load(open(p))
main = load(f"{run}/cmp/r1.json")
wins = {k: v for k, v in main.items() if k != "summary"}
per = {}
for k, v in wins.items():
    key = f"{v['animation']}/{v['side']}"
    p = per.setdefault(key, {"windows": 0, "rows": 0, "commandRowsPx": 0, "nextRowsPx": 0, "zeroPxWindows": 0})
    p["windows"] += 1
    p["rows"] += v["rows"]["compared"]
    last = v["rows"]["last"] - 1  # minimumFrames
    p["commandRowsPx"] += sum(m[1] for m in v["perRowMismatches"] if m[0] < last)
    p["nextRowsPx"] += sum(m[1] - m[2] for m in v["perRowMismatches"] if m[0] >= last)
    p["zeroPxWindows"] += v["zeroPx"]
residual = {k: {"rows": [m[0] for m in v["perRowMismatches"]], "px": [m[1] for m in v["perRowMismatches"]], "romOpponentX2": v["romOpponentX2"]}
            for k, v in wins.items() if not v["zeroPx"]}
ctl = lambda n: load(f"{run}/cmp/{n}.json")["summary"]
nb = load(f"{run}/next-body.json")["summary"]
routes = load(f"{run}/routes-delta.json")
cd = load(f"{run}/census-delta.json") if census else load(f"{FX}/census-delta.json")
receipt = {
    "schema": "sae135-live-receipt/v1",
    "productionCompare": {"windows": main["summary"]["windows"], "zeroPxWindowsAllRows": main["summary"]["zeroPxWindows"],
                          "commandRowsZeroPxWindows": sum(1 for v in wins.values() if all(m[0] >= v["rows"]["last"] - 1 for m in v["perRowMismatches"])),
                          "perRowDigest": main["summary"]["perRowDigest"], "perAnimationSide": per,
                          "nextCommandRowResidual": residual},
    "diagOrdinaryRest": ctl("diag-ordinary-rest"),
    "redrawHarness": ctl("neg-redraw"),
    "controls": {n: {"zeroPxWindows": ctl(f"neg-{n}")["zeroPxWindows"], "windows": ctl(f"neg-{n}")["windows"]} for n in ("age+1", "wrong-side", "drop-one", "rest-y")},
    "nextBodyX2": nb,
    "routes": {k: {"ok": v["ok"], "differing": v["differing"], "frames": v["frames"]} for k, v in routes.items() if k != "allOk"} | {"allOk": routes["allOk"]},
    "census": {k: cd[k] for k in ("moveRecords", "keyMismatches", "frameChanges", "statusChanges", "liveFrameChanges", "declineChanges",
                                  "battleMismatches", "segmentMismatches", "allShardDigestsSame", "totals")},
}
json.dump(receipt, open(out, "w"), indent=1)
open(out, "a").write("\n")
print(json.dumps(receipt["productionCompare"]["perAnimationSide"]))
