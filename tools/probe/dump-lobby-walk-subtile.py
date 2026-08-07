#!/usr/bin/env python3
"""Dense RAM + framebuffer probe for the Lobby free-roam sub-tile camera
scroll (BLOCKER 1 of the loss-lobby-walk-off spec promotion) and the in-place
turn pose A (BLOCKER 2).

Replays a scratch lobby fixture's own trace.segments and, for every tick in a
requested window, records:

  - the actual BG1/2/3 HOFS/VOFS GPU registers (0x4000014..0x400001E) -- the
    definitive per-frame whole-field scroll (FieldUpdateBgTilemapScroll,
    field_camera.c:74-86);
  - gFieldCamera (0x3005dd0): movementSpeedX/Y (+0x08/+0x0C), x/y (+0x10/+0x14)
    -- the sub-tile camera phase (CameraUpdate, field_camera.c:360-426);
  - gCamera (0x2037334): x (+0x04), y (+0x08);
  - the player object event coords / facing / runningState / tileTransition;
  - the player sprite's gSprites entry: oam.x/y, x/y, animNum/animCmdIndex,
    hFlip, tileNum (sprite.h:194-243, sprite.c:339-359 UpdateOamCoords);
  - gSpriteCoordOffsetX/Y (0x2021bbc/0x2021bbe) and gTotalCameraPixelOffsetX/Y
    (0x3005dec/0x3005de8);
  - an RGB888 framebuffer per tick in the window (saved as PNG for
    cross-correlation + pose-A pixel evidence).

Run only through tools/run-mgba-probe.py, e.g.:
    python3 tools/run-mgba-probe.py /tmp/subtile-out.json -- \
        python3 tools/probe/dump-lobby-walk-subtile.py \
        /tmp/subtile-out.json <fixture.json> <startTick> <endTick> <pngDir>
"""

from __future__ import annotations

import io
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
PLAYER_AVATAR = 0x2037590
PA_OFF_OBJECT_EVENT_ID = 0x05
PA_OFF_RUNNING_STATE = 0x02
PA_OFF_TILE_TRANSITION_STATE = 0x03
CAMERA = 0x2037334
G_FIELD_CAMERA = 0x3005DD0
G_SPRITES = 0x2020630
G_SPRITE_STRIDE = 0x44
G_SPRITE_COORD_OFFSET_X = 0x2021BBC
G_SPRITE_COORD_OFFSET_Y = 0x2021BBE
G_TOTAL_CAMERA_PIXEL_OFFSET_X = 0x3005DEC
G_TOTAL_CAMERA_PIXEL_OFFSET_Y = 0x3005DE8
# GPU BG HOFS/VOFS registers (io_reg.h:15-22)
REG_BG1HOFS = 0x04000014
REG_BG1VOFS = 0x04000016
REG_BG2HOFS = 0x04000018
REG_BG2VOFS = 0x0400001A
REG_BG3HOFS = 0x0400001C
REG_BG3VOFS = 0x0400001E

DIR_NAMES = {0: "DOWN", 1: "UP", 2: "LEFT", 3: "RIGHT"}


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

    def read_s32(addr: int) -> int:
        v = oracle.read_u32(addr)
        return v - 0x100000000 if v & 0x80000000 else v

    player_id = read_u8(PLAYER_AVATAR + PA_OFF_OBJECT_EVENT_ID)
    obj_base = OBJECT_EVENTS + player_id * OBJ_STRIDE
    player_sprite_id = read_u8(PLAYER_AVATAR + 0x04)
    sprite_base = G_SPRITES + player_sprite_id * G_SPRITE_STRIDE

    def sprite_oam_x() -> int:
        lo = read_u8(sprite_base + 0x02)
        hi = read_u8(sprite_base + 0x03)
        return (lo | (hi << 8)) & 0x1FF

    def sprite_oam_y() -> int:
        return read_u8(sprite_base + 0x00)

    def sprite_tile_num() -> int:
        lo = read_u8(sprite_base + 0x04)
        hi = read_u8(sprite_base + 0x05)
        return (lo | (hi << 8)) & 0x3FF

    def state() -> dict:
        flags = read_u32(obj_base + 0x00)
        return {
            "objectEventId": player_id,
            "x": read_s16(obj_base + 0x10),
            "y": read_s16(obj_base + 0x12),
            "facing": DIR_NAMES.get(read_u16(obj_base + 0x18) & 0xF, "?"),
            "runningState": read_u8(PLAYER_AVATAR + PA_OFF_RUNNING_STATE),
            "tileTransition": read_u8(PLAYER_AVATAR + PA_OFF_TILE_TRANSITION_STATE),
            "camX": read_s32(CAMERA + 0x04),
            "camY": read_s32(CAMERA + 0x08),
            "fieldCamSpeedX": read_s32(G_FIELD_CAMERA + 0x08),
            "fieldCamSpeedY": read_s32(G_FIELD_CAMERA + 0x0C),
            "fieldCamX": read_s32(G_FIELD_CAMERA + 0x10),
            "fieldCamY": read_s32(G_FIELD_CAMERA + 0x14),
            "bg1hofs": read_u16(REG_BG1HOFS),
            "bg1vofs": read_u16(REG_BG1VOFS),
            "bg2hofs": read_u16(REG_BG2HOFS),
            "bg2vofs": read_u16(REG_BG2VOFS),
            "bg3hofs": read_u16(REG_BG3HOFS),
            "bg3vofs": read_u16(REG_BG3VOFS),
            "spriteOamX": sprite_oam_x(),
            "spriteOamY": sprite_oam_y(),
            "spriteX": read_s16(sprite_base + 0x20),
            "spriteY": read_s16(sprite_base + 0x22),
            "spriteTileNum": sprite_tile_num(),
            "spriteAnimNum": read_u8(sprite_base + 0x2A),
            "spriteAnimCmdIndex": read_u8(sprite_base + 0x2B),
            "spriteHFlipped": (read_u8(sprite_base + 0x3F) & 1) != 0,
            "coordOffX": read_s16(G_SPRITE_COORD_OFFSET_X),
            "coordOffY": read_s16(G_SPRITE_COORD_OFFSET_Y),
            "totalCamPixX": read_s16(G_TOTAL_CAMERA_PIXEL_OFFSET_X),
            "totalCamPixY": read_s16(G_TOTAL_CAMERA_PIXEL_OFFSET_Y),
        }

    segments = request["trace"]["segments"]
    ticks_out = []
    tick = 0

    def maybe_record():
        if START_TICK <= tick <= END_TICK:
            rgb = oracle.screen_rgb()
            png_path = PNG_DIR / f"f{tick:05d}.png"
            from PIL import Image as PILImage

            PILImage.frombytes("RGB", (240, 160), rgb).save(png_path)
            ticks_out.append({"tick": tick, "png": png_path.name, **state()})

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
