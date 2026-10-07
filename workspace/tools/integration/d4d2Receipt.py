#!/usr/bin/env python3
"""S10A d4d2 receipt: merge per-fixture d4aTimingCheck.ts outputs (one OUT.json per fixture, each a list) into
tools/integration/fixtures/d4d2-live-receipt.json windows[], with the tested commit / src tree and the summary per move.
usage: d4d2Receipt.py OUTDIR [extra.json]   (extra = a JSON object merged at top level: gates, commands, notes)"""
import json, subprocess, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
D = Path(sys.argv[1])
windows = []
for f in sorted(D.glob("*.json")):
    windows += json.loads(f.read_text())
windows.sort(key=lambda w: w["fixture"])
git = lambda *a: subprocess.run(["git", *a], cwd=R, capture_output=True, text=True).stdout.strip()
summary = {}
for w in windows:
    s = summary.setdefault(w["move"], {"windows": 0, "rows": 0, "selected": 0, "selectedPx": 0, "otherPhase": 0, "violations": 0})
    s["windows"] += 1; s["rows"] += w["window"]; s["violations"] += len(w["violations"])
    if w["selectedPhase"]: s["selected"] += 1; s["selectedPx"] += sum(r["residualPixels"] for r in w["runs"])
    else: s["otherPhase"] += 1
out = {"schema": "d4d2-live-receipt/v1", "testedCommit": git("rev-parse", "HEAD"), "testedSrcTree": git("rev-parse", "HEAD:workspace/src"),
       "dirty": bool(git("status", "--porcelain", "--", "src")), "policyVersion": "live-move-timing.v1.dominant-measured-phase.tie-no-optional-event",
       "summary": summary, "windows": windows}
if len(sys.argv) > 2: out.update(json.loads(Path(sys.argv[2]).read_text()))
(R / "tools/integration/fixtures/d4d2-live-receipt.json").write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps(summary))
