#!/usr/bin/env python3
"""Dense Scene-ON RAM/OAM/palette/RGB receipt for MOVE_MEGA_KICK.

This probe isolates the source-owned pointer range from `Move_MEGA_KICK`
(0x082ca227) through `Move_COMET_PUNCH` (0x082ca2c3), then retains every
source frame through the first inactive cleanup. It deliberately records raw
RGB alongside RAM state instead of treating source commands as display facts:
the promotion round must measure each display latch from these receipts.

Run it through the validated wrapper, never directly:
  python3 tools/run-mgba-probe.py <out.json> -- \
    python3 tools/compare/megaKickProbe.py <scenario.json> <out.json> <rgb-dir>
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(
        "usage: megaKickProbe.py <scenario.json> <output.json> <rgb-dir>"
    )

SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
MOVE_ID = 25
SCRIPT_BOUNDS = {
    "Move_MEGA_KICK": 0x082CA227,
    "Move_COMET_PUNCH": 0x082CA2C3,
}
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(
    path for path in (ROOT, *ROOT.parents)
    if (path / "oracle" / "emerald_core.py").is_file()
)
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba",
        reference / "pokeemerald.map",
        HARNESS / "oracle" / "bootstrap" / "factory.json",
    )
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    RGB_DIR.mkdir(parents=True, exist_ok=True)

    nm = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    names = {
        line.split()[2]: int(line.split()[0], 16)
        for line in nm.splitlines()
        if len(line.split()) == 3
    }
    if (
        names.get("Move_MEGA_KICK") != SCRIPT_BOUNDS["Move_MEGA_KICK"]
        or names.get("Move_COMET_PUNCH") != SCRIPT_BOUNDS["Move_COMET_PUNCH"]
    ):
        raise RuntimeError("MOVE_MEGA_KICK pointer-isolation contract changed")

    sprites = oracle.symbols["gSprites"]
    matrices = oracle.symbols["gOamMatrices"]
    tasks = oracle.symbols["gTasks"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    faded = oracle.symbols["gPlttBufferFaded"]
    unfaded = names["gPlttBufferUnfaded"]
    palette_tags = names["sSpritePaletteTags"]
    tile_tags = names["sSpriteTileRangeTags"]
    software_oam = names["gMain"] + 0x38
    anim_script_active = names["gAnimScriptActive"]
    script_ptr = 0x020383F0  # static sBattleAnimScriptPtr
    anim_attacker = oracle.symbols["gBattleAnimAttacker"]
    anim_target = oracle.symbols["gBattleAnimTarget"]
    visual_task_count = oracle.symbols["gAnimVisualTaskCount"]
    sound_task_count = oracle.symbols["gAnimSoundTaskCount"]
    se1_info, se1_tracks = oracle.symbols["gMPlayInfo_SE1"], oracle.symbols["gMPlayTrack_SE1"]
    song_table = oracle.symbols["gSongTable"]
    bg_positions = {name: names[name] for name in (
        "gBattle_BG0_X", "gBattle_BG0_Y", "gBattle_BG1_X", "gBattle_BG1_Y",
        "gBattle_BG2_X", "gBattle_BG2_Y", "gBattle_BG3_X", "gBattle_BG3_Y",
    )}
    template_names = (
        "gMegaPunchKickSpriteTemplate",
        "gBasicHitSplatSpriteTemplate",
        "gComplexPaletteBlendSpriteTemplate",
    )
    templates = {name: names[name] for name in template_names}
    task_names = (
        "AnimTask_ShakeMon2",
        "AnimTask_ShakeMon2_Step",
        "AnimTask_BlendBattleAnimPal",
        "AnimTask_IsContest",
        "AnimTask_IsTargetPlayerSide",
    )
    task_funcs = {name: names[name] | 1 for name in task_names}
    callback_names = (
        "AnimSpinningKickOrPunch",
        "AnimSpinningKickOrPunchFinish",
        "AnimHitSplatBasic",
        "AnimComplexPaletteBlend",
        "AnimComplexPaletteBlend_Step1",
        "AnimComplexPaletteBlend_Step2",
        "DestroyAnimSprite",
        "DestroySpriteAndMatrix",
    )
    callbacks = {name: names[name] | 1 for name in callback_names}

    def u16(address: int) -> int:
        return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value

    def raw(address: int, size: int) -> str:
        return bytes(oracle.read_u8(address + index) for index in range(size)).hex()

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 0x1F
        matrix = matrices + matrix_num * 8
        hardware_matrix = 0x07000006 + matrix_num * 0x20
        return {
            "slot": slot,
            "attr0": u16(base), "attr1": u16(base + 2), "attr2": u16(base + 4),
            "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "template": oracle.read_u32(base + 0x14),
            "callback": oracle.read_u32(base + 0x1C),
            "subpriority": oracle.read_u8(base + 0x43),
            "invisible": bool(oracle.read_u8(base + 0x3E) & 4),
            "hFlip": bool(oracle.read_u8(base + 0x3F) & 1),
            "animNum": oracle.read_u8(base + 0x2A),
            "animCmdIndex": oracle.read_u8(base + 0x2B),
            "animDelayCounter": oracle.read_u8(base + 0x2C) & 0x3F,
            "matrixNum": matrix_num,
            "matrix": {
                "a": s16(matrix), "b": s16(matrix + 2),
                "c": s16(matrix + 4), "d": s16(matrix + 6),
            },
            "hardwareMatrix": {
                "a": s16(hardware_matrix), "b": s16(hardware_matrix + 8),
                "c": s16(hardware_matrix + 16), "d": s16(hardware_matrix + 24),
            },
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def battler(index: int) -> dict:
        return sprite(oracle.read_u8(battler_ids + index))

    def active_tasks() -> list[dict]:
        return [
            {
                "slot": slot,
                "func": oracle.read_u32(tasks + slot * 0x28),
                "data": [s16(tasks + slot * 0x28 + 8 + index * 2) for index in range(16)],
            }
            for slot in range(16)
            if oracle.read_u8(tasks + slot * 0x28 + 4)
        ]

    def move_sprites() -> dict[str, list[dict]]:
        grouped = {name: [] for name in template_names}
        grouped["watchedCallbacks"] = []
        for slot in range(64):
            if oracle.read_u8(sprites + slot * 0x44 + 0x3E) & 1 == 0:
                continue
            item = sprite(slot)
            for name, template in templates.items():
                if item["template"] == template:
                    grouped[name].append(item)
                    break
            else:
                if item["callback"] in callbacks.values():
                    grouped["watchedCallbacks"].append(item)
        return grouped

    def sound_player() -> dict:
        return {
            "songHeader": oracle.read_u32(se1_info),
            "status": oracle.read_u32(se1_info + 4),
            "tracks": [
                {
                    "flags": oracle.read_u8(se1_tracks + index * 0x50),
                    "pan": s8(se1_tracks + index * 0x50 + 0x14),
                    "panX": s8(se1_tracks + index * 0x50 + 0x15),
                }
                for index in range(3)
            ],
        }

    rows: list[dict] = []
    started = False
    complete = False
    observed_move_pointers: set[int] = set()

    def capture(frame: int) -> None:
        nonlocal started, complete
        snapshot = lab.snapshot()
        pointer = oracle.read_u32(script_ptr)
        active = bool(oracle.read_u8(anim_script_active))
        if snapshot["engine"]["currentMove"] == MOVE_ID:
            observed_move_pointers.add(pointer)
        if not started:
            in_source = (
                active
                and SCRIPT_BOUNDS["Move_MEGA_KICK"] <= pointer
                < SCRIPT_BOUNDS["Move_COMET_PUNCH"]
            )
            if snapshot["engine"]["currentMove"] != MOVE_ID or not in_source:
                return
            started = True
        if complete:
            return

        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({
            "frame": frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "scriptPtr": pointer,
            "animScriptActive": active,
            "battleAnimAttacker": oracle.read_u8(anim_attacker),
            "battleAnimTarget": oracle.read_u8(anim_target),
            "player": snapshot["battlers"]["player"],
            "opponent": snapshot["battlers"]["opponent"],
            "playerSprite": battler(0),
            "opponentSprite": battler(1),
            "tasks": active_tasks(),
            "moveSprites": move_sprites(),
            "fadedPalette": [u16(faded + index * 2) for index in range(512)],
            "unfadedPalette": [u16(unfaded + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
            "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
            "softwareOam": [raw(software_oam + index * 8, 8) for index in range(128)],
            "hardwareOam": [
                [u16(0x07000000 + index * 8 + offset) for offset in (0, 2, 4)]
                for index in range(128)
            ],
            "hardwareMatrices": [
                [s16(0x07000006 + index * 0x20 + offset) for offset in (0, 8, 16, 24)]
                for index in range(32)
            ],
            "visualTaskCount": oracle.read_u8(visual_task_count),
            "soundTaskCount": oracle.read_u8(sound_task_count),
            "se1": sound_player(),
            "registers": {
                "dispcnt": u16(0x04000000),
                "bldcnt": u16(0x04000050),
                "bldalpha": u16(0x04000052),
                "bldy": u16(0x04000054),
            },
            "backgroundPositions": {
                name: s16(address) for name, address in bg_positions.items()
            },
        })
        if not active:
            complete = True

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)

    if not rows:
        raise RuntimeError(
            "MOVE_MEGA_KICK pointer body was not observed; pointers="
            + str([hex(pointer) for pointer in sorted(observed_move_pointers)])
        )
    if not complete:
        raise RuntimeError("MOVE_MEGA_KICK first inactive cleanup was not captured")
    OUTPUT.write_text(json.dumps({
        "schema": "mega-kick-dense-evidence/v1",
        "moveId": MOVE_ID,
        "setup": setup,
        "scriptBounds": SCRIPT_BOUNDS,
        "templates": templates,
        "taskFuncs": task_funcs,
        "callbacks": callbacks,
        "songHeaders": {
            "SE_M_MEGA_KICK": oracle.read_u32(song_table + 140 * 8),
            "SE_M_MEGA_KICK2": oracle.read_u32(song_table + 141 * 8),
        },
        "sourceWindow": {
            "startFrame": rows[0]["frame"],
            "endFrame": rows[-1]["frame"],
            "frameCount": len(rows),
        },
        "frames": rows,
    }, separators=(",", ":")) + "\n")
    print(
        f"wrote {OUTPUT}: {len(rows)} pointer-isolated source frames "
        f"{rows[0]['frame']}..{rows[-1]['frame']}"
    )


if __name__ == "__main__":
    main()
