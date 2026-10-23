#!/usr/bin/env python3
"""fnt201: stage the faint-timing scenarios from the sst200 Tickle scenario (PRIMEAPE vs ONIX, lab seed 11, 960-frame closing wait).
Only slot 0 of either side (species / moves / item) changes. usage: fnt201Stage.py <outdir>"""
import copy, json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BASE = json.load(open(os.path.join(ROOT, "tools/integration/fixtures/sst200/scenarios/sst200-tickle-s11.json")))
PRIMEAPE, ONIX, ABRA, SHUCKLE, SHEDINJA = 57, 95, 63, 213, 303
TACKLE, FRUSTRATION, SELF_DESTRUCT, SANDSTORM, TOXIC = 33, 218, 120, 201, 92
# name: (player species, player move, opponent species, opponent move)
CASES = {
    "ko-foe": (PRIMEAPE, FRUSTRATION, ABRA, TACKLE),
    "ko-player": (ABRA, TACKLE, PRIMEAPE, FRUSTRATION),
    "selfdestruct-survivor": (PRIMEAPE, SELF_DESTRUCT, SHUCKLE, TACKLE),
    "selfdestruct-onix": (PRIMEAPE, SELF_DESTRUCT, ONIX, TACKLE),  # ONIX survives too
    "selfdestruct-both": (PRIMEAPE, SELF_DESTRUCT, ABRA, TACKLE),  # target and user faint
    "sandstorm-shedinja": (PRIMEAPE, SANDSTORM, SHEDINJA, TACKLE),
    "toxic-shedinja": (PRIMEAPE, TOXIC, SHEDINJA, TACKLE),
}
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
for name, (ps, pm, os_, om) in CASES.items():
    s = copy.deepcopy(BASE)
    p, o = s["overrides"]["parties"]["player"][0], s["overrides"]["parties"]["opponent"][0]
    p["species"], p["moves"] = ps, [pm] * 4
    o["species"], o["moves"] = os_, [om] * 4
    if ps != PRIMEAPE: p["item"] = 0
    if os_ != ONIX: o["item"] = 0
    for m in ((p, ps), (o, os_)):
        if m[1] == ABRA:  # zero IV / EV Abra: the lowest HP and Defense, so one Frustration hit always KOs it
            m[0]["ivs"] = dict.fromkeys(m[0]["ivs"], 0); m[0]["evs"] = dict.fromkeys(m[0]["evs"], 0)
    if os_ == SHEDINJA: o["gender"] = "genderless"
    frames = 1500 if name == "sandstorm-shedinja" else 960  # the Scene ON sandstorm animation outlasts 994 frames
    s["trace"]["segments"][-1]["frames"] = frames; s["trace"]["captureFrames"] = [0, frames + 34]
    json.dump(s, open(os.path.join(out, f"fnt201-{name}-s11.json"), "w"), indent=1)
