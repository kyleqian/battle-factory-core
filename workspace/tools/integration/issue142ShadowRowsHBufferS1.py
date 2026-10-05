#!/usr/bin/env python3
"""Append H_BUFFER S1 rows to issue142-shadow-rows-extra.json from the prep4 fixtures' draft blocks
(activation frames measured by issue142ActivationProbe.py: docs/next-adapters-prep4-activation.json).
Rows: activation - windowStart + ageOffset; negative (Dragon Breath -6) => inWindow false, not in the map.
Idempotent: replaces ids it owns."""
import json, pathlib
here = pathlib.Path(__file__).parent
p = here / "fixtures/issue142-shadow-rows-extra.json"
d = json.loads(p.read_text())
spec = [(212, "MEAN_LOOK", "mean-look"), (265, "SMELLING_SALT", "smelling-salt"), (111, "DEFENSE_CURL", "defense-curl"),
        (275, "INGRAIN", "ingrain"), (35, "WRAP", "wrap"), (20, "BIND", "bind"), (225, "DRAGON_BREATH", "dragon-breath")]
owned = {s[0] for s in spec}
d["rows"] = [r for r in d["rows"] if r["id"] not in owned]
for id_, move, stem in spec:
    for o in ("player", "opponent"):
        f = json.loads((here / f"fixtures/prep4-{stem}-{o}.json").read_text())
        act, win = f["draft"]["activationFrame"], f["denseWindow"]["startFrame"]
        row = act - win + f["denseWindow"].get("ageOffset", 0)
        d["rows"].append({
            "id": id_, "move": move, "orientation": o, "variant": f"prep4-{stem}-{o}", "activationFrame": act,
            "windowStart": win, "ageOffset": f["denseWindow"].get("ageOffset", 0), "shadowRow": row,
            "cleanupFrame": None, "tailFirstAge": None, "inWindow": row >= 0,
            "sources": {"fixture": f"tools/integration/fixtures/prep4-{stem}-{o}.json", "body": "normal",
                        "activation": "tools/integration/fixtures/prep4-activation (docs/h-buffer-s1-prep.md; issue142ActivationProbe.py)"},
        })
d["generated"] += " (+ H_BUFFER S1 rows from issue142ShadowRowsHBufferS1.py)"
p.write_text(json.dumps(d, indent=1) + "\n")
