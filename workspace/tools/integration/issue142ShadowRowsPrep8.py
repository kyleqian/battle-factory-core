#!/usr/bin/env python3
"""Append prep8 rows to issue142-shadow-rows-extra.json from the prep8 fixtures' draft blocks (activation frames measured
by issue142ActivationProbe.py: tools/integration/fixtures/census-activation, prep6-activation, prep8-activation).
Row = activation - windowStart + ageOffset of the LIVE dense window (the window the live adapter is proven on): Aerial Ace /
Quick Attack start at the activation frame (the accepted windows' earlier idle rows are the queue's message command,
docs/next-adapters-prep8.md s2.2), so their row is live age 0. Negative (Fake Tears -1) => inWindow false, not in the map.
Idempotent: replaces ids it owns. Usage: issue142ShadowRowsPrep7.py MOVE_ID:move:stem ..."""
import json, pathlib, sys
here = pathlib.Path(__file__).parent
p = here / "fixtures/issue142-shadow-rows-extra.json"
d = json.loads(p.read_text())
spec = [tuple(a.split(":")) for a in sys.argv[1:]]
owned = {int(s[0]) for s in spec}
d["rows"] = [r for r in d["rows"] if r["id"] not in owned]
for id_, move, stem in spec:
    for o in ("player", "opponent"):
        name = f"prep8-{stem}-{o}"
        path = here / f"fixtures/{name}.json"
        if not path.exists():
            continue
        f = json.loads(path.read_text())
        act, win = f["draft"]["activationFrame"], f["denseWindow"]["startFrame"]
        off = f["denseWindow"].get("ageOffset", 0)
        row = act - win + off
        row_obj = {
            "id": int(id_), "move": move, "orientation": o, "variant": name, "activationFrame": act,
            "windowStart": win, "ageOffset": off, "shadowRow": row,
            "cleanupFrame": None, "tailFirstAge": None, "inWindow": row >= 0,
            "sources": {"fixture": f"tools/integration/fixtures/{name}.json", "body": "normal",
                        "activation": "tools/integration/fixtures (census-activation / prep8-activation; docs/next-adapters-prep8.md; issue142ActivationProbe.py)"},
        }
        # Gated branches (Frustration friendship <= 30, Seismic Toss damage 33..65) render only for the request that selects them.
        if f.get("requestFields"):
            row_obj["requestFields"] = f["requestFields"]
        d["rows"].append(row_obj)
tag = " (+ prep8 rows from issue142ShadowRowsPrep7.py)"
if tag not in d["generated"]:
    d["generated"] += tag
p.write_text(json.dumps(d, indent=1) + "\n")
