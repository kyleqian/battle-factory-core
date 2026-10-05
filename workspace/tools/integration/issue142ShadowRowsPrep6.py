#!/usr/bin/env python3
"""Append prep6 rows to issue142-shadow-rows-extra.json from the prep6 fixtures' draft blocks
(activation frames measured by issue142ActivationProbe.py: tools/integration/fixtures/prep6-activation).
Rows: activation - windowStart + ageOffset; negative (Self-Destruct -4, Knock Off -6, Faint Attack -4) => inWindow false,
not in the map. Swallow has one row per stockpile branch. Idempotent: replaces ids it owns."""
import json, pathlib
here = pathlib.Path(__file__).parent
p = here / "fixtures/issue142-shadow-rows-extra.json"
d = json.loads(p.read_text())
spec = [(317, "ROCK_TOMB", "rock-tomb", None), (219, "SAFEGUARD", "safeguard", None), (230, "SWEET_SCENT", "sweet-scent", None),
        (120, "SELF_DESTRUCT", "self-destruct", None), (256, "SWALLOW", "swallow", (1, 2, 3)),
        (282, "KNOCK_OFF", "knock-off", None), (185, "FAINT_ATTACK", "faint-attack", None)]
owned = {s[0] for s in spec}
d["rows"] = [r for r in d["rows"] if r["id"] not in owned]
for id_, move, stem, variants in spec:
    for o in ("player", "opponent"):
        for v in (variants or (None,)):
            name = f"prep6-{stem}-{o}" + (f"-{v}" if v else "")
            path = here / f"fixtures/{name}.json"
            if not path.exists():
                continue  # Faint Attack has no opponent-attacker evidence
            f = json.loads(path.read_text())
            act, win = f["draft"]["activationFrame"], f["denseWindow"]["startFrame"]
            off = f["denseWindow"].get("ageOffset", 0)
            row = act - win + off
            extra = {"requestFields": {"turn": v}} if v else {}
            d["rows"].append({
                **extra, "id": id_, "move": move, "orientation": o, "variant": name, "activationFrame": act,
                "windowStart": win, "ageOffset": off, "shadowRow": row,
                "cleanupFrame": None, "tailFirstAge": None, "inWindow": row >= 0,
                "sources": {"fixture": f"tools/integration/fixtures/{name}.json", "body": "normal",
                            "activation": "tools/integration/fixtures/prep6-activation (docs/next-adapters-prep6.md; issue142ActivationProbe.py)"},
            })
d["generated"] += " (+ prep6 rows from issue142ShadowRowsPrep6.py)"
p.write_text(json.dumps(d, indent=1) + "\n")
