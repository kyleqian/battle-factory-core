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
SPRITE_X = 0x20
SPRITE_Y = 0x22
SPRITE_ANIM_NUM = 0x2A
SPRITE_ANIM_CMD_INDEX = 0x2B
SPRITE_FLAGS_3F = 0x3F  # hFlip bit0

MAP_GROUP_FACTORY = 26
MAP_NUM_BATTLE_ROOM = 33

LOCALID_FACTORY_BATTLE_OPPONENT = 2  # Noland
LOCALID_FACTORY_BATTLE_PLAYER = 8  # decoy


def s16(v: int) -> int:
    return v - 0x10000 if v >= 0x8000 else v


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
            anim_num = oracle.read_u8(sprite_addr + SPRITE_ANIM_NUM)
            anim_cmd_index = oracle.read_u8(sprite_addr + SPRITE_ANIM_CMD_INDEX)
            flags_3f = oracle.read_u8(sprite_addr + SPRITE_FLAGS_3F)
            flags_3e = oracle.read_u8(sprite_addr + SPRITE_FLAGS_3F - 1)
            found[local_id] = {
                "spriteId": sprite_id,
                "currentCoords": [cx, cy],
                "spriteX": sx,
                "spriteY": sy,
                "animNum": anim_num,
                "animCmdIndex": anim_cmd_index,
                "hFlip": bool(flags_3f & 1),
                "vFlip": bool(flags_3f & 2),
                "coordOffsetEnabled": bool(flags_3e & 2),
                "invisible": bool(flags_3e & 4),
            }

        base["movement"] = {
            "camPanY": oracle.read_u16(oracle.symbols["gTotalCameraPixelOffsetY"]),
            "spriteCoordOffsetX": s16(oracle.read_u16(oracle.symbols["gSpriteCoordOffsetX"])),
            "spriteCoordOffsetY": s16(oracle.read_u16(oracle.symbols["gSpriteCoordOffsetY"])),
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
