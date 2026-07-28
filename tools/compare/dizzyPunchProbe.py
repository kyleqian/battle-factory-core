#!/usr/bin/env python3
"""Dense software/hardware/audio/RGB evidence for legal Scene-ON DIZZY_PUNCH."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(
        "usage: dizzyPunchProbe.py <scenario.json> <output.json> <rgb-dir>"
    )

SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(
    path
    for path in (ROOT, *ROOT.parents)
    if (path / "oracle" / "emerald_core.py").is_file()
)
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_DIZZY_PUNCH = 146


def main() -> None:
    request = validate_request(
        json.loads(SCENARIO.read_text()), "battle-scene-on"
    )
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba",
        reference / "pokeemerald.map",
        HARNESS / "oracle" / "bootstrap" / "factory.json",
    )
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    RGB_DIR.mkdir(parents=True)

    nm = subprocess.run(
        ["arm-none-eabi-nm", str(reference / "pokeemerald.elf")],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    elf_symbols = {
        parts[2]: int(parts[0], 16) | 1
        for line in nm.splitlines()
        if len(parts := line.split()) == 3
    }
    template_names = (
        "gHorizontalLungeSpriteTemplate",
        "gFistFootSpriteTemplate",
        "gBasicHitSplatSpriteTemplate",
        "gDizzyPunchDuckSpriteTemplate",
    )
    templates = {name: oracle.symbols[name] for name in template_names}
    task_names = ("AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step")
    task_funcs = {name: elf_symbols[name] for name in task_names}

    sprites = oracle.symbols["gSprites"]
    matrices = oracle.symbols["gOamMatrices"]
    tasks = oracle.symbols["gTasks"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    faded = oracle.symbols["gPlttBufferFaded"]
    unfaded = oracle.symbols["gPlttBufferUnfaded"]
    visual_count = oracle.symbols["gAnimVisualTaskCount"]
    sound_count = oracle.symbols["gAnimSoundTaskCount"]
    script_active = oracle.symbols["gAnimScriptActive"]
    se1_info = oracle.symbols["gMPlayInfo_SE1"]
    se1_tracks = oracle.symbols["gMPlayTrack_SE1"]
    song_table = oracle.symbols["gSongTable"]

    def u16(address: int) -> int:
        return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = u16(base + 2) >> 9 & 0x1F
        matrix = matrices + matrix_num * 8
        return {
            "slot": slot,
            "template": oracle.read_u32(base + 0x14),
            "callback": oracle.read_u32(base + 0x1C),
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "attr0": u16(base),
            "attr1": u16(base + 2),
            "attr2": u16(base + 4),
            "matrixNum": matrix_num,
            "subpriority": oracle.read_u8(base + 0x43),
            "invisible": bool(oracle.read_u8(base + 0x3E) & 4),
            "matrix": {
                "a": s16(matrix),
                "b": s16(matrix + 2),
                "c": s16(matrix + 4),
                "d": s16(matrix + 6),
            },
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def battler(battler_id: int) -> dict:
        return sprite(oracle.read_u8(battler_ids + battler_id))

    def active_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4) == 0:
                continue
            func = oracle.read_u32(base)
            if func not in task_funcs.values():
                continue
            result.append(
                {
                    "slot": slot,
                    "func": func,
                    "data": [
                        s16(base + 8 + index * 2) for index in range(16)
                    ],
                }
            )
        return result

    frames = []

    def capture(frame: int) -> None:
        snapshot = lab.snapshot()
        if snapshot["engine"]["currentMove"] != MOVE_DIZZY_PUNCH:
            return
        effects = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if not oracle.read_u8(base + 0x3E) & 1:
                continue
            item = sprite(slot)
            if item["template"] in templates.values():
                effects.append(item)
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        frames.append(
            {
                "frame": frame,
                "sha256": hashlib.sha256(rgb).hexdigest(),
                "player": snapshot["battlers"]["player"],
                "opponent": snapshot["battlers"]["opponent"],
                "playerSprite": battler(0),
                "opponentSprite": battler(1),
                "sprites": effects,
                "tasks": active_tasks(),
                "visualTaskCount": oracle.read_u8(visual_count),
                "soundTaskCount": oracle.read_u8(sound_count),
                "animScriptActive": bool(oracle.read_u8(script_active)),
                "fadedPalette": [u16(faded + index * 2) for index in range(512)],
                "unfadedPalette": [
                    u16(unfaded + index * 2) for index in range(512)
                ],
                "hardwarePalette": [
                    u16(0x05000000 + index * 2) for index in range(512)
                ],
                "hardwareOam": [
                    [
                        u16(0x07000000 + index * 8 + offset)
                        for offset in (0, 2, 4)
                    ]
                    for index in range(128)
                ],
                "hardwareMatrices": [
                    [
                        s16(0x07000006 + index * 0x20 + offset)
                        for offset in (0, 8, 16, 24)
                    ]
                    for index in range(32)
                ],
                "se1": {
                    "songHeader": oracle.read_u32(se1_info),
                    "status": oracle.read_u32(se1_info + 4),
                    "tracks": [
                        {
                            "flags": oracle.read_u8(
                                se1_tracks + index * 0x50
                            ),
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
            }
        )

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)

    if not frames:
        raise RuntimeError("stock ROM did not reach MOVE_DIZZY_PUNCH")
    OUTPUT.write_text(
        json.dumps(
            {
                "schema": "dizzy-punch-dense-evidence/v1",
                "setup": setup,
                "templates": templates,
                "taskFuncs": task_funcs,
                "songHeaders": {
                    "SE_M_COMET_PUNCH": oracle.read_u32(song_table + 139 * 8),
                    "SE_M_VITAL_THROW2": oracle.read_u32(song_table + 123 * 8),
                },
                "frames": frames,
            }
        )
        + "\n"
    )
    print(
        f"wrote {OUTPUT} ({len(frames)} currentMove frames; "
        f"{frames[0]['frame']}..{frames[-1]['frame']})"
    )


main()
