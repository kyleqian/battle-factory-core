#!/usr/bin/env python3
"""Dense PNG + RAM probe for the Lobby wandering-woman pose audit.

Replays the given scratch lobby fixture's own trace.segments and, for every
tick in the requested window, records the woman's sprite OAM + world position,
animNum/animCmdIndex/hFlip, the player's sprite state, the BG1 HOFS/VOFS
registers, and an RGB888 framebuffer PNG.

Run only through tools/run-mgba-probe.py, e.g.:
    python3 tools/run-mgba-probe.py /tmp/woman-pose-out.json -- \
        python3 tools/probe/dump-lobby-woman-pose.py \
        /tmp/woman-pose-out.json <fixture.json> <startTick> <endTick> <pngDir>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 6:
    raise SystemExit(
        f"usage: {sys.argv[0]} <output.json> <fixture.json> <startTick> <endTick> <pngDir>"
    )

OUTPUT_PATH = Path(sys.argv[1])
SCENARIO_PATH = Path(sys.argv[2]).resolve()
START_TICK = int(sys.argv[3])
END_TICK = int(sys.argv[4])
PNG_DIR = Path(sys.argv[5])
PNG_DIR.mkdir(parents=True, exist_ok=True)

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent

WOMAN_GFX_ID = 16  # OBJ_EVENT_GFX_WOMAN_1


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find the harness root (oracle/emerald_core.py) above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

OBJECT_EVENTS = 0x2037350
OBJ_STRIDE = 0x24
G_SPRITES = 0x2020630
G_SPRITE_STRIDE = 0x44
PLAYER_AVATAR = 0x2037590
REG_BG1HOFS = 0x04000014
REG_BG1VOFS = 0x04000016

DIR_NAMES = {1: "SOUTH", 2: "NORTH", 3: "WEST", 4: "EAST"}


def main() -> None:
    scenario = json.loads(SCENARIO_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    request = validate_request(scenario, "battle-scene-off")
    lab = BattleLab(oracle, "battle-scene-off")
    lab.prepare(request)

    def read_u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def read_u16(addr: int) -> int:
        return oracle.read_u16(addr)

    def read_s16(addr: int) -> int:
        v = oracle.read_u16(addr)
        return v - 0x10000 if v & 0x8000 else v

    def read_u32(addr: int) -> int:
        return oracle.read_u32(addr)

    def sprite_state(sprite_id: int) -> dict:
        base = G_SPRITES + sprite_id * G_SPRITE_STRIDE
        oam_x = (read_u8(base + 0x02) | (read_u8(base + 0x03) << 8)) & 0x1FF
        return {
            "oamX": oam_x,
            "oamY": read_u8(base + 0x00),
            "x": read_s16(base + 0x20),
            "y": read_s16(base + 0x22),
            "animNum": read_u8(base + 0x2A),
            "animCmdIndex": read_u8(base + 0x2B),
            "hFlip": (read_u8(base + 0x3F) & 1) != 0,
        }

    def object_event_state(i: int) -> dict:
        base = OBJECT_EVENTS + i * OBJ_STRIDE
        flags = read_u32(base + 0x00)
        face_move = read_u16(base + 0x18)
        return {
            "slot": i,
            "active": (flags >> 0) & 1,
            "spriteId": read_u8(base + 0x04),
            "graphicsId": read_u8(base + 0x05),
            "x": read_s16(base + 0x10),
            "y": read_s16(base + 0x12),
            "facing": DIR_NAMES.get(face_move & 0xF, "?"),
            "movementActionId": read_u8(base + 0x1C),
        }

    player_id = read_u8(PLAYER_AVATAR + 0x05)
    player_sprite_id = read_u8(PLAYER_AVATAR + 0x04)

    segments = request["trace"]["segments"]
    ticks_out = []
    tick = 0

    def maybe_record():
        if START_TICK <= tick <= END_TICK:
            events = [object_event_state(i) for i in range(16)]
            woman = [e for e in events if e["graphicsId"] == WOMAN_GFX_ID and e["active"]]
            woman_sprites = [sprite_state(e["spriteId"]) for e in woman]
            player_event = next((e for e in events if e["slot"] == player_id), None)
            player_sprite = sprite_state(player_sprite_id)
            rgb = oracle.screen_rgb()
            png_path = PNG_DIR / f"f{tick:05d}.png"
            from PIL import Image as PILImage

            PILImage.frombytes("RGB", (240, 160), rgb).save(png_path)
            ticks_out.append(
                {
                    "tick": tick,
                    "png": png_path.name,
                    "woman": woman,
                    "womanSprites": woman_sprites,
                    "player": player_event,
                    "playerSprite": player_sprite,
                    "bg1hofs": read_u16(REG_BG1HOFS),
                    "bg1vofs": read_u16(REG_BG1VOFS),
                }
            )

    maybe_record()
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            maybe_record()
        if tick > END_TICK:
            break

    OUTPUT_PATH.write_text(json.dumps({"ticks": ticks_out, "finalTick": tick}, indent=0))


main()
