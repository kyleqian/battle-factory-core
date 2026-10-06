#!/usr/bin/env python3
"""Append prep16 rows (Overheat 315, Silver Wind 318, Psych Up 244 (player)) to issue142-shadow-rows-extra.json.
row = activation - windowStart + ageOffset = 0 (the window is each scenario's own source window = activation + 0, prep16 s1).
Idempotent: replaces the ids it owns.  usage: issue142ShadowRowsPrep16.py"""
import json, pathlib
here = pathlib.Path(__file__).parent
p = here / "fixtures/issue142-shadow-rows-extra.json"
d = json.loads(p.read_text())
spec = {(315, "OVERHEAT"): {"player": "overheat-player-solrock-opponent-shuckle", "opponent": "overheat-opponent-magcargo-player-shuckle"},
        (318, "SILVER_WIND"): {"player": "silver-wind-player-butterfree-opponent-onix", "opponent": "silver-wind-opponent-butterfree-player-onix-first-body"}}
spec[(244, "PSYCH_UP")] = {"player": "psych-up-player-jumpluff-opponent-shuckle-first-body"}  # opponent attacker declines (first body unverified)
for (id_, move), names in spec.items():
    d["rows"] = [r for r in d["rows"] if r["id"] != id_]
    for o, name in names.items():
        fx = json.loads((here / f"fixtures/prep16-live/{name}.json").read_text()); win = fx["denseWindow"]["startFrame"]
        d["rows"].append({"id": id_, "move": move, "orientation": o, "variant": f"prep16-{name}", "activationFrame": win, "windowStart": win,
                          "ageOffset": 0, "shadowRow": 0, "cleanupFrame": None, "tailFirstAge": None, "inWindow": True,
                          "sources": {"fixture": f"tools/integration/fixtures/prep16-live/{name}.json", "scenario": fx["scenario"], "body": "normal",
                                      "activation": "docs/next-adapters-prep16.md s1 (the probe's source window starts at the activation frame)"}})
d["generated"] += " (+ prep16 Overheat/Silver Wind rows from issue142ShadowRowsPrep16.py)"
p.write_text(json.dumps(d, indent=1) + "\n")
