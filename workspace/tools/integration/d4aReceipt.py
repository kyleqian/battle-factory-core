#!/usr/bin/env python3
"""Assemble tools/integration/fixtures/d4a-live-receipt.json from d4aTimingCheck.ts outputs (tested commit / src tree, commands, phase table,
per-window residuals). usage: d4aReceipt.py [--out=RECEIPT.json] [--schema=NAME] CHECK.json...   (default tools/integration/fixtures/d4a-live-receipt.json)"""
import json, subprocess, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]
git = lambda *a: subprocess.check_output(["git", *a], cwd=R, text=True).strip()
opts = {a.split("=", 1)[0]: a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--")}
OUT = R / opts.get("--out", "tools/integration/fixtures/d4a-live-receipt.json")
windows = [w for p in sys.argv[1:] if not p.startswith("--") for w in json.loads(Path(p).read_text())]
status = json.loads((R / "docs/animation-integration-live-status.json").read_text())
phase = [{"id": e["id"], "move": e["move"], **{k: e["timingParameters"][0][k] for k in ("kind", "age", "fixedLagAges", "iterations", "alternatives", "chosen", "tieRuleUsed")},
          **({"timingParameters": e["timingParameters"]} if len(e["timingParameters"]) > 1 else {}),
          "alternatePhaseResidual": e["alternatePhaseResidual"]} for e in status["faithfulTimingAdapters"]]
moves = sorted({w["move"] for w in windows})
summary = {m: {"windows": sum(w["move"] == m for w in windows),
               "selectedPhaseWindows": sum(w["move"] == m and w["selectedPhase"] for w in windows),
               "selectedPhaseResidualPixels": sum(r["residualPixels"] for w in windows if w["move"] == m and w["selectedPhase"] for r in w["runs"]),
               "otherPhaseWindows": sum(w["move"] == m and not w["selectedPhase"] for w in windows),
               "otherPhaseAffectedAges": sorted({a for w in windows if w["move"] == m and not w["selectedPhase"] for a in w["runs"][0]["affectedAges"]}),
               "otherPhaseMaxPixelsPerRow": max([w["runs"][0]["maxPixelsPerRow"] for w in windows if w["move"] == m and not w["selectedPhase"]] or [0]),
               "freshRunsIdentical": all(len({r["digest"] for r in w["runs"]}) == 1 for w in windows if w["move"] == m),
               "violations": sum(len(w["violations"]) for w in windows if w["move"] == m)} for m in moves}
out = {"schema": opts.get("--schema", "d4a-live-receipt/v1"), "testedCommit": git("rev-parse", "HEAD"), "testedSrcTree": git("rev-parse", "HEAD:workspace/src"),
       "dirty": bool(git("status", "--porcelain", "--", "src", "tools/integration/fixtures/d4a-live")),
       "policyVersion": status["faithfulTimingClaim"]["policyVersion"],
       "commands": ["python3 tools/integration/d4aScenarios.py", "sh tools/integration/prep22Probes.sh PROBEDIR 1 <accepted + prep25 alternate + d4a extra scenarios>",
                    "python3 tools/integration/d4aFixtures.py PROBEDIR", "node --experimental-strip-types --no-warnings tools/integration/d4aTimingCheck.ts CHECK.json tools/integration/fixtures/d4a-live/<move>-*.json",
                    "python3 tools/integration/d4aReceipt.py CHECK.json..."],
       "phaseTable": phase, "summary": summary, "windows": windows}
OUT.write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps(summary, indent=1))
