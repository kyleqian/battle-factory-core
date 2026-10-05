#!/usr/bin/env python3
"""Append order-consumer rows to issue142-shadow-rows-extra.json from the order-consumer fixtures' draft blocks
(activation frames measured by issue142ActivationProbe.py: tools/integration/fixtures/order-consumer-activation,
docs/order-consumer-prep.md §4). Rows: activation - windowStart + ageOffset; negative => inWindow false, not in the map.
Idempotent: replaces ids it owns."""
import json, pathlib
here = pathlib.Path(__file__).parent
p = here / "fixtures/issue142-shadow-rows-extra.json"
d = json.loads(p.read_text())
spec = [(288, "GRUDGE", "grudge"), (52, "EMBER", "ember"), (82, "DRAGON_RAGE", "dragon-rage"), (53, "FLAMETHROWER", "flamethrower"),
        (88, "ROCK_THROW", "rock-throw"), (215, "HEAL_BELL", "heal-bell"), (195, "PERISH_SONG", "perish-song"),
        (348, "LEAF_BLADE", "leaf-blade"), (299, "BLAZE_KICK", "blaze-kick")]
owned = {s[0] for s in spec}
d["rows"] = [r for r in d["rows"] if r["id"] not in owned]
for id_, move, stem in spec:
    for o in ("player", "opponent"):
        f = json.loads((here / f"fixtures/order-consumer-{stem}-{o}.json").read_text())
        act, win = f["draft"]["activationFrame"], f["denseWindow"]["startFrame"]
        row = act - win + f["denseWindow"].get("ageOffset", 0)
        d["rows"].append({
            "id": id_, "move": move, "orientation": o, "variant": f"order-consumer-{stem}-{o}", "activationFrame": act,
            "windowStart": win, "ageOffset": f["denseWindow"].get("ageOffset", 0), "shadowRow": row,
            "cleanupFrame": None, "tailFirstAge": None, "inWindow": row >= 0,
            "sources": {"fixture": f"tools/integration/fixtures/order-consumer-{stem}-{o}.json", "body": "normal",
                        "activation": "tools/integration/fixtures/order-consumer-activation (docs/order-consumer-prep.md §4; issue142ActivationProbe.py)"},
        })
if "order-consumer" not in d["generated"]:
    d["generated"] += " (+ order-consumer rows from issue142ShadowRowsOrderConsumer.py)"
p.write_text(json.dumps(d, indent=1) + "\n")
