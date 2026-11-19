#!/usr/bin/env python3
"""phy1m: write hpd7-shape Scene ON body labs (Lv50 Rattata user vs Lv12 Seismic Toss Rattata) for either side.

usage: phy1mLabs.py <out-dir> <name>=<moveId>:<player|opponent> ...
Each lab = tools/battle-lab/aud242b-calmmind-player-on.json with the user's moves replaced (opponent side: levels / moves swapped as in
aud242b-dragonclaw-opponent-on.json), trace 1400 frames, plus the compare trace (app stage `phy1m-<name>-<side>-on`, printed as the appTrace.ts
line to add by hand for the run: aud241bStage(state, id, "on", pLevel, oLevel, playerMove, undefined, false, opponentMove)).
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
out = Path(sys.argv[1])
for sub in ("scen", "traces"):
    (out / sub).mkdir(parents=True, exist_ok=True)
base = json.loads((ROOT / "tools/battle-lab/aud242b-calmmind-player-on.json").read_text())
for arg in sys.argv[2:]:
    name, spec = arg.split("=")
    mid, side = spec.split(":")
    mid = int(mid)
    lab = f"phy1m-{name}-{side}-on"
    d = json.loads(json.dumps(base))
    p0, o0 = d["overrides"]["parties"]["player"][0], d["overrides"]["parties"]["opponent"][0]
    if side == "player":
        p0["moves"] = [mid] * 4
        pl, ol, pm, om = 50, 12, mid, 69
    else:
        p0["level"], p0["moves"] = 12, [69] * 4
        o0["level"], o0["moves"] = 50, [mid] * 4
        pl, ol, pm, om = 12, 50, 69, mid
    d["trace"]["segments"][-1]["frames"] = 1400
    (out / "scen" / f"{lab}.json").write_text(json.dumps(d))
    t = {"appRoute": "generated-orchestrator", "oracleProfile": "battle-scene-on", "appStage": {"id": lab, "frame": 0}, "segments": d["trace"]["segments"]}
    (out / "traces" / f"{lab}.json").write_text(json.dumps(t))
    print(f'  "{lab}": (state) => aud241bStage(state, "{lab}", "on", {pl}, {ol}, {pm}, undefined, false, {om}),')
