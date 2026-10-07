#!/usr/bin/env python3
"""Append r3 profile rows to issue142-shadow-rows-extra.json: Lovely Kiss (142), Spikes (191), Octazooka (190), Signal Beam (324), both orientations
(activation == body window start A, row 0; prep22 s0.2 / r3-profile-live fixtures).  Idempotent: replaces the rows it owns."""
import json, pathlib
here = pathlib.Path(__file__).parent
p = here / "fixtures/issue142-shadow-rows-extra.json"
d = json.loads(p.read_text())
spec = [(142, "LOVELY_KISS", "player", "lovely-kiss-player-jynx-opponent-onix"), (142, "LOVELY_KISS", "opponent", "lovely-kiss-opponent-jynx-player-onix"),
        (191, "SPIKES", "player", "spikes-player-qwilfish-opponent-onix"), (191, "SPIKES", "opponent", "spikes-opponent-qwilfish-player-onix"),
        (190, "OCTAZOOKA", "player", "octazooka-alt-player-kingler-golem"), (190, "OCTAZOOKA", "opponent", "octazooka-alt-opponent-kingler-golem"),
        (324, "SIGNAL_BEAM", "player", "signal-beam-player-ariados-opponent-chansey"), (324, "SIGNAL_BEAM", "opponent", "signal-beam-opponent-ariados-player-chansey")]
d["rows"] = [r for r in d["rows"] if not r["variant"].startswith("r3p-")]
for id_, move, o, name in spec:
    fx = json.loads((here / f"fixtures/r3-profile-live/{name}.json").read_text())
    win = fx["denseWindow"]["startFrame"]
    row = {"id": id_, "move": move, "orientation": o, "variant": "r3p-" + name, "activationFrame": win, "windowStart": win,
        "ageOffset": 0, "shadowRow": 0, "cleanupFrame": None, "tailFirstAge": None, "inWindow": True,
        "sources": {"fixture": f"tools/integration/fixtures/r3-profile-live/{name}.json", "scenario": fx["scenario"], "body": "normal",
                    "activation": "window start = the scenario's own first-body activation (prep22 moves/*.json; elevated GOLBAT target dense 0 px in the r3 receipt)"}}
    if "presentationRngActivation" in fx:
        row["presentationRngActivation"] = fx["presentationRngActivation"]
    d["rows"].append(row)
if "r3 profile" not in d["generated"]:
    d["generated"] += " (+ r3 profile Lovely Kiss / Spikes / Octazooka rows from issue142ShadowRowsR3Profile.py)"
p.write_text(json.dumps(d, indent=1) + "\n")
