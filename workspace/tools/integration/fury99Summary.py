#!/usr/bin/env python3
"""fury99: summarize a fury99Probes.sh output dir: r1 == r2 per scenario, every body (label, attacker, RAM furyCutterCounter, rows), and
for each Fury Cutter body the rows whose hardware palette (RAM) differs from the activation row, per bank.

usage: fury99Summary.py <probe-dir> [<out.json>]
"""
import json, sys
from pathlib import Path

d = Path(sys.argv[1])
out = {"schema": "fury99-summary/v1", "scenarios": []}
for p1 in sorted((d / "r1").glob("*.json")):
    p2 = d / "r2" / p1.name
    a, b = p1.read_bytes(), p2.read_bytes() if p2.exists() else b""
    j = json.loads(a)
    frames = {f["frame"]: f for f in j["frames"]}
    bodies = []
    for body in j["bodies"]:
        row = {"label": body["label"], "attacker": body["attacker"], "start": body["startFrame"], "end": body.get("endFrame"),
               "rows": body.get("endFrame", 0) - body["startFrame"]}
        if body["label"] == "Move_FURY_CUTTER":
            row["counter"] = body["furyCutterCounter"][body["attacker"]]
            base = frames[body["startFrame"]]["pltt"]
            changed = {}
            for bank in base:
                ages = [f - body["startFrame"] for f in range(body["startFrame"], body["endFrame"] + 1)
                        if f in frames and frames[f]["pltt"][bank] != base[bank]]
                if ages:
                    changed[bank] = ages
            row["plttChangedAges"] = changed
            row["x2"] = [[s["x2"], s["y2"]] for s in body["at"]["battlerSprites"]]
        bodies.append(row)
    out["scenarios"].append({"scenario": p1.stem, "r1EqualsR2": a == b, "bodies": bodies})
text = json.dumps(out, indent=1)
if len(sys.argv) > 2:
    Path(sys.argv[2]).write_text(text + "\n")
for s in out["scenarios"]:
    print(s["scenario"], "r1==r2" if s["r1EqualsR2"] else "R1!=R2")
    for b in s["bodies"]:
        extra = f" c{b['counter']} x2 {b['x2']} pltt {b['plttChangedAges']}" if "counter" in b else ""
        print(f"  {b['label']} atk{b['attacker']} {b['start']}..{b['end']} rows {b['rows']}{extra}")
