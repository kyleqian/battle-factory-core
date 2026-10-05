#!/usr/bin/env python3
"""forced-switch: ON vs OFF profile continuation timing (anchored on the target battler free, k=0 at E in both).  usage: forcedSwitchOnOffCompare.py <on.json> <off.json> [tgt side index: 1 opponent target / 0 player target]"""
import json, sys
def tl(p, tgt):
    d = json.load(open(p)); E = d["E"] + 1; r = {int(k) - E: v for k, v in d["rows"].items()}
    ball = next((s["f"] - E for s in d["spawns"] if s.get("cb") == "SpriteCB_WaitForBattlerBallReleaseAnim" and s["f"] >= E), None)
    free = next((s["f"] - E for s in d["spawns"] if s["ev"] == "-" and s["f"] >= E), None)
    particles = [s["f"] - E for s in d["spawns"] if s["ev"] == "+" and s.get("cb", "").startswith("PokeBallOpenParticle")]
    sl = next((k for k in sorted(r) if k > 0 and abs(r[k]["h"][tgt][3]) in (105, 110) and r[k]["h"][tgt][5] == 0), None)
    txt = next((k for k in sorted(r) if k > 20 and r[k]["txt"][:2] != r[0]["txt"][:2]), None)
    pid = next((k for k in sorted(r) if k > -6 and r[k]["pidx"] != r[-6]["pidx"]), None)
    return {"E": E, "battlerFreed": free, "pidxChange": pid, "ballSpawn": ball, "particles": (particles[0], particles[-1], len(particles)) if particles else None, "healthboxSlideStart": sl, "textStart": txt}
tgt = int(sys.argv[3]) if len(sys.argv) > 3 else 1
for n, p in (("ON ", sys.argv[1]), ("OFF", sys.argv[2])): print(n, tl(p, tgt))
