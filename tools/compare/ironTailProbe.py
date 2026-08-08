#!/usr/bin/env python3
"""Dense MOVE_IRON_TAIL source-component evidence for legal Scene-ON fixtures.

Captures the complete `Move_IRON_TAIL` owned window (isolated by script pointer
against the ELF label bounds `Move_IRON_TAIL`..`Move_POISON_TAIL` through the
first inactive cleanup) and everything the source touches: the
`AnimTask_MetallicShine`/`AnimTask_MetallicShine_Step` task lifecycle with all
16 data words and the `permanent` flag (IRON_TAIL uses `permanent=TRUE`), the
`Task_LoopAndPlaySE` looped-sound task, the `AnimTask_ShakeMon` target-shake
task, the `gHorizontalLungeSpriteTemplate` lunge sprite (created with
`createsprite ... 4, 4`) and the `gBasicHitSplatSpriteTemplate` hitsplat sprite
(`animation=2`), both battlers' own sprite fields and matrices,
BLDCNT/BLDALPHA/BLDY, all 512 faded/unfaded/hardware palette entries, hardware
OAM and matrices, and per-frame raw RGB.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) not in (5, 6):
    raise SystemExit(
        "usage: ironTailProbe.py <scenario> <output.json> <rgb-dir> [move-id] [skip-first-frames]"
    )
SCENARIO, OUTPUT, RGB_DIR = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
MOVE_ID = int(sys.argv[4]) if len(sys.argv) >= 5 else 231
SKIP_FIRST = int(sys.argv[5]) if len(sys.argv) == 6 else 0
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

    sprites, matrices, tasks = (
        oracle.symbols["gSprites"],
        oracle.symbols["gOamMatrices"],
        oracle.symbols["gTasks"],
    )
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    faded, unfaded = oracle.symbols["gPlttBufferFaded"], oracle.symbols["gPlttBufferUnfaded"]
    se1_info, se1_tracks = oracle.symbols["gMPlayInfo_SE1"], oracle.symbols["gMPlayTrack_SE1"]
    song_table = oracle.symbols["gSongTable"]
    visual_task_count = oracle.symbols["gAnimVisualTaskCount"]
    sound_task_count = oracle.symbols["gAnimSoundTaskCount"]
    anim_script_active = oracle.symbols["gAnimScriptActive"]
    script_ptr = 0x020383F0  # sBattleAnimScriptPtr (static)

    nm = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    symbols = {
        line.split()[2]: int(line.split()[0], 16) | 1
        for line in nm.splitlines()
        if len(line.split()) == 3
    }
    task_names = (
        "AnimTask_MetallicShine", "AnimTask_MetallicShine_Step",
        "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
        "Task_LoopAndPlaySE",
    )
    task_funcs = {symbols[name] for name in task_names}
    lunge_template = symbols["gHorizontalLungeSpriteTemplate"] & ~1
    hitsplat_template = symbols["gBasicHitSplatSpriteTemplate"] & ~1
    watched_callbacks = {
        symbols[name]
        for name in (
            "DoHorizontalLunge", "AnimHitSplatBasic",
            "RunStoredCallbackWhenAnimEnds", "DestroyAnimSprite",
        )
    }
    palette_tags = symbols["sSpritePaletteTags"] & ~1
    tile_tags = symbols["sSpriteTileRangeTags"] & ~1
    software_oam = symbols["gMain"] + 0x38
    script_bounds = {
        name: int(addr, 16)
        for name, addr in (
            ("Move_IRON_TAIL", "082d342c"),
            ("Move_POISON_TAIL", "082d348a"),
        )
    }

    def u16(address: int) -> int:
        return oracle.read_u8(address) | (oracle.read_u8(address + 1) << 8)

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value

    def raw(address: int, count: int) -> str:
        return bytes(oracle.read_u8(address + index) for index in range(count)).hex()

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 0x1f
        matrix = matrices + matrix_num * 8
        hw_matrix = 0x07000006 + matrix_num * 0x20
        return {
            "slot": slot,
            "attr0": u16(base),
            "attr1": u16(base + 2),
            "attr2": u16(base + 4),
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "template": oracle.read_u32(base + 0x14),
            "callback": oracle.read_u32(base + 0x1c),
            "subpriority": oracle.read_u8(base + 0x43),
            "hFlip": bool(oracle.read_u8(base + 0x3f) & 1),
            # struct Sprite (reference/pokeemerald/include/sprite.h):
            # animNum 0x2a, animCmdIndex 0x2b, animDelayCounter 0x2c.
            # These read 0x18/0x19/0x1a until 2026-08-07 — that is
            # subspriteTables, i.e. pointer bytes, not animation state.
            "animNum": oracle.read_u8(base + 0x2a),
            "animCmdIndex": oracle.read_u8(base + 0x2b),
            "animDelayCounter": oracle.read_u8(base + 0x2c),
            "matrixNum": matrix_num,
            "matrix": {
                "a": s16(matrix),
                "b": s16(matrix + 2),
                "c": s16(matrix + 4),
                "d": s16(matrix + 6),
            },
            "hardwareMatrix": {
                "a": s16(hw_matrix),
                "b": s16(hw_matrix + 8),
                "c": s16(hw_matrix + 16),
                "d": s16(hw_matrix + 24),
            },
            "data": [s16(base + 0x2e + index * 2) for index in range(8)],
        }

    def battler(index: int) -> dict:
        return sprite(oracle.read_u8(battler_ids + index))

    def move_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4) == 0:
                continue
            func = oracle.read_u32(base)
            if func in task_funcs:
                result.append({
                    "slot": slot,
                    "func": func,
                    "data": [s16(base + 8 + index * 2) for index in range(16)],
                })
        return result

    def all_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4) == 0:
                continue
            result.append({
                "slot": slot,
                "func": oracle.read_u32(base),
                "data": [s16(base + 8 + index * 2) for index in range(16)],
            })
        return result

    def move_sprites() -> list[dict]:
        result = []
        for slot in range(64):
            base = sprites + slot * 0x44
            template = oracle.read_u32(base + 0x14)
            callback = oracle.read_u32(base + 0x1c)
            if template in (lunge_template, hitsplat_template):
                result.append(sprite(slot))
            elif callback in watched_callbacks:
                result.append(sprite(slot))
        return result

    rows = []
    stopped = False
    in_bounds_count = 0

    def capture(frame: int) -> None:
        nonlocal stopped, in_bounds_count
        if stopped:
            return
        snap = lab.snapshot()
        if snap["engine"]["currentMove"] != MOVE_ID:
            return
        live_script_ptr = oracle.read_u32(script_ptr)
        if not (
            script_bounds["Move_IRON_TAIL"]
            <= live_script_ptr
            < script_bounds["Move_POISON_TAIL"]
        ):
            return
        in_bounds_count += 1
        if in_bounds_count <= SKIP_FIRST:
            return
        anim_active = bool(oracle.read_u8(anim_script_active))
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({
            "frame": frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "player": snap["battlers"]["player"],
            "opponent": snap["battlers"]["opponent"],
            "playerSprite": battler(0),
            "opponentSprite": battler(1),
            "tasks": move_tasks(),
            "allTasks": all_tasks(),
            "moveSprites": move_sprites(),
            "fadedPalette": [u16(faded + index * 2) for index in range(512)],
            "unfadedPalette": [u16(unfaded + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
            "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
            "softwareOam": [raw(software_oam + index * 8, 8) for index in range(128)],
            "hardwareOam": [
                [u16(0x07000000 + index * 8 + j) for j in (0, 2, 4)]
                for index in range(128)
            ],
            "hardwareMatrices": [
                [s16(0x07000006 + index * 0x20 + j) for j in (0, 8, 16, 24)]
                for index in range(32)
            ],
            "visualTaskCount": oracle.read_u8(visual_task_count),
            "soundTaskCount": oracle.read_u8(sound_task_count),
            "animScriptActive": anim_active,
            "inMoveScript": True,
            "se1": {
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
            },
            "dispcnt": u16(0x04000000),
            "bldcnt": u16(0x04000050),
            "bldalpha": u16(0x04000052),
            "bldy": u16(0x04000054),
        })
        if not anim_active:
            stopped = True

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)

    if not rows:
        raise RuntimeError("MOVE_IRON_TAIL body was not observed")
    OUTPUT.write_text(json.dumps({
        "schema": "iron-tail-dense-evidence/v1",
        "setup": setup,
        "taskFuncs": {name: symbols[name] for name in task_names},
        "lungeTemplate": lunge_template,
        "hitsplatTemplate": hitsplat_template,
        "scriptBounds": script_bounds,
        "songHeaders": {
            "SE_M_HARDEN": oracle.read_u32(song_table + 120 * 8),
            "SE_M_VITAL_THROW2": oracle.read_u32(song_table + 123 * 8),
        },
        "frames": rows,
    }) + "\n")
    print(
        f"wrote {OUTPUT} ({len(rows)} move frames; "
        f"{rows[0]['frame'] if rows else '-'}..{rows[-1]['frame'] if rows else '-'})"
    )


main()
