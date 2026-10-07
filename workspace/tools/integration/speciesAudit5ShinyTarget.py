#!/usr/bin/env python3
"""speciesAudit5: add targetPersonality (from the swapped scenario's own ROM probe, gBattleMons at activation) to the shiny TARGET derived fixtures; the stock harness
(liveAdapterFramebuffer.ts liveView) only carries attackerPersonality, so it needs patches/harness-target-personality.diff to read it. usage: speciesAudit5ShinyTarget.py probedir derivedir"""
import json, sys, glob, os
pd, dd = sys.argv[1:3]
for f in sorted(glob.glob(f"{dd}/shinysteelix-*.json")):
    d = json.load(open(f)); p = json.load(open(f"{pd}/{os.path.basename(d['scenario'])}"))
    ai = 0 if d["attacker"]["geometry"]["side"] == "player" else 1
    d["targetPersonality"] = p["bodies"][d["speciesAudit5"]["bodyIndex"]]["atActivation"]["mons"][1 - ai]["personality"]
    json.dump(d, open(f, "w"), indent=1); open(f, "a").write("\n"); print(os.path.basename(f), hex(d["targetPersonality"]))
