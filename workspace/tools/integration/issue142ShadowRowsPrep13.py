#!/usr/bin/env python3
"""Append prep13 rows (Ice Beam 58, Water Spout 323, Hidden Power 237, Hyper Beam 63) to issue142-shadow-rows-extra.json.
usage: issue142ShadowRowsPrep13.py MOVE... ; row = activation - windowStart + ageOffset = 0 (docs/next-adapters-prep13.md s0.2).
Idempotent: replaces the ids it owns."""
import json, sys, pathlib
here = pathlib.Path(__file__).parent
p = here / "fixtures/issue142-shadow-rows-extra.json"
d = json.loads(p.read_text())
spec = {"ICE_BEAM": (58, "ice-beam-{o}-delcatty-{f}-shuckle"), "WATER_SPOUT": (323, "water-spout-{o}-wailmer-{f}-shuckle"),
        "HIDDEN_POWER": (237, "hidden-power-{o}-unown-{f}-onix"), "HYPER_BEAM": (63, "hyper-beam-{o}-aerodactyl-{f}-onix")}
for move in sys.argv[1:]:
    id_, pat = spec[move]
    d["rows"] = [r for r in d["rows"] if r["id"] != id_]
    for o in ("player", "opponent"):
        name = pat.format(o=o, f="opponent" if o == "player" else "player")
        fx = json.loads((here / f"fixtures/prep13-live/{name}.json").read_text())
        win = fx["denseWindow"]["startFrame"]
        row = {"id": id_, "move": move, "orientation": o, "variant": f"prep13-{name}", "activationFrame": win, "windowStart": win,
               "ageOffset": 0, "shadowRow": 0, "cleanupFrame": None, "tailFirstAge": None, "inWindow": True,
               "sources": {"fixture": f"tools/integration/fixtures/prep13-live/{name}.json", "scenario": fx["scenario"], "body": "normal",
                           "activation": "docs/next-adapters-prep13.md s0.2 (activation == accepted window start, prep13-crosscheck.json)"}}
        if "presentationRngActivation" in fx:
            row["presentationRngActivation"] = fx["presentationRngActivation"]
        d["rows"].append(row)
    d["generated"] += f" (+ prep13 {move} rows from issue142ShadowRowsPrep13.py)"
p.write_text(json.dumps(d, indent=1) + "\n")
