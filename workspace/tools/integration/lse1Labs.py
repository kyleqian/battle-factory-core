#!/usr/bin/env python3
"""lse1: write the Lv50-vs-Lv12 Rattata body labs (hpd7 shape, Scene ON) for a list of move ids.

usage: lse1Labs.py <out-dir> <name>=<moveId> ...
Each lab = tools/battle-lab/aud242b-calmmind-player-on.json with the player's moves replaced, trace 1400 frames, plus the compare trace
(app stage `lse1-<name>-player-on` = aud241bStage(state, id, "on", 50, 12, <moveId>, undefined, false, 69), added by hand to appTrace.ts for the run).
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
out = Path(sys.argv[1])
(out / "scen").mkdir(parents=True, exist_ok=True)
(out / "traces").mkdir(parents=True, exist_ok=True)
base = json.loads((ROOT / "tools/battle-lab/aud242b-calmmind-player-on.json").read_text())
for arg in sys.argv[2:]:
    name, mid = arg.split("=")
    lab = f"lse1-{name}-player-on"
    d = json.loads(json.dumps(base))
    d["overrides"]["parties"]["player"][0]["moves"] = [int(mid)] * 4
    d["trace"]["segments"][-1]["frames"] = 1400
    (out / "scen" / f"{lab}.json").write_text(json.dumps(d))
    t = {"appRoute": "generated-orchestrator", "oracleProfile": "battle-scene-on", "appStage": {"id": lab, "frame": 0},
         "oracleBattleLab": {"scenario": f"../../battle-lab/{lab}.json"}, "segments": d["trace"]["segments"]}
    (out / "traces" / f"{lab}.json").write_text(json.dumps(t))
    print(f'  "{lab}": (state) => aud241bStage(state, "{lab}", "on", 50, 12, {mid}, undefined, false, 69),')
