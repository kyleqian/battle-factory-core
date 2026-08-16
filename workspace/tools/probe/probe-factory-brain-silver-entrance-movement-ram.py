#!/usr/bin/env python3
"""RAM ground truth for the B1b honest residual: the Frontier-Brain
BattleRoom-entrance `brainMoving` window's Noland/decoy walk + camera pan
cadence (`docs/noland-silver-walkup-presentation-map.md` §2 row 6, frames
961-1112 of the silver walkup fixture set; `battleRoom.ts`'s own
"Walk-up build step B1b" module doc, search that string).

Reads, at every frame of the SAME `factory-brain-silver-walkup-03-movement-
and-speech-open-dense-off.json` scenario the committed dense-compare fixture
already uses: `gTotalCameraPixelOffsetY` (field_camera.c, u16) and, for both
Noland (`LOCALID_FACTORY_BATTLE_OPPONENT` = 2) and the decoy
(`LOCALID_FACTORY_BATTLE_PLAYER` = 8) in `MAP_BATTLE_FRONTIER_BATTLE_FACTORY_
BATTLE_ROOM` (mapGroup 26 / mapNum 33): the owning `gObjectEvents[]` slot's
`spriteId`, and that sprite's raw `gSprites[].x/y` (screen-space per this
codebase's own established convention, `battleRoomRender.ts`'s decoy-position
doc), `animNum`/`animCmdIndex`, and the `hFlip`/`coordOffsetEnabled` bits
(struct Sprite, include/sprite.h:194-242 - offsets already used by this run's
existing `battleRoom.ts` module doc point/S6 slice 2a derivation).

**B1c mid-ramp OAM-latch probe (walk-up step B1c, entrance-03 162/256
residual):** also reads `gSpriteCoordOffsetX/Y` (field_camera.c
`UpdateCameraPanning`: `gTotalCameraPixelOffsetY - sVerticalCameraPan - 8` -
`sVerticalCameraPan` itself is file-static/unreadable by symbol name, but is
recoverable per-frame as `gTotalCameraPixelOffsetY - gSpriteCoordOffsetY - 8`)
and each tracked sprite's **actual hardware-visible OAM y/x**
(`sprite->oam.y`/`sprite->oam.x`, struct OamData bitfields at the sprite's
own +0x00/+0x02 - `BuildOamBuffer`/`UpdateOamCoords`, src/sprite.c:322-352 -
this is `sprite->x + sprite->x2 + centerToCornerVecX (+ gSpriteCoordOffsetX
if coordOffsetEnabled)`, truncated to the OAM hardware's 8-bit(y)/9-bit(x)
field width - the value actually DMA'd to hardware OAM and shown on screen,
as opposed to `sprite->x/y` which is the pre-offset logical position already
read above) plus `x2`/`y2`/`centerToCornerVecX/Y` (the other terms
`UpdateOamCoords` sums in) - together enough to reconstruct, per frame,
whether the RENDERED oam.y matches `sprite.y + y2 + centerToCornerVecY +
gSpriteCoordOffsetY` computed from THIS SAME frame's reads, or lags by a
tick (`sprite.c`'s own `BuildOamBuffer` runs once per main-loop iteration,
same iteration as `CameraUpdate`/`UpdateCameraPanning`, so a same-frame
mismatch here would indicate emulator-snapshot read-ordering rather than a
genuine game-side latch - see probe findings in `battleRoom.ts`'s module doc).

Run via `python3 tools/run-mgba-probe.py <fresh-output.json> --
tools/probe/probe-factory-brain-silver-entrance-movement-ram.py <fresh-output.json>`.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit(f"usage: {sys.argv[0]} <fresh-output.json>")

OUTPUT_PATH = Path(sys.argv[1])
HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE / "pokeemerald.gba"
MAP_PATH = REFERENCE / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

OBJECT_EVENTS_COUNT = 16
OBJECT_EVENT_SIZE = 0x24
OBJECT_EVENT_SPRITE_ID = 0x04
OBJECT_EVENT_LOCAL_ID = 0x08
OBJECT_EVENT_MAP_NUM = 0x09
OBJECT_EVENT_MAP_GROUP = 0x0A
OBJECT_EVENT_CURRENT_COORDS = 0x10

SPRITE_SIZE = 0x44
SPRITE_OAM_ATTR0 = 0x00  # struct OamData.y: bits 0-7
SPRITE_OAM_ATTR1 = 0x02  # struct OamData.x: bits 0-8
SPRITE_X = 0x20
SPRITE_Y = 0x22
SPRITE_X2 = 0x24
SPRITE_Y2 = 0x26
SPRITE_CENTER_TO_CORNER_VEC_X = 0x28
SPRITE_CENTER_TO_CORNER_VEC_Y = 0x29
SPRITE_ANIM_NUM = 0x2A
SPRITE_ANIM_CMD_INDEX = 0x2B
SPRITE_FLAGS_3F = 0x3F  # hFlip bit0

MAP_GROUP_FACTORY = 26
MAP_NUM_BATTLE_ROOM = 33

LOCALID_FACTORY_BATTLE_OPPONENT = 2  # Noland
LOCALID_FACTORY_BATTLE_PLAYER = 8  # decoy


def s16(v: int) -> int:
    return v - 0x10000 if v >= 0x8000 else v


def s8(v: int) -> int:
    return v - 0x100 if v >= 0x80 else v


class InstrumentedLab(BattleLab):
    def snapshot(self) -> dict:
        base = super().snapshot()
        oracle = self.oracle
        obj_events_addr = oracle.symbols["gObjectEvents"]
        sprites_addr = oracle.symbols["gSprites"]

        found = {}
        for i in range(OBJECT_EVENTS_COUNT):
            slot = obj_events_addr + i * OBJECT_EVENT_SIZE
            flags0 = oracle.read_u8(slot)
            active = flags0 & 1
            if not active:
                continue
            local_id = oracle.read_u8(slot + OBJECT_EVENT_LOCAL_ID)
            map_num = oracle.read_u8(slot + OBJECT_EVENT_MAP_NUM)
            map_group = oracle.read_u8(slot + OBJECT_EVENT_MAP_GROUP)
            if map_group != MAP_GROUP_FACTORY or map_num != MAP_NUM_BATTLE_ROOM:
                continue
            if local_id not in (LOCALID_FACTORY_BATTLE_OPPONENT, LOCALID_FACTORY_BATTLE_PLAYER):
                continue
            sprite_id = oracle.read_u8(slot + OBJECT_EVENT_SPRITE_ID)
            cx = s16(oracle.read_u16(slot + OBJECT_EVENT_CURRENT_COORDS))
            cy = s16(oracle.read_u16(slot + OBJECT_EVENT_CURRENT_COORDS + 2))
            sprite_addr = sprites_addr + sprite_id * SPRITE_SIZE
            sx = s16(oracle.read_u16(sprite_addr + SPRITE_X))
            sy = s16(oracle.read_u16(sprite_addr + SPRITE_Y))
            x2 = s16(oracle.read_u16(sprite_addr + SPRITE_X2))
            y2 = s16(oracle.read_u16(sprite_addr + SPRITE_Y2))
            center_to_corner_x = s8(oracle.read_u8(sprite_addr + SPRITE_CENTER_TO_CORNER_VEC_X))
            center_to_corner_y = s8(oracle.read_u8(sprite_addr + SPRITE_CENTER_TO_CORNER_VEC_Y))
            oam_attr0 = oracle.read_u16(sprite_addr + SPRITE_OAM_ATTR0)
            oam_attr1 = oracle.read_u16(sprite_addr + SPRITE_OAM_ATTR1)
            anim_num = oracle.read_u8(sprite_addr + SPRITE_ANIM_NUM)
            anim_cmd_index = oracle.read_u8(sprite_addr + SPRITE_ANIM_CMD_INDEX)
            flags_3f = oracle.read_u8(sprite_addr + SPRITE_FLAGS_3F)
            flags_3e = oracle.read_u8(sprite_addr + SPRITE_FLAGS_3F - 1)
            found[local_id] = {
                "spriteId": sprite_id,
                "currentCoords": [cx, cy],
                "spriteX": sx,
                "spriteY": sy,
                "x2": x2,
                "y2": y2,
                "centerToCornerVecX": center_to_corner_x,
                "centerToCornerVecY": center_to_corner_y,
                # struct OamData: attr0 bits0-7 = y (8-bit hardware field, wraps
                # mod 256 - this IS the value BuildOamBuffer/UpdateOamCoords
                # last wrote, i.e. what's actually latched to hardware OAM).
                "oamY": oam_attr0 & 0xFF,
                # attr1 bits0-8 = x (9-bit hardware field).
                "oamX": oam_attr1 & 0x1FF,
                "animNum": anim_num,
                "animCmdIndex": anim_cmd_index,
                "hFlip": bool(flags_3f & 1),
                "vFlip": bool(flags_3f & 2),
                "coordOffsetEnabled": bool(flags_3e & 2),
                "invisible": bool(flags_3e & 4),
            }

        cam_pan_y = oracle.read_u16(oracle.symbols["gTotalCameraPixelOffsetY"])
        sprite_coord_offset_y = s16(oracle.read_u16(oracle.symbols["gSpriteCoordOffsetY"]))
        base["movement"] = {
            "camPanY": cam_pan_y,
            "spriteCoordOffsetX": s16(oracle.read_u16(oracle.symbols["gSpriteCoordOffsetX"])),
            "spriteCoordOffsetY": sprite_coord_offset_y,
            # sVerticalCameraPan is file-static in field_camera.c (no linker
            # symbol) but is recoverable exactly from UpdateCameraPanning's
            # own formula (gSpriteCoordOffsetY = gTotalCameraPixelOffsetY -
            # sVerticalCameraPan - 8) using the two fields read above.
            "verticalCameraPan": cam_pan_y - sprite_coord_offset_y - 8,
            "noland": found.get(LOCALID_FACTORY_BATTLE_OPPONENT),
            "decoy": found.get(LOCALID_FACTORY_BATTLE_PLAYER),
        }
        return base


def main() -> None:
    scenario = json.loads(
        (WORKTREE_ROOT / "tools" / "battle-lab" / "factory-brain-silver-walkup-03-movement-and-speech-open-dense-off.json").read_text()
    )
    # Same frame list the committed fixture uses (896-1151) - covers the
    # msgbox-close tail, the whole brainMoving window, and the speech onset.
    profile = scenario.get("profile", "battle-scene-off")

    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    request = validate_request(scenario, profile)
    if len(request["preCheckpointCaptureFrames"]) > 256:
        raise AssertionError(
            f"requested {len(request['preCheckpointCaptureFrames'])} capture frames, over the 256 cap"
        )

    lab = InstrumentedLab(oracle, profile)
    setup = lab.prepare(request)

    rows = []
    for capture in setup["preCheckpointCaptures"]:
        m = capture["state"]["movement"]
        rows.append({
            "frame": capture["frame"],
            "sha256": capture["sha256"],
            "camPanY": m["camPanY"],
            "spriteCoordOffsetX": m["spriteCoordOffsetX"],
            "spriteCoordOffsetY": m["spriteCoordOffsetY"],
            "verticalCameraPan": m["verticalCameraPan"],
            "noland": m["noland"],
            "decoy": m["decoy"],
        })

    output = {
        "schema": "factory-brain-silver-entrance-movement-ram-off/v1",
        "oracleProfile": profile,
        "sourceScenario": "tools/battle-lab/factory-brain-silver-walkup-03-movement-and-speech-open-dense-off.json",
        "requestedCaptureFrames": request["preCheckpointCaptureFrames"],
        "rows": rows,
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, default=str) + "\n")


main()
