#!/usr/bin/env python3
"""Append prep5 rows to issue142-shadow-rows-extra.json from the prep5 fixtures' draft blocks
(activation frames measured by issue142ActivationProbe.py: docs/next-adapters-prep5-activation.json).
Rows: activation - windowStart + ageOffset; negative (Taunt -10) => inWindow false, not in the map.
Idempotent: replaces ids it owns."""
import json, pathlib
here = pathlib.Path(__file__).parent
p = here / "fixtures/issue142-shadow-rows-extra.json"
d = json.loads(p.read_text())
spec = [(296, "MIST_BALL", "mist-ball"), (312, "AROMATHERAPY", "aromatherapy"), (266, "FOLLOW_ME", "follow-me"),
        (118, "METRONOME", "metronome"), (269, "TAUNT", "taunt"), (187, "BELLY_DRUM", "belly-drum")]
owned = {s[0] for s in spec}
d["rows"] = [r for r in d["rows"] if r["id"] not in owned]
for id_, move, stem in spec:
    for o in ("player", "opponent"):
        f = json.loads((here / f"fixtures/prep5-{stem}-{o}.json").read_text())
        act, win = f["draft"]["activationFrame"], f["denseWindow"]["startFrame"]
        row = act - win + f["denseWindow"].get("ageOffset", 0)
        d["rows"].append({
            "id": id_, "move": move, "orientation": o, "variant": f"prep5-{stem}-{o}", "activationFrame": act,
            "windowStart": win, "ageOffset": f["denseWindow"].get("ageOffset", 0), "shadowRow": row,
            "cleanupFrame": None, "tailFirstAge": None, "inWindow": row >= 0,
            "sources": {"fixture": f"tools/integration/fixtures/prep5-{stem}-{o}.json", "body": "normal",
                        "activation": "tools/integration/fixtures/prep5-activation (docs/next-adapters-prep5.md; issue142ActivationProbe.py)"},
        })
d["generated"] += " (+ prep5 rows from issue142ShadowRowsPrep5.py)"
p.write_text(json.dumps(d, indent=1) + "\n")
