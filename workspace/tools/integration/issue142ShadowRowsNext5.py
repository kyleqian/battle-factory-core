#!/usr/bin/env python3
"""Append next5 rows to issue142-shadow-rows-extra.json (activation frames: docs/next-adapters-prep.md s1,
measured with tools/integration/issue142ActivationProbe.py). Idempotent: replaces ids it owns."""
import json, pathlib
p = pathlib.Path(__file__).parent / "fixtures/issue142-shadow-rows-extra.json"
d = json.loads(p.read_text())
# id, move, fixture stem, {orientation: (activation, windowStart)}, duration, scenario pattern
spec = [
  (184, "SCARY_FACE", "next-scary-face", {"player": (75, 79), "opponent": (79, 83)}, 190, "mechanic-scary-face-%s-rhyhorn-opponent-shuckle"),
  (137, "GLARE", "next-glare", {"player": (74, 74), "opponent": (78, 78)}, 213, None),
]
owned = {s[0] for s in spec}
d["rows"] = [r for r in d["rows"] if r["id"] not in owned]
for id_, move, stem, ors, dur, _ in spec:
    for o, (act, start) in ors.items():
        row = act - start
        d["rows"].append({
            "id": id_, "move": move, "orientation": o, "variant": f"{stem}-{o}", "activationFrame": act,
            "windowStart": start, "ageOffset": 0, "shadowRow": row, "cleanupFrame": None, "tailFirstAge": dur,
            "inWindow": row >= 0,
            "sources": {"fixture": f"tools/integration/fixtures/{stem}-{o}.json", "body": "normal",
                        "activation": "docs/next-adapters-prep.md s1 (issue142ActivationProbe.py)"},
        })
d["generated"] += " (+ next5 rows from issue142ShadowRowsNext5.py)"
p.write_text(json.dumps(d, indent=1) + "\n")
