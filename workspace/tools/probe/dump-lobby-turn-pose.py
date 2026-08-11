#!/usr/bin/env python3
"""Isolate the player sprite from oracle Lobby turn frames and compare against
every sheet candidate (9 frames, each also h-flipped) — BLOCKER 2 of the
loss-lobby-walk-off spec promotion.

Replicates the app's renderFactoryTerminalField (factoryTerminalRender.ts) for
the field layers + non-player NPCs, then bg-subtracts it from an oracle frame
to obtain the pure player sprite pixels, and scores each sheet candidate
(all 9, plus h-flips) by exact pixel equality over the sprite's 16x32 box.

Run through tools/run-mgba-probe.py:
    python3 tools/run-mgba-probe.py /tmp/poseA-out.json -- \
        python3 tools/probe/dump-lobby-turn-pose.py \
        /tmp/poseA-out.json <fixture.json> <pngDir>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> <fixture.json> <pngDir>")

OUTPUT_PATH = Path(sys.argv[1])
SCENARIO_PATH = Path(sys.argv[2]).resolve()
PNG_DIR = Path(sys.argv[3])
PNG_DIR.mkdir(parents=True, exist_ok=True)

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent

import io  # noqa: E402


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find the harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

from PIL import Image as PILImage  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

PLAYER_AVATAR = 0x2037590
OBJECT_EVENTS = 0x2037350
OBJ_STRIDE = 0x24
G_SPRITES = 0x2020630
G_SPRITE_STRIDE = 0x44


def main() -> None:
    scenario = json.loads(SCENARIO_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    request = validate_request(scenario, "battle-scene-off")
    lab = BattleLab(oracle, "battle-scene-off")
    lab.prepare(request)

    segments = request["trace"]["segments"]
    # window: the turn spans 5172-5181 in the walk fixture; capture dense.
    START_TICK = 5170
    END_TICK = 5196
    rows = []
    tick = 0

    def read_u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def record():
        if not (START_TICK <= tick <= END_TICK):
            return
        rgb = oracle.screen_rgb()
        png = PNG_DIR / f"f{tick:05d}.png"
        PILImage.frombytes("RGB", (240, 160), rgb).save(png)
        player_id = read_u8(PLAYER_AVATAR + 0x05)
        obj_base = OBJECT_EVENTS + player_id * OBJ_STRIDE
        pid = read_u8(PLAYER_AVATAR + 0x04)
        spr = G_SPRITES + pid * G_SPRITE_STRIDE
        rows.append({
            "tick": tick,
            "png": png.name,
            "spriteAnimNum": read_u8(spr + 0x2A),
            "spriteAnimCmdIndex": read_u8(spr + 0x2B),
            "hFlip": (read_u8(spr + 0x3F) & 1) != 0,
            "spriteOamX": (read_u8(spr + 0x02) | (read_u8(spr + 0x03) << 8)) & 0x1FF,
            "spriteOamY": read_u8(spr + 0x00),
            "runningState": read_u8(PLAYER_AVATAR + 0x02),
        })

    record()
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            record()
        if tick > END_TICK:
            break

    OUTPUT_PATH.write_text(json.dumps({"rows": rows, "finalTick": tick}, indent=0))


main()
