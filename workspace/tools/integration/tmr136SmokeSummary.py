#!/usr/bin/env python3
"""tmr136 (B): per Smokescreen window of a tmr136SmokeCheck.ts run (stf115Check.sh STF115_CHECK=tmr136SmokeCheck), the production
host's use ordinal, production's duration, the ROM body rows (fixture denseWindow), px / residual rows (chain lend), r1 == r2, and the
verdict: OK (0 px), PHASE (the other one-frame phase: the ROM body's row count is not the duration and every residual row is >= 49) or
OTHER. usage: tmr136SmokeSummary.py <check-dir> <fixture-dir> <out.json>"""
import json
import re
import sys
from pathlib import Path

check, fx, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
windows = []
for p in sorted(check.glob("check-*.json")):
    for r in json.loads(p.read_text())["rows"]:
        if r["move"] != "SMOKESCREEN":
            continue
        c = r["chain"]
        dw = json.loads((fx / Path(r["fixture"]).name).read_text())["denseWindow"]
        rom_body = dw.get("bodyEndFrame", dw["endFrame"]) - dw.get("bodyStartFrame", dw["startFrame"]) + 1
        residual = [a for a, _ in c["residualRows"]]
        if c["px"] == 0:
            verdict = "OK"
        elif c["duration"] != rom_body and min(residual) >= 49:
            verdict = "PHASE"
        else:
            verdict = "OTHER"
        windows.append({"fixture": Path(r["fixture"]).name, "side": r["side"], "species": r["species"], "moveUse": c["moveUse"],
                        "use": None if c["moveUse"] is None else ("use1" if c["moveUse"] == 1 else "use2+"), "duration": c["duration"],
                        "romBodyRows": rom_body, "rows": c["rows"], "px": c["px"], "residualFirst": min(residual) if residual else None,
                        "same": c["digests"][0] == c["digests"][1], "live": c["live"], "verdict": verdict})
tally = {}
for w in windows:
    k = f"{w['verdict']} {w['use']} rom{w['romBodyRows']} dur{w['duration']}"
    tally[k] = tally.get(k, 0) + 1
summary = {"schema": "tmr136-smoke/v1", "windows": len(windows), "rOneEqualsTwo": sum(w["same"] for w in windows),
           "inPhaseZeroPx": sum(1 for w in windows if w["duration"] == w["romBodyRows"] and w["px"] == 0),
           "inPhase": sum(1 for w in windows if w["duration"] == w["romBodyRows"]), "tally": dict(sorted(tally.items())), "rows": windows}
out.write_text(json.dumps(summary, indent=1) + "\n")
print(json.dumps({k: v for k, v in summary.items() if k != "rows"}))
