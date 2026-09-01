#!/usr/bin/env python3
"""Small no-pixel timeline probe used to diagnose the two-turn controller trace."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: razorWindTimeline.py <scenario> <output.json>")
scenario, output = map(Path, sys.argv[1:])
root = Path(__file__).resolve().parents[2]
harness = next(path for path in (root, *root.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(harness / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

request = validate_request(json.loads(scenario.read_text()), "battle-scene-on")
ref = (root / "reference/pokeemerald").resolve()
oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", harness / "oracle/bootstrap/factory.json")
lab = BattleLab(oracle, "battle-scene-on")
lab.prepare(request)
nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
names = {parts[2]: int(parts[0], 16) for line in nm.splitlines() if len(parts := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in parts[0])}
ptr, active = names["sBattleAnimScriptPtr"], names["gAnimScriptActive"]
u8 = lambda address: oracle.read_u8(address)
u32 = lambda address: u8(address) | u8(address + 1) << 8 | u8(address + 2) << 16 | u8(address + 3) << 24
events: list[dict] = []
previous = None
frame = 0

def take() -> None:
    global previous
    snap = lab.snapshot()
    engine = snap["engine"]
    state = (engine.get("currentMove"), bool(u8(active)), u32(ptr))
    if state != previous and (state[0] == 13 or (previous and previous[0] == 13)):
        events.append({"frame": frame, "currentMove": state[0], "active": state[1], "scriptPtr": state[2], "playerHp": snap["battlers"]["player"]["hp"], "opponentHp": snap["battlers"]["opponent"]["hp"]})
    previous = state

take()
for segment in request["trace"]["segments"]:
    for _ in range(segment["frames"]):
        oracle.advance(segment.get("buttons", []))
        frame += 1
        take()
output.write_text(json.dumps({"schema": "razor-wind-timeline/v1", "events": events}) + "\n")
print(json.dumps(events, separators=(",", ":")))
