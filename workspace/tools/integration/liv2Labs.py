#!/usr/bin/env python3
"""liv2: write the ROM labs (scenario + trace) for the seven long-window bodies. Usage: liv2Labs.py <evidence-root> <exp1-dir>"""
import json, shutil, sys
ev, exp1 = sys.argv[1], sys.argv[2]
LABS = [  # (lab, scenario source, appStage id, frames)
    ("liv2-flamethrower-player-on", f"{ev}/hpd7c/scen/hpd7c-flamethrower-player-on.json", "liv2-flamethrower-player-on", 1000),
    ("liv2-solarbeam-player-on", f"{ev}/hpd7b/scen/hpd7b-solarbeam-player-on.json", "liv2-solarbeam-player-on", 1400),
    ("liv2-selfdestruct-player-on", f"{exp1}/selfdestruct-player-on.json", "exp1-selfdestruct-player-on", 1000),
    ("liv2-bite-player-on", f"{ev}/hpd7/scen/gen-bite-player-on.json", "liv2-bite-player-on", 1000),
    ("liv2-sludgebomb-player-on", f"{ev}/hpd7/scen/aud242i-sludgebomb-player-on.json", "aud242i-sludgebomb-player-on", 1000),
    ("liv2-earthquake-player-on", f"{ev}/hpd7/scen/gen-earthquake-player-on.json", "liv2-earthquake-player-on", 1000),
    ("liv2-faintattack-player-on", f"{ev}/hpd7/scen/aud242i-faintattack-player-on.json", "aud242i-faintattack-player-on", 1000),
]
for lab, src, stage, frames in LABS:
    shutil.copy(src, f"tools/battle-lab/{lab}.json")
    trace = {"appRoute": "generated-orchestrator", "oracleProfile": "battle-scene-on", "appStage": {"id": stage, "frame": 0},
             "oracleBattleLab": {"scenario": f"../../battle-lab/{lab}.json"},
             "segments": [{"frames": 2, "buttons": ["A"]}, {"frames": 18, "buttons": []}, {"frames": 2, "buttons": ["A"]}, {"frames": frames, "buttons": []}],
             "captureFrames": list(range(frames + 23))}
    json.dump(trace, open(f"tools/compare/traces/{lab}.json", "w"))
