#!/usr/bin/env python3
"""Dense Scene-ON hardware evidence for MOVE_SHADOW_PUNCH."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: shadowPunchProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB_DIR = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(
    parent for parent in (ROOT, *ROOT.parents)
    if (parent / "oracle" / "emerald_core.py").is_file()
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

    sprites = oracle.symbols["gSprites"]
    matrices = oracle.symbols["gOamMatrices"]
    tasks = oracle.symbols["gTasks"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    faded = oracle.symbols["gPlttBufferFaded"]
    unfaded = oracle.symbols["gPlttBufferUnfaded"]
    se1_info = oracle.symbols["gMPlayInfo_SE1"]
    se1_tracks = oracle.symbols["gMPlayTrack_SE1"]
    song_table = oracle.symbols["gSongTable"]
    oam_buffer = oracle.symbols["gMain"] + 0x38

    templates = {
        name: oracle.symbols[name]
        for name in ("gFistFootSpriteTemplate", "gBasicHitSplatSpriteTemplate")
    }
    trace_callback = 0x080A8DFC
    punch_task_funcs = {0x080A8BC5, 0x080A8CAD}

    def u16(address: int) -> int:
        return oracle.read_u8(address) | (oracle.read_u8(address + 1) << 8)

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value

    def oam_entry(address: int) -> list[int]:
        return [u16(address + offset) for offset in (0, 2, 4)]

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        attr1 = u16(base + 2)
        matrix_num = (attr1 >> 9) & 0x1F
        matrix = matrices + matrix_num * 8
        hardware_matrix = 0x07000006 + matrix_num * 0x20
        palette_num = (u16(base + 4) >> 12) & 0xF
        return {
            "slot": slot,
            "attr0": u16(base),
            "attr1": attr1,
            "attr2": u16(base + 4),
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "template": oracle.read_u32(base + 0x14),
            "callback": oracle.read_u32(base + 0x1C),
            "animNum": oracle.read_u8(base + 0x2A),
            "animCmdIndex": oracle.read_u8(base + 0x2B),
            "invisible": bool(oracle.read_u8(base + 0x3E) & 4),
            "subpriority": oracle.read_u8(base + 0x43),
            "matrixNum": matrix_num,
            "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
            "hardwareMatrix": [
                s16(hardware_matrix + offset) for offset in (0, 8, 16, 24)
            ],
            "paletteNum": palette_num,
            "paletteUnfaded": [
                u16(unfaded + (0x100 + palette_num * 16 + index) * 2)
                for index in range(16)
            ],
            "paletteFaded": [
                u16(faded + (0x100 + palette_num * 16 + index) * 2)
                for index in range(16)
            ],
            "hardwarePalette": [
                u16(0x05000000 + (0x100 + palette_num * 16 + index) * 2)
                for index in range(16)
            ],
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def active_punch_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if not oracle.read_u8(base + 4):
                continue
            func = oracle.read_u32(base)
            if func in punch_task_funcs:
                result.append({
                    "slot": slot,
                    "func": func,
                    "data": [s16(base + 8 + index * 2) for index in range(16)],
                })
        return result

    rows = []
    RGB_DIR.mkdir()

    def capture(frame: int) -> None:
        snapshot = lab.snapshot()
        attacker_battler = oracle.read_u8(oracle.symbols["gBattleAnimAttacker"])
        target_battler = oracle.read_u8(oracle.symbols["gBattleAnimTarget"])
        attacker_slot = oracle.read_u8(battler_ids + attacker_battler)
        target_slot = oracle.read_u8(battler_ids + target_battler)
        active = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if not (oracle.read_u8(base + 0x3E) & 1):
                continue
            item = sprite(slot)
            if (
                item["template"] in templates.values()
                or (item["callback"] & ~1) == trace_callback
            ):
                active.append(item)

        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        traces = [
            item for item in active
            if (item["callback"] & ~1) == trace_callback
        ]
        fists = [
            item for item in active
            if item["template"] == templates["gFistFootSpriteTemplate"]
        ]
        hitsplats = [
            item for item in active
            if item["template"] == templates["gBasicHitSplatSpriteTemplate"]
        ]
        punch_tasks = active_punch_tasks()
        registers = {
            "bg1hofs": u16(0x04000014),
            "bg1vofs": u16(0x04000016),
            "bg2hofs": u16(0x04000018),
            "bg2vofs": u16(0x0400001A),
            "bldcnt": u16(0x04000050),
            "bldalpha": u16(0x04000052),
            "bldy": u16(0x04000054),
        }
        rows.append({
            "frame": frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "currentMove": snapshot["engine"]["currentMove"],
            "animScriptActive": oracle.read_u8(oracle.symbols["gAnimScriptActive"]),
            "visualTaskCount": oracle.read_u8(oracle.symbols["gAnimVisualTaskCount"]),
            "animVisualTaskCount": oracle.read_u8(oracle.symbols["gAnimVisualTaskCount"]),
            "attackerSlot": attacker_slot,
            "attacker": sprite(attacker_slot),
            "target": sprite(target_slot),
            "punchTask": punch_tasks[0] if punch_tasks else None,
            "traceSprites": traces,
            "fistSprite": fists[0] if fists else None,
            "hitsplatSprites": hitsplats,
            "playerSprite": sprite(oracle.read_u8(battler_ids)),
            "opponentSprite": sprite(oracle.read_u8(battler_ids + 1)),
            "sprites": active,
            "tasks": punch_tasks,
            "oamBuffer": [
                oam_entry(oam_buffer + index * 8) for index in range(128)
            ],
            "hardwareOam": [
                oam_entry(0x07000000 + index * 8) for index in range(128)
            ],
            "fadedPalette": [u16(faded + index * 2) for index in range(512)],
            "unfadedPalette": [u16(unfaded + index * 2) for index in range(512)],
            "hardwarePalette": [
                u16(0x05000000 + index * 2) for index in range(512)
            ],
            "registers": registers,
            "bldcnt": registers["bldcnt"],
            "bldalpha": registers["bldalpha"],
            "bldy": registers["bldy"],
            "se1": {
                "songHeader": oracle.read_u32(se1_info),
                "status": oracle.read_u32(se1_info + 4),
                "tracks": [{
                    "flags": oracle.read_u8(se1_tracks + index * 0x50),
                    "pan": s8(se1_tracks + index * 0x50 + 0x14),
                    "panX": s8(se1_tracks + index * 0x50 + 0x15),
                } for index in range(3)],
            },
        })

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)

    OUTPUT.write_text(json.dumps({
        "schema": "shadow-punch-dense-evidence/v2",
        "setup": setup,
        "templates": templates,
        "songHeaders": {
            "SE_M_COMET_PUNCH": oracle.read_u32(song_table + 139 * 8),
            "SE_M_JUMP_KICK": oracle.read_u32(song_table + 143 * 8),
        },
        "frames": rows,
    }) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} frames)")


main()
