#!/usr/bin/env python3
"""Append prep29 R1 rows to issue142-shadow-rows-extra.json: Bonemerang hit 1 (155), Rapid Spin (229), Outrage (200), Luster Purge (295), both orientations
(activation == body window start A, row 0; prep29-live fixtures). Idempotent: replaces the rows it owns."""
import json, pathlib
here = pathlib.Path(__file__).parent
p = here / "fixtures/issue142-shadow-rows-extra.json"
d = json.loads(p.read_text())
spec = [(155, "BONEMERANG", "bonemerang-{o}-marowak-{f}-chansey-hit1"), (229, "RAPID_SPIN", "rapid-spin-{o}-wartortle-{f}-onix"),
        (200, "OUTRAGE", "outrage-{o}-dragonite-{f}-onix"), (295, "LUSTER_PURGE", "luster-purge-{o}-latios-{f}-onix")]
d["rows"] = [r for r in d["rows"] if not r["variant"].startswith("p29-")]
for id_, move, pat in spec:
    for o, f in (("player", "opponent"), ("opponent", "player")):
        name = pat.format(o=o, f=f)
        fx = json.loads((here / f"fixtures/prep29-live/{name}.json").read_text())
        win = fx["denseWindow"]["startFrame"]
        row = {"id": id_, "move": move, "orientation": o, "variant": "p29-" + name, "activationFrame": win, "windowStart": win,
            "ageOffset": 0, "shadowRow": 0, "cleanupFrame": None, "tailFirstAge": None, "inWindow": True,
            "sources": {"fixture": f"tools/integration/fixtures/prep29-live/{name}.json", "scenario": fx["scenario"], "body": "normal",
                        "activation": "window start = the scenario's own source activation frame (prep29 moves/*.json; r29 live receipt)"}}
        if "requestFields" in fx: row["requestFields"] = fx["requestFields"]
        d["rows"].append(row)
if "prep29 rows" not in d["generated"]:
    d["generated"] += " (+ prep29 rows from issue142ShadowRowsPrep29.py)"
p.write_text(json.dumps(d, indent=1) + "\n")
