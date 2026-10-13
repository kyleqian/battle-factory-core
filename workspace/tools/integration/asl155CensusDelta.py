#!/usr/bin/env python3
"""asl155 B: per-command census delta (liveShareCensus merged.jsonl, base-b vs landed; pairing by line) for the Extrasensory 326 player later
landing: every status / decline change and every frame change, with the claim that both are confined to player Extrasensory commands
(the player later lag policy makes their bodies 162 rows: presentation timing only).
usage: asl155CensusDelta.py <base merged.jsonl> <landed merged.jsonl> <out.json>"""
import json, sys
from collections import Counter
from pathlib import Path

base = [json.loads(l) for l in Path(sys.argv[1]).read_text().splitlines()]
landed = [json.loads(l) for l in Path(sys.argv[2]).read_text().splitlines()]
assert len(base) == len(landed)
reason = lambda r: None if r["decline"] is None else r["decline"].get("reason")
changed, framed, index = [], [], {}
for b, p in zip(base, landed):
    assert (b["battle"], b["kind"], b.get("moveId"), b.get("side"), b.get("attacker"), b.get("target")) == \
        (p["battle"], p["kind"], p.get("moveId"), p.get("side"), p.get("attacker"), p.get("target"))
    k = index[b["battle"]] = index.get(b["battle"], -1) + 1
    xs = b.get("moveId") == 326 and b.get("side") == "player"
    if b["frames"] != p["frames"]:
        framed.append({"battle": b["battle"], "command": k, "xsPlayer": xs, "before": b["frames"], "after": p["frames"]})
    if (b["status"], reason(b)) != (p["status"], reason(p)):
        changed.append({"battle": b["battle"], "command": k, "move": b.get("move"), "side": b.get("side"), "target": b.get("target"), "xsPlayer": xs,
                        "frames": [b["frames"], p["frames"]], "before": [b["status"], reason(b)], "after": [p["status"], reason(p)]})
lifted = [c for c in changed if c["before"][0] != "live" and c["after"][0] == "live"]
regressed = [c for c in changed if c["before"][0] == "live" and c["after"][0] != "live"]
live = lambda rows: (sum(r["status"] == "live" for r in rows), sum(r["liveFrames"] for r in rows), sum(r["frames"] for r in rows))
xs_rows = [(b, p) for b, p in zip(base, landed) if b.get("moveId") == 326 and b.get("side") == "player"]
out = {"schema": "asl155-census-delta/v1", "commands": len(base), "live": {"base": live(base), "landed": live(landed)},
       "lifted": {"commands": len(lifted), "frames": sum(c["frames"][1] for c in lifted), "targets": dict(Counter(c["target"] for c in lifted))},
       "regressed": len(regressed), "changedOutsidePlayerExtrasensory": sum(not c["xsPlayer"] for c in changed),
       "frameChanges": {"commands": len(framed), "delta": sum(f["after"] - f["before"] for f in framed),
                        "outsidePlayerExtrasensory": sum(not f["xsPlayer"] for f in framed)},
       "playerExtrasensory": {"commands": len(xs_rows),
                              "base": dict(Counter(f"{b['status']}: {reason(b)}" for b, _ in xs_rows)),
                              "landed": dict(Counter(f"{p['status']}: {reason(p)}" for _, p in xs_rows)),
                              "declinedTargetsLanded": dict(Counter(p["target"] for _, p in xs_rows if p["status"] != "live"))},
       "changed": changed}
Path(sys.argv[3]).write_text(json.dumps(out, indent=1) + "\n")
print(f"live {out['live']['base'][0]} -> {out['live']['landed'][0]} commands, {out['live']['base'][1]} -> {out['live']['landed'][1]} live frames"
      f" (presented {out['live']['base'][2]} -> {out['live']['landed'][2]}); lifted {out['lifted']}; regressed {len(regressed)};"
      f" changed outside player XS {out['changedOutsidePlayerExtrasensory']}; frame changes {out['frameChanges']}")
