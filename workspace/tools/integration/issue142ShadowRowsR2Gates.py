#!/usr/bin/env python3
"""Append r2-gates rows to issue142-shadow-rows-extra.json: Fire Punch (7) player/opponent (activation == body window start A, row 0; prep22 s0.2)
and Psych Up (244) opponent (lb21 pu-o-first fixture window start = activation). Idempotent: replaces the rows it owns."""
import json, pathlib
here = pathlib.Path(__file__).parent
p = here / "fixtures/issue142-shadow-rows-extra.json"
d = json.loads(p.read_text())
spec = [(7, "FIRE_PUNCH", "player", "r2-gates/fp-player-noburn"), (7, "FIRE_PUNCH", "opponent", "r2-gates/fp-opponent-noburn"),
        (244, "PSYCH_UP", "opponent", "later-bodies-bg-2/pu-o-first-b0")]
d["rows"] = [r for r in d["rows"] if not (r["variant"].startswith("r2g-"))]
for id_, move, o, name in spec:
    fx = json.loads((here / f"fixtures/{name}.json").read_text())
    win = fx["denseWindow"]["startFrame"]
    d["rows"].append({"id": id_, "move": move, "orientation": o, "variant": "r2g-" + name.replace("/", "-"), "activationFrame": win, "windowStart": win,
        "ageOffset": 0, "shadowRow": 0, "cleanupFrame": None, "tailFirstAge": None, "inWindow": True,
        "sources": {"fixture": f"tools/integration/fixtures/{name}.json", "scenario": fx["scenario"], "body": "normal",
                    "activation": "window start = the scenario's own body activation (prep22 s0.2 / lb21 bodyWindows)"}})
d["generated"] += " (+ r2-gates Fire Punch / Psych Up opponent rows from issue142ShadowRowsR2Gates.py)"
p.write_text(json.dumps(d, indent=1) + "\n")
