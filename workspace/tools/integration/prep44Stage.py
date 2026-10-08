#!/usr/bin/env python3
"""prep44: stage the two scenarios the existing battle-lab set lacks (written to tools/integration/fixtures/prep44/scenarios/).

- dragon-breath-opponent-long: mechanic-dragon-breath-opponent-onix-player-murkrow with its final idle segment 500 -> 900 frames
  (the accepted trace ends before the opponent's Dragonbreath body cleans up; only idle frames are appended).
- rock-slide-opponent-onix-player-grovyle: s10aside-rock-slide-player-onix-opponent-grovyle with the two complete legal
  overrides.parties swapped (the Rock Slide x4 Onix lead is now the opponent's, so the Factory AI has one legal choice).
No transient state is injected; the stock ROM computes every outcome.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LAB, OUT = ROOT / "tools/battle-lab", ROOT / "tools/integration/fixtures/prep44/scenarios"
OUT.mkdir(parents=True, exist_ok=True)
d = json.loads((LAB / "mechanic-dragon-breath-opponent-onix-player-murkrow.json").read_text())
assert d["trace"]["segments"][-1] == {"frames": 500, "buttons": []}
d["trace"]["segments"][-1]["frames"] = 900
d["trace"]["captureFrames"] = [0, 934]
(OUT / "dragon-breath-opponent-long.json").write_text(json.dumps(d, indent=1) + "\n")
d = json.loads((LAB / "s10aside-rock-slide-player-onix-opponent-grovyle.json").read_text())
p = d["overrides"]["parties"]
p["player"], p["opponent"] = p["opponent"], p["player"]
d["playerSetIds"], d["opponentSetIds"] = d["opponentSetIds"], d["playerSetIds"]
(OUT / "rock-slide-opponent-onix-player-grovyle.json").write_text(json.dumps(d, indent=1) + "\n")
print("staged", sorted(x.name for x in OUT.glob("*.json")))
