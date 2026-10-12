#!/usr/bin/env python3
"""scf117: the live receipt (tools/integration/fixtures/scf117-live-receipt.json) from a scf117Run.sh run dir.
usage: scf117Receipt.py <run-dir> <final-commit> <out.json> [--census]
"""
import glob, json, os, subprocess, sys

run, commit, out = sys.argv[1:4]
census = len(sys.argv) > 4 and sys.argv[4] == "--census"
J = lambda p: json.load(open(os.path.join(run, p)))
src = subprocess.run(["git", "rev-parse", f"{commit}:workspace/src"], capture_output=True, text=True, check=True).stdout.strip()
cmp = J("compare.json")
x2 = {}
for f in sorted(glob.glob(os.path.join(run, "x2", "*.json"))):
    d = json.load(open(f))
    x2[os.path.basename(f)[:-5]] = {"rows": d[0]["rows"], "exactRows": [r["exactRows"] for r in d], "residualPixels": [r["residualPixels"] for r in d],
                                    "r1EqualsR2": len({r["digest"] for r in d}) == 1}
r = {
    "schema": "scf117-live-receipt/v1", "issue": "ISSUES #166 slices (e) + (f), General_StatsChange finished", "base": "681da5c10",
    "testedCodeCommit": commit, "srcTree": src,
    "rung1Alignment": J("align-summary.json"),
    "rung2ProductionCompare": {"windows": cmp["summary"]["windows"], "zeroPxWindows": cmp["summary"]["zeroPxWindows"],
                               "perRowDigest": cmp["summary"]["perRowDigest"],
                               "growlOn": {k: cmp["stat101-growl-ply-primeape-onix-on"][k] for k in ("x2History", "productionCorner", "romMaskRect", "rect", "fullScreen")}},
    "rung2DenseLiveAfterGrowl": x2,
}
if census:
    d = J("census-delta.json")
    r["censusDelta"] = {k: v for k, v in d.items() if k not in ("statusChanges", "shards")}
    r["censusStatusChanges"] = d["statusChanges"]
    for t in ("base", "final"):
        m = J(f"merged-{t}.json")
        r[f"censusMerged_{t}"] = {"battles": m["battles"], "overall": m["overall"], "battleDigest": m["battleDigest"], "commandKeyDigest": m["commandKeyDigest"]}
    r["censusStatsChangePerScene"] = J("align-census-summary.json")["perScene"]
    r["censusAlignmentNonZeroResidual"] = J("align-census-summary.json")["nonZeroResidual"]
    e = J("exposure.json")
    r["censusExposure"] = {k: e[k] for k in list(e)[:12] if not isinstance(e[k], (list,))}
json.dump(r, open(out, "w"), indent=1)
print(f"scf117Receipt: {out}")
