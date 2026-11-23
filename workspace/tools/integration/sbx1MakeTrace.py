#!/usr/bin/env python3
"""sbx1: wrap a battle lab (tools/battle-lab/NAME.json) as a compare trace with a dense capture window.
usage: sbx1MakeTrace.py NAME START END OUT.json   (END - START + 1 <= 256)"""
import json, sys, pathlib
name, start, end, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), pathlib.Path(sys.argv[4])
lab_path = pathlib.Path(__file__).resolve().parents[1] / "battle-lab" / f"{name}.json"
lab = json.load(open(lab_path))
scene = "on" if name.endswith("-on") else "off"
trace = {
    "appRoute": "generated-orchestrator",
    "oracleProfile": f"battle-scene-{scene}",
    "appStage": {"id": "lab", "frame": 0},
    "oracleBattleLab": {"scenario": str(lab_path)},
    "segments": lab["trace"]["segments"],
    "captureWindow": {"start": start, "end": end},
}
out.write_text(json.dumps(trace))
