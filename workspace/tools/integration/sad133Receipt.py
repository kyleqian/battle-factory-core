#!/usr/bin/env python3
"""sad133: the live receipt tools/integration/fixtures/sad133-live-receipt.json from a sad133Run.sh run dir.
usage: sad133Receipt.py <run-dir> <out.json>
<run-dir>: probes-r1-r2.txt (stp128 jobs r1 == r2 line), rom-windows.json, cmp/{r1,r2}.json, controls.json, sar131-cmp.json,
routes-delta.json, x2.json, [census-delta.json]. Every verdict is a boolean; the numbers are the evidence.
"""
import json, os, sys

d, out = sys.argv[1:3]
J = lambda p: json.load(open(os.path.join(d, p)))
F = "tools/integration/fixtures"
cmp1, cmp2 = J("cmp/r1.json"), J("cmp/r2.json")
controls = J("controls.json")
sar = J("sar131-cmp.json")
routes = J("routes-delta.json")
x2 = J("x2.json")
s = cmp1["summary"]
residual = {k: v["perRowMismatches"] for k, v in cmp1.items() if k != "summary" and not v["zeroPx"]}
expect_fail = {"age+1": None, "wrong-side": None, "no-shake": ("CURSED", "NIGHTMARE"), "no-ghost": ("CURSED", "NIGHTMARE"),
               "no-ducks": ("CONFUSION",), "no-cube": ("FRZ",), "lag-swap": ("FRZ",)}
wins = {k: v["animation"] for k, v in cmp1.items() if k != "summary"}
ctl_ok = {n: controls[n]["failingCommandRowWindows"] == sorted(k for k, a in wins.items() if fam is None or a in fam) for n, fam in expect_fail.items()}
r = {
    "schema": "sad133-live-receipt/v1",
    "rom": {"probes": open(os.path.join(d, "probes-r1-r2.txt")).read().strip(), "windows": s["windows"],
            "romWindowsEqualsStp128Committed": open(os.path.join(d, "rom-windows.json"), "rb").read() == open(f"{F}/stp128/rom-windows.json", "rb").read()},
    "productionCompare": {"summary": s, "r1EqualsR2": cmp1 == cmp2,
                          "ageOffset": "status-animation command age a == stp128 reducer rel a == ROM row rel a (rel 0 = the gAnimScriptActive rise)",
                          "residualWindows": residual},
    "controls": {n: {k: controls[n][k] for k in ("zeroPxCommandRowWindows", "zeroPxWindows", "windows")} for n in controls},
    "sar131PsnPrz": sar["summary"],
    "x2": x2["summary"],
    "routes": {k: {kk: v[kk] for kk in ("sameTimeline", "frames", "presented", "differing", "ok")} | {
        "statusAnimationCommands": [(c["animation"], c["side"], c["frames"], c["differingAges"]) for c in v["statusAnimationCommands"]]}
        for k, v in routes.items() if k != "allOk"},
}
v = {
    "everyCommandRowZeroPx": s["zeroPxCommandRowWindows"] == s["windows"] == 34,
    "residualOnlyOnixConfusionNextMessageRows": sorted(residual) == [f"stp128-confuse-ray-ply-primeape-onix#{i}" for i in range(3)]
        and all(m == [[100, 1091, 0], [101, 1091, 0]] for m in residual.values()),
    "comparatorR1EqualsR2": cmp1 == cmp2,
    "controlsFailWhereDrawn": all(ctl_ok.values()),
    "sar131PsnPrzStillZeroPx": sar["summary"]["zeroPxWindows"] == sar["summary"]["windows"] == 17,
    "x2TrackerMatchesRom": x2["summary"]["matches"] == x2["summary"]["windows"],
    "routesOk": routes["allOk"],
}
if os.path.exists(os.path.join(d, "census-delta.json")):
    c = J("census-delta.json")
    r["census"] = {k: c[k] for k in ("moveRecords", "keyMismatches", "frameChanges", "liveFrameChanges", "declineChanges", "battleMismatches",
                                     "segmentMismatches", "allShardDigestsSame", "totals")} | {"statusChanges": len(c["statusChanges"])}
    v["censusZeroChanges"] = c["verdict"]["zeroFrameChanges"] and not c["statusChanges"] and all(c["allShardDigestsSame"].values()) \
        and c["keyMismatches"] == c["liveFrameChanges"] == c["declineChanges"] == 0
r["verdicts"] = v
open(out, "w").write(json.dumps(r, indent=1, sort_keys=True) + "\n")
print(json.dumps(v))
