#!/usr/bin/env python3
"""bso226: stage one Scene ON battle-start window on the ROM (factoryLegal battle-lab scenario, every pre-checkpoint frame) and
write the params file tools/integration/bso226Run.ts consumes (ROM personalities read back from the first capture).
  python3 tools/integration/bso226Stage.py <out-dir> <tag> <seed> <trainerId> <p1,p2,p3> <o1,o2,o3> [bench=115,135,145]"""
import json, os, pathlib, subprocess, sys
out, tag, seed, trainer, players, opps = sys.argv[1:7]
bench = sys.argv[7] if len(sys.argv) > 7 else "115,135,145"
PROFILE = os.environ.get("BSO226_PROFILE", "battle-scene-on")
root = pathlib.Path(__file__).resolve().parents[2]
d = pathlib.Path(out) / tag
d.mkdir(parents=True, exist_ok=True)
scn = {"schemaVersion": 1, "mode": "factoryLegal", "profile": PROFILE, "level": 50, "challengeNum": 0, "battleNum": 0,
       "trainerId": int(trainer), "rentalSwapCount": 0, "playerSetIds": [int(x) for x in players.split(",")],
       "opponentSetIds": [int(x) for x in opps.split(",")], "seed": int(seed), "preCheckpointCaptureAllFrames": True,
       "trace": {"segments": [], "captureFrames": [0]}}
scn_path = pathlib.Path(out) / f"{tag}-scenario.json"
scn_path.write_text(json.dumps(scn, indent=2))
subprocess.run([str(root / "bin/oracle"), "--profile", PROFILE, "lab", str(scn_path), "-o", str(d / "rom")], check=True)
m = json.loads((d / "rom/manifest.json").read_text())
party = m["captures"][0]["state"]["parties"]["player"]
params = {"tag": tag, "rngValue": int(seed), "factoryWinStreak": 0, "playerSetIds": scn["playerSetIds"],
          "playerPersonalities": [p["personality"] for p in party[:3]], "benchSetIds": [int(x) for x in bench.split(",")]}
(pathlib.Path(out) / f"{tag}.json").write_text(json.dumps(params))
print(json.dumps(params))
