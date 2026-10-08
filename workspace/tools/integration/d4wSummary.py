#!/usr/bin/env python3
"""d4w (S10A): fold two fresh d4aTimingCheck.ts passes (one JSON per fixture, d4wDense.sh) into a section of the d4w live receipt.
usage: d4wSummary.py <pass1Dir> <pass2Dir> <receipt.json> <section> [<fixture glob prefix>]
Each pass = 2 fresh probe processes per window; the section records per window the measured / policy phase, rows, px of all four
renders, affected ages and max px per row, and fails (exit 1) on any violation or any digest difference between the passes."""
import json, sys
from pathlib import Path

p1, p2, rec, section = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4]
prefix = sys.argv[5] if len(sys.argv) > 5 else ""
windows, bad = [], []
for f in sorted(p2.glob(f"{prefix}*.json")):
    a, b = json.loads((p1 / f.name).read_text())[0], json.loads(f.read_text())[0]
    runs = a["runs"] + b["runs"]
    ages = runs[0]["affectedAges"]
    w = {"fixture": a["fixture"], "move": a["move"], "measuredPhase": a["measuredPhase"], "policyPhase": a["policyPhase"],
         "selectedPhase": a["selectedPhase"], "rows": a["window"], "duration": a["expectedDuration"],
         "px": [r["residualPixels"] for r in runs], "affectedAges": f"{ages[0]}..{ages[-1]} ({len(ages)})" if ages else "-",
         "maxPixelsPerRow": runs[0]["maxPixelsPerRow"], "digestsIdentical": len({r["digest"] for r in runs}) == 1,
         "violations": a["violations"] + b["violations"]}
    if w["violations"] or not w["digestsIdentical"]: bad.append(f.name)
    windows.append(w)
receipt = json.loads(rec.read_text()) if rec.exists() else {"schema": "d4w-live-receipt/v1", "sections": {}}
sel = [w for w in windows if w["selectedPhase"]]
receipt["sections"][section] = {
    "method": "tools/integration/d4wDense.sh (one tools/integration/d4aTimingCheck.ts process per fixture = 2 fresh direct-mGBA probe processes "
              "through the production live renderer), run twice from fresh processes (4 renders per window)",
    "windows": len(windows), "policyPhaseWindows": len(sel), "policyPhaseZeroPx": sum(1 for w in sel if not any(w["px"])),
    "otherPhaseWindows": len(windows) - len(sel), "ok": not bad, "failures": bad, "table": windows}
rec.write_text(json.dumps(receipt, indent=1) + "\n")
print(section, len(windows), "windows", len(sel), "policy-phase", receipt["sections"][section]["policyPhaseZeroPx"], "at 0 px; ok", not bad)
sys.exit(1 if bad else 0)
