#!/usr/bin/env python3
"""Generate the NEW wall-family staging scenarios (Barrier, Mirror Coat).

Reflect, Magic Coat and Protect reuse the accepted tools/battle-lab
mechanic-* scenarios unchanged.  Barrier is priority 0, so the accepted
Drowzee-vs-Onix fixtures let the faster Onix Tackle go first; here the
non-user side is the accepted Reflect fixture's Shuckle (3x, Tackle) so the
Barrier user moves first.  Mirror Coat can never be the first body (priority
-5, and it fails with no prior special hit), so it is staged after a real
Confusion exactly as tools/compare/mirrorCoatScenario.ts does.
usage: wallFamilyScenarios.py <outdir>
"""
import copy
import json
import sys
from pathlib import Path

OUT = Path(sys.argv[1])
B = Path("tools/battle-lab")
OUT.mkdir(parents=True, exist_ok=True)


def load(name):
    return json.loads((B / name).read_text())


def write(name, data):
    data["trace"]["segments"][-1]["frames"] = 900
    data["trace"]["captureFrames"] = [0, 934]
    (OUT / name).write_text(json.dumps(data, indent=1) + "\n")


# Barrier: user side keeps Drowzee party, other side = Shuckle x3 from Reflect.
for side, other in (("player", "opponent"), ("opponent", "player")):
    barrier = load(f"mechanic-barrier-{side}-drowzee-{other}-onix.json")
    reflect = load("mechanic-reflect-player-shuppet-opponent-shuckle.json" if other == "opponent"
                   else "mechanic-reflect-opponent-shuppet-player-shuckle.json")
    out = copy.deepcopy(barrier)
    out["overrides"]["parties"][other] = copy.deepcopy(reflect["overrides"]["parties"][other])
    # set ids come wholesale from the accepted Reflect fixture (their species
    # never overlap); only the override parties differ.
    out["playerSetIds"] = reflect["playerSetIds"]
    out["opponentSetIds"] = reflect["opponentSetIds"]
    write(f"wall-family-barrier-{side}.json", out)

# Mirror Coat: second body after the opposing Confusion.
for orient, base_name in (("player", "mechanic-light-screen-player-exeggcute-opponent-onix.json"),
                          ("opponent", "mechanic-light-screen-opponent-exeggcute-player-onix.json")):
    base = load(base_name)
    corsola = json.loads(Path("tools/compare/mirrorCoatCorsola.json").read_text())
    other = "opponent" if orient == "player" else "player"
    exeggcute = dict(base["overrides"]["parties"][other][0], moves=[93, 93, 93, 93])
    base["overrides"]["parties"][orient][0] = corsola
    base["overrides"]["parties"][other][0] = exeggcute
    base[f"{orient}SetIds"][0] = 151
    base[f"{other}SetIds"][0] = 112
    write(f"wall-family-mirror-coat-{orient}.json", base)
