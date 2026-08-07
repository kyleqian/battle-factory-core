#!/usr/bin/env python3
"""Dense MOVE_TORMENT source-component evidence for legal Scene-ON fixtures.

Captures the complete `Move_TORMENT` owned window (isolated by script pointer
against the ELF label bounds `Move_TORMENT`..`Move_MEMENTO` through the first
inactive cleanup) and everything the source touches: the
`AnimTask_TormentAttacker`/`TormentAttacker_Step` lifecycle with all 16 data
words, EVERY thought-bubble sprite (slot, template, callback, x/y/x2/y2,
subpriority, attr0/attr1/attr2, matrixNum, hFlip, data[0..7]) plus the target's
anger marks (`gAngerMarkSpriteTemplate`) and the `AnimTask_BlendMonInAndOut`
palette-blend task, the attacker's own matrix + y2 + attr words,
BLDCNT/BLDALPHA/BLDY, hardware OAM/matrices, and per-frame raw RGB.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) not in (4, 5):
    raise SystemExit("usage: tormentProbe.py <scenario> <output.json> <rgb-dir> [move-id]")
SCENARIO, OUTPUT, RGB_DIR = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
MOVE_ID = int(sys.argv[4]) if len(sys.argv) == 5 else 259
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
        ["arm-none-eabi-nm", str(reference / "pokeemerald.elf")],
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
        "AnimTask_TormentAttacker", "TormentAttacker_Step",
        "AnimTask_BlendMonInAndOut", "AnimTask_BlendMonInAndOut_Step",
    )
    task_funcs = {symbols[name] for name in task_names}
    # Function symbols carry the thumb bit (|1); the sprite-template pointers
    # and affine-anim pointer are DATA addresses and must stay unset.
    bubble_template = symbols["gThoughtBubbleSpriteTemplate"] & ~1
    anger_template = symbols["gAngerMarkSpriteTemplate"] & ~1
    torment_callback = symbols["TormentAttacker_Callback"]
    palette_tags = symbols["sSpritePaletteTags"] & ~1
    tile_tags = symbols["sSpriteTileRangeTags"] & ~1
    software_oam = symbols["gMain"] + 0x38
    script_bounds = {
        name: int(addr, 16)
        for name, addr in (
            ("Move_TORMENT", "082cdcae"),
            ("Move_MEMENTO", "082cdcf2"),
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

    def active_tasks() -> list[dict]:
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

    def move_sprites() -> list[dict]:
        result = []
        for slot in range(64):
            base = sprites + slot * 0x44
            template = oracle.read_u32(base + 0x14)
            if template not in (bubble_template, anger_template):
                continue
            result.append(sprite(slot))
        return result

    rows = []
    stopped = False

    def capture(frame: int) -> None:
        nonlocal stopped
        if stopped:
            return
        snap = lab.snapshot()
        if snap["engine"]["currentMove"] != MOVE_ID:
            return
        live_script_ptr = oracle.read_u32(script_ptr)
        if not (
            script_bounds["Move_TORMENT"]
            <= live_script_ptr
            < script_bounds["Move_MEMENTO"]
        ):
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
            "tasks": active_tasks(),
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
        # The accepted window is the move script's own first frame through
        # its first inactive cleanup frame only - never the effect/damage
        # phase that follows (the script pointer still points at the move
        # while the damage text/HP drain run).
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
        raise RuntimeError("MOVE_TORMENT body was not observed")
    OUTPUT.write_text(json.dumps({
        "schema": "torment-dense-evidence/v1",
        "setup": setup,
        "taskFuncs": {name: symbols[name] for name in task_names},
        "bubbleTemplate": bubble_template,
        "angerTemplate": anger_template,
        "tormentCallback": torment_callback,
        "scriptBounds": script_bounds,
        "songHeaders": {
            "SE_M_METRONOME": oracle.read_u32(song_table + 186 * 8),
            "SE_M_SWAGGER2": oracle.read_u32(song_table + 194 * 8),
        },
        "frames": rows,
    }) + "\n")
    print(
        f"wrote {OUTPUT} ({len(rows)} move frames; "
        f"{rows[0]['frame'] if rows else '-'}..{rows[-1]['frame'] if rows else '-'})"
    )


main()
