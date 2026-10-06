#!/usr/bin/env python3
"""Append prep17 rows (Mud-Slap 189, Sand-Attack 28; player, opponent, alternate) to issue142-shadow-rows-extra.json.
The prep17 live fixtures' windows start at the activation frame, so the shadow row is 0 (idempotent: replaces earlier prep17 rows)."""
import json
from pathlib import Path
here = Path(__file__).resolve().parent
p = here / "fixtures/issue142-shadow-rows-extra.json"
d = json.loads(p.read_text())
d["rows"] = [r for r in d["rows"] if not str(r.get("variant", "")).startswith("prep17-")]
for f in sorted((here / "fixtures/prep17-live").glob("*.json")):
    fx = json.loads(f.read_text())
    rid = {"MUD_SLAP": 189, "SAND_ATTACK": 28}[fx["move"]]
    A = fx["denseWindow"]["startFrame"]
    d["rows"].append({
        "id": rid, "move": fx["move"], "orientation": fx["attacker"]["geometry"]["side"], "variant": "prep17-" + f.stem,
        "activationFrame": A, "windowStart": A, "ageOffset": 0, "shadowRow": 0, "cleanupFrame": None, "tailFirstAge": None, "inWindow": True,
        "sources": {"fixture": f"tools/integration/fixtures/prep17-live/{f.name}", "scenario": fx["scenario"], "body": "normal",
                    "activation": "docs/next-adapters-prep17.md s0.2 (window = activation..activation + body rows - 1)"},
        "presentationRngActivation": fx["presentationRngActivation"],
    })
# prep18 Dig: only the setup body shows the activation-frame shadow (the unleash attacker is still hidden on its first row).
for f in sorted((here / "fixtures/prep18-live").glob("*-body0.json")):
    fx = json.loads(f.read_text())
    A = fx["denseWindow"]["startFrame"]
    d["rows"].append({
        "id": 91, "move": "DIG", "orientation": fx["attacker"]["geometry"]["side"], "variant": "prep17-prep18-" + f.stem,
        "activationFrame": A, "windowStart": A, "ageOffset": 0, "shadowRow": 0, "cleanupFrame": None, "tailFirstAge": None, "inWindow": True,
        "sources": {"fixture": f"tools/integration/fixtures/prep18-live/{f.name}", "scenario": fx["scenario"], "body": "normal",
                    "activation": "docs/next-adapters-prep18.md s1.1 (setup window = activation..activation + 194; the unleash body has no shadow row)"},
    })
p.write_text(json.dumps(d, indent=1) + "\n")
print(len(d["rows"]))
