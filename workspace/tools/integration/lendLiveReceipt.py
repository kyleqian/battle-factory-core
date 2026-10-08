#!/usr/bin/env python3
"""Deferred-lend receipt: the d4aTimingCheck outputs of every lend-live fixture (tools/integration/lendIceBallWindows.sh) + the tested code identity.
usage: lendLiveReceipt.py D4A_OUT_DIR [D4A_OUT_DIR_2 [NEG_DIR]]   -> tools/integration/fixtures/lend-live-receipt.json (second dir: a second full pass,
digests compared; NEG_DIR: the POKEBENCH_LIVE_ICEBALL_CHAIN=entry-lend negative control, the words-free known-entry lend)"""
import json, subprocess, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
def load(d): return {e["fixture"]: e for p in sorted(Path(d).glob("ice-ball-*.json")) for e in json.loads(p.read_text())}
first = load(sys.argv[1]); second = load(sys.argv[2]) if len(sys.argv) > 2 else None; neg = load(sys.argv[3]) if len(sys.argv) > 3 else None
git = lambda *a: subprocess.run(["git", *a], capture_output=True, text=True, cwd=R).stdout.strip()
rec = {"schema": "lend-live-receipt/v1", "design": "docs/s10a-random2-order-lend-blocker.md design 1 (seam-resolved deferred lend)",
       "testedCommit": git("rev-parse", "HEAD"), "testedSrcTree": git("rev-parse", "HEAD:workspace/src"),
       "dirtySrc": git("status", "--porcelain", "--", "src") != "",
       "commands": ["OUT=/tmp/lend-ib sh tools/integration/lendIceBallProbes.sh", "python3 -I tools/integration/lendIceBallFixtures.py /tmp/lend-ib",
                    "OUT=/tmp/lend-d4a sh tools/integration/lendIceBallWindows.sh", "OUT=/tmp/lend-d4a2 sh tools/integration/lendIceBallWindows.sh",
                    "POKEBENCH_LIVE_ICEBALL_CHAIN=entry-lend OUT=/tmp/lend-neg sh tools/integration/lendIceBallWindows.sh",
                    "python3 -I tools/integration/lendLiveReceipt.py /tmp/lend-d4a /tmp/lend-d4a2 /tmp/lend-neg"],
       "declined": ["prep25 GLALIE -> GOLEM player bodies 4..5 (counters 3..4): after GOLEM faints and REGISTEEL is sent in (battler slot 5); the deferred lend declines after a KO / send-in (not modelled)"],
       "windows": []}
for fx, e in sorted(first.items()):
    w = {k: e[k] for k in ("fixture", "move", "measuredPhase", "policyPhase", "selectedPhase", "window", "expectedDuration", "documentedAges", "violations")}
    w["runs"] = [{k: r[k] for k in ("rows", "exactRows", "residualPixels", "digest", "affectedAges", "maxPixelsPerRow")} for r in e["runs"]]
    if second is not None:
        s = second[fx]; w["secondPass"] = {"residualPixels": [r["residualPixels"] for r in s["runs"]], "violations": s["violations"],
                                           "digestEqual": all(r["digest"] == e["runs"][0]["digest"] for r in s["runs"])}
    if neg is not None:
        n = neg[fx]["runs"][0]; w["negativeEntryLend"] = {"residualPixels": n["residualPixels"], "affectedAges": n["affectedAges"]}
    rec["windows"].append(w)
if neg is not None:
    rec["negativeControl"] = {"what": "POKEBENCH_LIVE_ICEBALL_CHAIN=entry-lend: the words-free known-entry lend instead of the deferred lend",
                              "windowsDiffering": sum(1 for w in rec["windows"] if w["negativeEntryLend"]["residualPixels"] != w["runs"][0]["residualPixels"])}
(R / "tools/integration/fixtures/lend-live-receipt.json").write_text(json.dumps(rec, indent=1) + "\n")
for w in rec["windows"]: print(w["fixture"].split("/")[-1], w["window"], [r["residualPixels"] for r in w["runs"]], w.get("secondPass"), w["violations"])
