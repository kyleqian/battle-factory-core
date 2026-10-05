#!/usr/bin/env python3
"""Append prep2 rows to issue142-shadow-rows-extra.json from the prep2 fixtures' draft blocks
(activation frames measured by issue142ActivationProbe.py: docs/next-adapters-prep2-activation.json).
Rows: activation - windowStart + ageOffset; negative (Explosion, Future Sight) => inWindow false, not in the map.
Idempotent: replaces ids it owns."""
import json, pathlib
here = pathlib.Path(__file__).parent
p = here / "fixtures/issue142-shadow-rows-extra.json"
d = json.loads(p.read_text())
spec = [(57, "SURF", "surf"), (330, "MUDDY_WATER", "muddy-water"), (196, "ICY_WIND", "icy-wind"),
        (59, "BLIZZARD", "blizzard"), (252, "FAKE_OUT", "fake-out"), (322, "COSMIC_POWER", "cosmic-power"),
        (248, "FUTURE_SIGHT", "future-sight"), (153, "EXPLOSION", "explosion")]
owned = {s[0] for s in spec}
d["rows"] = [r for r in d["rows"] if r["id"] not in owned]
for id_, move, stem in spec:
    for o in ("player", "opponent"):
        f = json.loads((here / f"fixtures/prep2-{stem}-{o}.json").read_text())
        act, win = f["draft"]["activationFrame"], f["denseWindow"]["startFrame"]
        row = act - win + f["denseWindow"].get("ageOffset", 0)
        d["rows"].append({
            "id": id_, "move": move, "orientation": o, "variant": f"prep2-{stem}-{o}", "activationFrame": act,
            "windowStart": win, "ageOffset": f["denseWindow"].get("ageOffset", 0), "shadowRow": row,
            "cleanupFrame": None, "tailFirstAge": None, "inWindow": row >= 0,
            "sources": {"fixture": f"tools/integration/fixtures/prep2-{stem}-{o}.json", "body": "normal",
                        "activation": "docs/next-adapters-prep2-activation.json (issue142ActivationProbe.py)"},
        })
d["generated"] += " (+ prep2 rows from issue142ShadowRowsPrep2.py)"
p.write_text(json.dumps(d, indent=1) + "\n")
