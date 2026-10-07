#!/usr/bin/env python3
"""Append q2 rows to issue142-shadow-rows-extra.json: Hyper Voice (304), Smog (123), Sand Tomb (328), Sky Attack charge (143), both orientations
(activation == body window start A, row 0; q2-live fixtures).  Idempotent: replaces the rows it owns."""
import json, pathlib
here = pathlib.Path(__file__).parent
p = here / "fixtures/issue142-shadow-rows-extra.json"
d = json.loads(p.read_text())
spec = [(304, "HYPER_VOICE", "hyper-voice-{o}-exploud-{f}-slowking"), (123, "SMOG", "smog-{o}-magby-{f}-onix"),
        (328, "SAND_TOMB", "sand-tomb-{o}-dugtrio-{f}-onix"), (143, "SKY_ATTACK", "sky-attack-{o}-fearow-{f}-shuckle"),
        (173, "SNORE", "snore-{o}-sealeo-{f}-venomoth")]
at = next((i for i, r in enumerate(d["rows"]) if r["variant"].startswith("q2-")), len(d["rows"]))  # keep the rows' position (a stable diff)
d["rows"] = [r for r in d["rows"] if not r["variant"].startswith("q2-")]
new = []
# prep28: the Sky Attack strike (143, turn 1) is a second row set; Snore (173) follows Sleep Powder + the sleep status animations.
for id_, move, pat, suffix in [(i, m, pt, "-charge" if i == 143 else "") for i, m, pt in spec] + [(143, "SKY_ATTACK", spec[3][2], "-strike")]:
    for o, f in (("player", "opponent"), ("opponent", "player")):
        name = pat.format(o=o, f=f) + suffix
        fx = json.loads((here / f"fixtures/q2-live/{name}.json").read_text())
        win = fx["denseWindow"]["startFrame"]
        row = {"id": id_, "move": move, "orientation": o, "variant": "q2-" + name, "activationFrame": win, "windowStart": win,
            "ageOffset": 0, "shadowRow": 0, "cleanupFrame": None, "tailFirstAge": None, "inWindow": True,
            "sources": {"fixture": f"tools/integration/fixtures/q2-live/{name}.json", "scenario": fx["scenario"], "body": "normal",
                        "activation": "window start = the scenario's own source activation frame (prep25 moves/*.json; q2-live receipt)"}}
        if "requestFields" in fx:
            row["requestFields"] = fx["requestFields"]
        new.append(row)
d["rows"][at:at] = new
if "q2 rows" not in d["generated"]:
    d["generated"] += " (+ q2 rows from issue142ShadowRowsQ2.py)"
p.write_text(json.dumps(d, indent=1) + "\n")
