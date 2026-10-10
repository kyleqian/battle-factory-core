#!/usr/bin/env python3
"""st76: windows summary of the statused Dive / Meteor Mash live windows (docs/st76-status-gates.md).
Reads the scratch outputs of: liveAdapterFramebuffer.ts per fixture (LIVE/<tag>.json, two fresh direct-mGBA runs each), issue151Counters.sh
(COUNTERS/<tag>.run{0,1}.json lag ages), st76Check.ts (CHECK, JSON lines: production lend == ROM sSpriteOrder), the unstatused / statused
seed sweeps (SWEEP dirs of prep22Probe outputs) and the lag-row windows (LAG/*.out).
usage: st76Receipt.py SCRATCH OUT.json"""
import filecmp, glob, json, sys
from pathlib import Path
S, OUT = Path(sys.argv[1]), Path(sys.argv[2])
FX = Path("tools/integration/fixtures/st76")
check = {}
for line in (S / "check.jsonl").read_text().splitlines():
    d = json.loads(line); check[Path(d["fixture"]).stem] = d
def lag_ages(counters, tag, fx):
    runs = [json.loads((counters / f"{tag}.run{r}.json").read_text()) for r in (0, 1)]
    c = runs[0]["cols"].index("playTimeVBlanks"); rows = runs[0]["rows"]
    a, b = fx["denseWindow"]["startFrame"], fx["denseWindow"]["endFrame"]
    return [i - a for i in range(a, b + 2) if rows[i][c] == rows[i - 1][c]], runs[0]["rows"] == runs[1]["rows"]
windows = []
for f in sorted(FX.glob("*.json")):
    tag = f.stem
    fx = json.loads(f.read_text())
    runs = json.loads((S / "live" / f"{tag}.json").read_text())
    lags, lag_same = lag_ages(S / "counters", tag, fx)
    body = "Meteor Mash 309" if fx["move"] == "METEOR_MASH" else f"Dive 291 {'attack' if fx['requestFields']['turn'] else 'setup'}"
    statused = {s: v for s, v in fx["displayedStatus"].items() if v != "none"}
    windows.append({"window": tag, "body": body, "attackerSide": fx["attacker"]["geometry"]["side"],
                    "attacker": fx["attacker"]["species"], "target": fx["target"]["species"],
                    "status": statused, "statusOn": "attacker" if fx["attacker"]["geometry"]["side"] in statused else "target",
                    "romFrames": [fx["denseWindow"]["startFrame"], fx["denseWindow"]["endFrame"]], "rows": runs[0]["rows"],
                    "exactRows": [r["exactRows"] for r in runs], "px": [r["residualPixels"] for r in runs],
                    "digest": runs[0]["digest"][:12], "r1EqualsR2": runs[0]["digest"] == runs[1]["digest"],
                    "residualAges": sorted({m["age"] for m in runs[0]["firstMismatches"]}) if runs[0]["residualPixels"] else [],
                    "productionDuration": runs[0]["expectedDuration"], "lagAges": lags, "lagRunsIdentical": lag_same,
                    "lendEqualsRom": check[tag]["lendEqualsRom"], "liveAges": check[tag]["liveAges"]})
def sweep(*patterns):
    out = {}
    for p1 in sorted(f for pattern in patterns for f in glob.glob(pattern)):
        p = json.loads(Path(p1).read_text())
        same = filecmp.cmp(p1, p1.replace("-r1.json", "-r2.json"), shallow=False)
        dives = [b for b in p["bodies"] if b["move"] == 291]
        if len(dives) < 2:
            continue
        a = dives[1]; att = a["atActivation"]["attacker"]; st1 = a["atActivation"]["mons"][att]["status1"]
        route = Path(p1).name.rsplit("-s", 1)[0]
        key = f"{route} attacker {'statused' if st1 else 'unstatused'} attack rows {a['end'] - a['start'] + 1}"
        out.setdefault(key, {"count": 0, "r1EqualsR2": 0, "seeds": []})
        out[key]["count"] += 1; out[key]["r1EqualsR2"] += same; out[key]["seeds"].append(Path(p1).name.replace("-r1.json", ""))
    return out
lagrows = {}
for f in sorted(glob.glob(str(S / "lagfx" / "*.out"))):
    r = json.loads(Path(f).read_text())
    lagrows[Path(f).name.replace(".json.out", "")] = {"rows": r[0]["rows"], "exactRows": [x["exactRows"] for x in r], "px": [x["residualPixels"] for x in r],
                                                      "r1EqualsR2": r[0]["digest"] == r[1]["digest"]}
receipt = {"schema": "st76-windows/v1", "windows": windows,
           "totals": {"windows": len(windows), "rows": sum(w["rows"] for w in windows),
                      "zeroPxWindows": sum(1 for w in windows if w["px"] == [0, 0]), "r1EqualsR2": sum(w["r1EqualsR2"] for w in windows)},
           "attackRowSweep": sweep(str(S / "sweep" / "*-r1.json"), str(S / "control" / "*-r1.json")),
           "lagRowWindows": lagrows}
OUT.write_text(json.dumps(receipt, indent=1) + "\n")
print(json.dumps(receipt["totals"]))
for w in windows:
    print(w["window"], w["status"], w["rows"], w["px"], w["r1EqualsR2"], w["lagAges"], w["residualAges"][:3], w["lendEqualsRom"])
for k, v in sorted(receipt["attackRowSweep"].items()):
    print(k, v["count"], v["r1EqualsR2"])
print(lagrows)
