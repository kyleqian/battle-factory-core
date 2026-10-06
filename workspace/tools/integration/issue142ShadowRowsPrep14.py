#!/usr/bin/env python3
"""Append prep14 rows (Rain Dance 240, Water Pulse 352, Hail 258) to issue142-shadow-rows-extra.json.
usage: issue142ShadowRowsPrep14.py MOVE... ; row = activation - windowStart + ageOffset = 0 (docs/next-adapters-prep14.md s2).
Idempotent: replaces the ids it owns."""
import json, sys, pathlib
here = pathlib.Path(__file__).parent
p = here / "fixtures/issue142-shadow-rows-extra.json"
d = json.loads(p.read_text())
spec = {"RAIN_DANCE": (240, "rain-dance-{o}-wooper-{f}-onix"), "WATER_PULSE": (352, "water-pulse-{o}-lombre-{f}-onix"),
        "HAIL": (258, "hail-{o}-delibird-{f}-onix")}
for move in sys.argv[1:]:
    id_, pat = spec[move]
    d["rows"] = [r for r in d["rows"] if r["id"] != id_]
    for o in ("player", "opponent"):
        name = pat.format(o=o, f="opponent" if o == "player" else "player")
        # the opponent-attacker fixtures are named <move>-opponent-<mon>-player-onix
        fx = json.loads((here / f"fixtures/prep14-live/{name}.json").read_text())
        win = fx["denseWindow"]["startFrame"]
        row = {"id": id_, "move": move, "orientation": o, "variant": f"prep14-{name}", "activationFrame": win, "windowStart": win,
               "ageOffset": 0, "shadowRow": 0, "cleanupFrame": None, "tailFirstAge": None, "inWindow": True,
               "sources": {"fixture": f"tools/integration/fixtures/prep14-live/{name}.json", "scenario": fx["scenario"], "body": "normal",
                           "activation": "docs/next-adapters-prep14.md s2 (activation == accepted window start, prep14-crosscheck.json)"}}
        if "presentationRngActivation" in fx:
            row["presentationRngActivation"] = fx["presentationRngActivation"]
        d["rows"].append(row)
    d["generated"] += f" (+ prep14 {move} rows from issue142ShadowRowsPrep14.py)"
p.write_text(json.dumps(d, indent=1) + "\n")
