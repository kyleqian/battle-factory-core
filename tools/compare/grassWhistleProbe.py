#!/usr/bin/env python3
"""Dense Scene-ON MOVE_GRASS_WHISTLE source/hardware/audio/raw-RGB receipt.

Captures the shared `AnimTask_MusicNotesRainbowBlend`/`ClearRainbowBlend`
whole-BG rainbow sweep, the twelve `gWavyMusicNotesSpriteTemplate` note
lifecycles, the F_PAL_BG green `simple_palette_blend` (RGB(18,31,12))
0->4->0 restore, and the `panse SE_M_GRASSWHISTLE` attacker->target +2,0
pan sweep through the complete move-owned source window and the first
inactive cleanup frame. Uses the shared mechanicLab complete-party staging
with the sole Level-50 carrier FRONTIER_MON_ROSELIA_1 (record 171, ROSELIA)
constrained to GRASS_WHISTLE on every slot.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: grassWhistleProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB_DIR = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
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

    sprites = oracle.symbols["gSprites"]
    tasks = oracle.symbols["gTasks"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    faded = oracle.symbols["gPlttBufferFaded"]
    unfaded = oracle.symbols["gPlttBufferUnfaded"]
    anim_script_active = oracle.symbols["gAnimScriptActive"]
    visual_task_count = oracle.symbols["gAnimVisualTaskCount"]
    sound_task_count = oracle.symbols["gAnimSoundTaskCount"]
    note_template = oracle.symbols["gWavyMusicNotesSpriteTemplate"]
    script_ptr = 0x020383F0  # sBattleAnimScriptPtr (static)
    nm = subprocess.run(
        ["arm-none-eabi-nm", str(reference / "pokeemerald.elf")],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    elf_symbols = {
        line.split()[2]: int(line.split()[0], 16) | 1
        for line in nm.splitlines()
        if len(line.split()) == 3
    }
    watched = {
        name: elf_symbols[name]
        for name in (
            "AnimWavyMusicNotes",
            "AnimWavyMusicNotes_Step",
            "AnimTask_MusicNotesRainbowBlend",
            "AnimTask_MusicNotesClearRainbowBlend",
            "Task_PanFromInitialToTarget",
            "Task_InitUpdateMonBg",
            "Task_UpdateMonBg",
            "Task_ClearMonBg",
            "sMonAnimTaskIdArray",
            "sSpritePaletteTags",
            "sSpriteOrder",
        )
    }
    script_bounds = {
        name: int(addr, 16)
        for name, addr in (
            ("Move_GRASS_WHISTLE", "082cee04"),
            ("Move_TICKLE", "082ceef7"),
        )
    }

    def u16(address: int) -> int:
        return oracle.read_u8(address) | (oracle.read_u8(address + 1) << 8)

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def block(address: int, size: int) -> bytes:
        return bytes(oracle.read_u8(address + index) for index in range(size))

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        attr0 = u16(base)
        attr2 = u16(base + 4)
        return {
            "slot": slot,
            "template": oracle.read_u32(base + 0x14),
            "callback": oracle.read_u32(base + 0x1C),
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "animNum": oracle.read_u8(base + 0x2A),
            "animCmdIndex": oracle.read_u8(base + 0x2B),
            "priority": (oracle.read_u8(base + 5) >> 2) & 3,
            "paletteNum": (oracle.read_u8(base + 5) >> 4) & 15,
            "matrixNum": (oracle.read_u8(base + 3) >> 1) & 31,
            "affineMode": (attr0 >> 8) & 3,
            "objMode": (attr0 >> 10) & 3,
            "tileNum": attr2 & 0x3FF,
            "subpriority": oracle.read_u8(base + 0x43),
            "invisible": bool(oracle.read_u8(base + 0x3E) & 4),
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def active_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4):
                result.append({
                    "slot": slot,
                    "func": oracle.read_u32(base),
                    "data": [s16(base + 8 + index * 2) for index in range(16)],
                })
        return result

    rows = []
    battle_mons = oracle.symbols["gBattleMons"]

    def battle_mon(slot: int) -> dict:
        base = battle_mons + slot * 0x58
        return {
            "species": u16(base),
            "hp": u16(base + 0x28),
            "maxHp": u16(base + 0x2C),
            "status1": oracle.read_u32(base + 0x4C),
        }

    def capture(frame: int) -> None:
        snapshot = lab.snapshot()
        if snapshot["engine"]["currentMove"] != 320:
            return
        live_script_ptr = oracle.read_u32(script_ptr)
        if not (
            script_bounds["Move_GRASS_WHISTLE"]
            <= live_script_ptr
            < script_bounds["Move_TICKLE"]
        ):
            return
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        battler_sprite_slots = [oracle.read_u8(battler_ids + index) for index in range(2)]
        active_slots = [
            slot for slot in range(64)
            if oracle.read_u8(sprites + slot * 0x44 + 0x3E) & 1
        ]
        rows.append({
            "frame": frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "attacker": snapshot["engine"]["activeBattler"],
            "engine": snapshot["engine"],
            "battleMons": [battle_mon(slot) for slot in range(2)],
            "animScriptActive": oracle.read_u8(anim_script_active),
            "animScriptPtr": oracle.read_u32(script_ptr),
            "inMoveScript": (
                script_bounds["Move_GRASS_WHISTLE"]
                <= oracle.read_u32(script_ptr)
                < script_bounds["Move_TICKLE"]
            ),
            "visualTaskCount": oracle.read_u8(visual_task_count),
            "soundTaskCount": oracle.read_u8(sound_task_count),
            "tasks": active_tasks(),
            "battlerSprites": [sprite(slot) for slot in battler_sprite_slots],
            "battlerObjTiles": [
                block(
                    0x06010000 + sprite(slot)["tileNum"] * 32,
                    0x800,
                ).hex()
                for slot in battler_sprite_slots
            ],
            "notes": [
                sprite(slot) for slot in active_slots
                if oracle.read_u32(sprites + slot * 0x44 + 0x14) == note_template
            ],
            "registers": {
                name: u16(address)
                for name, address in {
                    "DISPCNT": 0x4000000,
                    "BG0CNT": 0x4000008,
                    "BG1CNT": 0x400000A,
                    "BG2CNT": 0x400000C,
                    "BG3CNT": 0x400000E,
                    "BLDCNT": 0x4000050,
                    "BLDALPHA": 0x4000052,
                    "BLDY": 0x4000054,
                }.items()
            },
            "fadedBgPalettes": [u16(faded + index * 2) for index in range(256)],
            "unfadedBgPalettes": [u16(unfaded + index * 2) for index in range(256)],
            "hardwareBgPalettes": [
                u16(0x5000000 + index * 2) for index in range(256)
            ],
            "fadedObjPalettes": [
                u16(faded + (256 + index) * 2) for index in range(256)
            ],
            "unfadedObjPalettes": [
                u16(unfaded + (256 + index) * 2) for index in range(256)
            ],
            "hardwareObjPalettes": [
                u16(0x5000200 + index * 2) for index in range(256)
            ],
            "hardwareOam": block(0x7000000, 0x400).hex(),
            "spritePaletteTags": [
                u16(watched["sSpritePaletteTags"] + index * 2)
                for index in range(16)
            ],
            "monAnimTaskIds": [
                oracle.read_u8(watched["sMonAnimTaskIdArray"] + index)
                for index in range(2)
            ],
            "spriteOrder": [
                oracle.read_u8(watched["sSpriteOrder"] + index)
                for index in range(64)
            ],
        })

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)

    if not rows:
        raise RuntimeError("MOVE_GRASS_WHISTLE body was not observed")
    OUTPUT.write_text(json.dumps({
        "schema": "grass-whistle-dense-evidence/v1",
        "setup": setup,
        "symbols": {**watched, "noteTemplate": note_template},
        "scriptBounds": script_bounds,
        "frames": rows,
    }) + "\n")
    print(
        f"wrote {OUTPUT} ({len(rows)} move frames; "
        f"{rows[0]['frame'] if rows else '-'}..{rows[-1]['frame'] if rows else '-'})"
    )


main()
