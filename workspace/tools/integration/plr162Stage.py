#!/usr/bin/env python3
"""plr162 (docs/plr162-player-forced-send-in.md): stage dense Roar windows with the PLAYER as the Roar target, per species.

  roar-<sp>-{a,b}.json  tools/battle-lab/mechanic-roar-opponent-houndour-player-onix.json (offs152's player-target sweep scenario):
                        the opponent HOUNDOUR's Roar drags out player party slot 1 = <sp>. Captures 150..489 (two oracle runs of at most
                        256 captures into one directory).
  python3 tools/integration/plr162Stage.py <out-dir> <species,...> [--on]     (default Scene OFF; --on: Battle Scene ON)"""
import json, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
species = [int(x) for x in sys.argv[2].split(",")]
on = "--on" in sys.argv
for sp in species:
    d = json.load(open(root / "tools/battle-lab/mechanic-roar-opponent-houndour-player-onix.json"))
    d["profile"] = "battle-scene-on" if on else "battle-scene-off"
    d["overrides"]["parties"]["player"][1]["species"] = sp
    d["trace"]["segments"] += [{"frames": 400, "buttons": []}]
    frames = list(range(340, 680)) if on else list(range(150, 490))
    for part, chunk in (("a", frames[:256]), ("b", frames[256:])):
        d["trace"]["captureFrames"] = chunk
        (out / f"roar-{sp}-{part}.json").write_text(json.dumps(d))
