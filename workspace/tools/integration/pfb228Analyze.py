#!/usr/bin/env python3
"""pfb228: per-window schedule of the ROM faint-replacement send-in relative to B (= 91 + len(name), the ball spawn clock).
usage: pfb228Analyze.py <json dir> id=B ...   (json = pfb228Frames.py output). Prints one table per window (confirm-relative e, and e-B)."""
import json, sys
from pathlib import Path

D = Path(sys.argv[1])
for spec in sys.argv[2:]:
    wid, B = spec.split("="); B = int(B)
    d = json.loads((D / f"{wid}-on.json").read_text())
    rows = {int(k): v for k, v in d["rows"].items()}
    ks = sorted(rows)
    ev = {}

    def note(name, e):
        ev.setdefault(name, e)
    prev = None
    for e in ks:
        r = rows[e]; b = r["b"][0]
        cbs = [s[6] for s in r["sp"]]
        if "SpriteCB_PlayerMonSendOut_1" in cbs or any(c.startswith("SpriteCB_PlayerMonSendOut") for c in cbs): note("ballArcStart", e)
        if "HandleBallAnimEnd" in cbs: note("ballLand(HandleBallAnimEnd)", e)
        if any(c.startswith("PokeBallOpenParticle") for c in cbs): note("particles", e)
        if b["cb"] == "SpriteCB_PlayerMonFromBall": note("cb:FromBall", e)
        if b["cb"] == "SpriteCB_WaitForBattlerBallReleaseAnim": note("cb:WaitRelease", e)
        if b["cb"] != "SpriteCallbackDummy" and b["use"]: note("cb:" + b["cb"], e)
        if b["use"] and not b["inv"]: note("monVisibleRAM", e)
        if b["use"] and b["affEnded"]: note("affEnded", e)
        if b["use"] and b["animEnded"] == 0: note("animRunning", e)
        if b["x2"] != 0: note("x2!=0", e)
        if b["y2"] != 0: note("y2!=0", e)
        t = "|".join(sorted(r["tasks"].values()))
        for n in r["tasks"].values(): note("task:" + n, e)
        if prev is not None and prev["b"][0]["plt"] != b["plt"] and b["use"] and not b["inv"]: ev.setdefault("pltChanged", e)
        prev = r
    print(f"== {wid}  B={B}  confirm={d['confirmFrame']} rawFirst={d['rawFirstFrame']}")
    for n, e in sorted(ev.items(), key=lambda kv: kv[1]):
        if -8 <= e <= 200: print(f"  {n:44s} e={e:4d}  e-B={e - B:4d}")
