#!/usr/bin/env python3
"""prep38: anim-script bodies of a prep38Probe.py run. A body = [activation (first anim-active row of a script run), first inactive row];
for each: script label, gCurrentMove, attacker / target, and per side at activation: hp, maxHP, status1, doll (battlerData behindSubstitute),
subHP, sprite tile digest. usage: prep38Bodies.py <probe.json>   (import: bodies(frames))"""
import json, sys


def bodies(frames):
    out, start = [], None
    for i, r in enumerate(frames):
        if r["active"] and start is None:
            start = i
        elif not r["active"] and start is not None:
            a = frames[start]
            scripts = [x["script"] for x in frames[start:i] if x["script"]]
            out.append({"start": a["frame"], "end": r["frame"], "rows": r["frame"] - a["frame"] + 1, "script": scripts[0] if scripts else None,
                        "move": a["move"], "attacker": a["attacker"], "target": a["target"], "rng2Next": frames[start + 1]["rng2"],
                        "at": [{k: b[k] for k in ("hp", "maxHP", "status1", "status2", "doll", "subHP", "tiles", "x2")} for b in a["battlers"]],
                        "prev": [{k: b[k] for k in ("doll", "tiles", "x2", "inv")} for b in frames[start - 1]["battlers"]]})
            start = None
    return out


if __name__ == "__main__":
    for b in bodies(json.load(open(sys.argv[1]))["frames"]):
        print(b["start"], b["end"], b["rows"], b["script"], b["move"], b["attacker"], "->", b["target"],
              [(s["hp"], s["status1"], s["doll"], s["subHP"], s["tiles"]) for s in b["at"]], [(s["doll"], s["tiles"]) for s in b["prev"]])
