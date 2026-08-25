#!/usr/bin/env python3
"""Pointer-bounded Scene-ON MOVE_SCREECH source/hardware/audio/RGB receipt."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: screechProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


MOVE = 103


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba",
        reference / "pokeemerald.map",
        HARNESS / "oracle" / "bootstrap" / "factory.json",
    )
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    nm = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    symbols = {
        parts[2]: int(parts[0], 16)
        for line in nm.splitlines()
        if len(parts := line.split()) == 3
        and all(char in "0123456789abcdefABCDEF" for char in parts[0])
    }
    by_address = {address: name for name, address in symbols.items()}
    sy = oracle.symbols

    sprites = sy["gSprites"]
    matrices = sy["gOamMatrices"]
    battler_ids = sy["gBattlerSpriteIds"]
    tasks = sy["gTasks"]
    script_active = symbols["gAnimScriptActive"]
    script_ptr = symbols["sBattleAnimScriptPtr"]
    frames_wait = symbols["sAnimFramesToWait"]
    visual_count = symbols["gAnimVisualTaskCount"]
    sound_count = symbols["gAnimSoundTaskCount"]
    palette_tags = symbols["sSpritePaletteTags"]
    tile_tags = symbols["sSpriteTileRangeTags"]
    software_oam = symbols["gMain"] + 0x38
    move_start = symbols["Move_SCREECH"]
    move_end = symbols["Move_FLAME_WHEEL"]
    screech_template = symbols["gScreechRingSpriteTemplate"]
    target_translate = symbols["TranslateAnimSpriteToTargetMonLocation"]
    target_translate_followup = symbols["AnimTranslateLinear_WithFollowup"]
    shake_step = symbols["AnimTask_ShakeMon2_Step"]
    sway_step = symbols["AnimTask_SwayMonStep"]

    RGB_DIR.mkdir(parents=True, exist_ok=True)

    def u8(address: int) -> int:
        return oracle.read_u8(address)

    def u16(address: int) -> int:
        return u8(address) | (u8(address + 1) << 8)

    def u32(address: int) -> int:
        return u16(address) | (u16(address + 2) << 16)

    def s8(address: int) -> int:
        value = u8(address)
        return value - 0x100 if value >= 0x80 else value

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def raw(address: int, size: int) -> str:
        return "".join(f"{u8(address + index):02x}" for index in range(size))

    def ident(address: int) -> dict:
        return {"address": address, "symbol": by_address.get(address, by_address.get(address & ~1))}

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        attr1 = u16(base + 2)
        matrix_number = (attr1 >> 9) & 0x1F
        matrix = matrices + matrix_number * 8
        return {
            "slot": slot,
            "active": bool(u8(base + 0x3E) & 1),
            "raw": raw(base, 0x44),
            "template": ident(u32(base + 0x14)),
            "callback": ident(u32(base + 0x1C)),
            "attr": [u16(base + offset) for offset in (0, 2, 4)],
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "matrixNum": matrix_number,
            "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def task(slot: int) -> dict:
        base = tasks + slot * 0x28
        return {
            "slot": slot,
            "active": bool(u8(base + 4)),
            "raw": raw(base, 0x28),
            "func": ident(u32(base)),
            "data": [s16(base + 8 + index * 2) for index in range(16)],
        }

    def audio(channel: str) -> dict:
        info = sy[f"gMPlayInfo_{channel}"]
        track = sy[f"gMPlayTrack_{channel}"]
        return {
            "rawInfo": raw(info, 0x40),
            "songHeader": u32(info),
            "status": u32(info + 4),
            "tracks": [
                {
                    "flags": u8(track + index * 0x50),
                    "pan": s8(track + index * 0x50 + 0x14),
                    "panX": s8(track + index * 0x50 + 0x15),
                    "raw": raw(track + index * 0x50, 0x50),
                }
                for index in range(3)
            ],
        }

    registers = {
        "dispcnt": 0x04000000,
        "bg0cnt": 0x04000008,
        "bg1cnt": 0x0400000A,
        "bg2cnt": 0x0400000C,
        "bg3cnt": 0x0400000E,
        "bg0hofs": 0x04000010,
        "bg0vofs": 0x04000012,
        "bg1hofs": 0x04000014,
        "bg1vofs": 0x04000016,
        "bg2hofs": 0x04000018,
        "bg2vofs": 0x0400001A,
        "bg3hofs": 0x0400001C,
        "bg3vofs": 0x0400001E,
        "bldcnt": 0x04000050,
        "bldalpha": 0x04000052,
        "bldy": 0x04000054,
    }

    def matrix_rows(base: int, stride: int, offsets: tuple[int, ...]) -> list[list[int]]:
        return [[s16(base + index * stride + offset) for offset in offsets] for index in range(32)]

    def row(frame: int) -> dict:
        snapshot = lab.snapshot()
        pointer = u32(script_ptr)
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        return {
            "frame": frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "gAnimScriptActive": bool(u8(script_active)),
            "script": ident(pointer),
            "scriptPointer": pointer,
            "scriptOffset": pointer - move_start if move_start <= pointer < move_end else None,
            "scriptInBounds": move_start <= pointer < move_end,
            "scriptWait": s8(frames_wait),
            "visualTaskCount": u8(visual_count),
            "soundTaskCount": u8(sound_count),
            "tasks": [task(slot) for slot in range(16)],
            "sprites": [sprite(slot) for slot in range(64)],
            "battlers": {
                "player": sprite(u8(battler_ids)),
                "opponent": sprite(u8(battler_ids + 1)),
            },
            "parties": snapshot["parties"],
            "engine": snapshot["engine"],
            "immutableState": {
                key: snapshot[key]
                for key in ("battleOutcome", "weather", "weatherTurns", "sideStatuses", "sideConditions")
            },
            "gameplayRng": u32(symbols["gRngValue"]),
            "animationRng": u32(symbols["gRng2Value"]),
            "softwareOam": [raw(software_oam + index * 8, 8) for index in range(128)],
            "hardwareOam": [raw(0x07000000 + index * 8, 8) for index in range(128)],
            "softwareMatrices": matrix_rows(matrices, 8, (0, 2, 4, 6)),
            "hardwareMatrices": matrix_rows(0x07000006, 0x20, (0, 8, 16, 24)),
            "fadedPalette": [u16(sy["gPlttBufferFaded"] + index * 2) for index in range(512)],
            "unfadedPalette": [u16(sy["gPlttBufferUnfaded"] + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
            "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
            "registers": {name: u16(address) for name, address in registers.items()},
            "audio": {"SE1": audio("SE1"), "SE2": audio("SE2")},
        }

    rows: list[dict] = []
    frame = 0
    started = False
    finished = False

    def capture() -> None:
        nonlocal started, finished
        pointer = u32(script_ptr)
        active = bool(u8(script_active))
        in_bounds = move_start <= pointer < move_end
        if not started:
            if lab.snapshot()["engine"]["currentMove"] == MOVE and active and in_bounds:
                started = True
            else:
                return
        rows.append(row(frame))
        if not active and u8(visual_count) == 0 and u8(sound_count) == 0:
            finished = True

    capture()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            if not finished:
                capture()
    if not started:
        raise RuntimeError("Screech source pointer was never observed")
    if not finished:
        raise RuntimeError("Screech inactive cleanup was not observed")
    if not rows:
        raise RuntimeError("Screech produced no source rows")

    topology = {
        "tasks": sorted({entry["func"]["symbol"] for item in rows for entry in item["tasks"] if entry["active"] and entry["func"]["symbol"]}),
        "templates": sorted({entry["template"]["symbol"] for item in rows for entry in item["sprites"] if entry["active"] and entry["template"]["symbol"]}),
        "callbacks": sorted({entry["callback"]["symbol"] for item in rows for entry in item["sprites"] if entry["active"] and entry["callback"]["symbol"]}),
    }
    templates = [entry["template"]["address"] for item in rows for entry in item["sprites"] if entry["active"]]
    callbacks = [entry["callback"]["address"] & ~1 for item in rows for entry in item["sprites"] if entry["active"]]
    task_funcs = [entry["func"]["address"] & ~1 for item in rows for entry in item["tasks"] if entry["active"]]
    if screech_template not in templates:
        raise RuntimeError(f"Screech ring template was not observed: {topology}")
    if not ({target_translate & ~1, target_translate_followup} & set(callbacks)):
        raise RuntimeError(f"Screech target translation was not observed: {topology}")
    if shake_step not in task_funcs or sway_step not in task_funcs:
        raise RuntimeError(f"Screech ShakeMon2/SwayMon tasks were not observed: {topology}")

    result = {
        "schema": "screech-dense-evidence/v1",
        "oracleProfile": "battle-scene-on",
        "move": "SCREECH",
        "moveId": MOVE,
        "setup": setup,
        "sourceWindow": {
            "startFrame": rows[0]["frame"],
            "endFrame": rows[-1]["frame"],
            "frameCount": len(rows),
        },
        "sourceSymbols": {
            "Move_SCREECH": move_start,
            "Move_FLAME_WHEEL": move_end,
            "gScreechRingSpriteTemplate": screech_template,
            "TranslateAnimSpriteToTargetMonLocation": target_translate,
            "AnimTranslateLinear_WithFollowup": target_translate_followup,
            "AnimTask_ShakeMon2_Step": shake_step,
            "AnimTask_SwayMonStep": sway_step,
            "SE_M_SCREECH": symbols.get("se_m_screech"),
        },
        "topology": topology,
        "frames": rows,
    }
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: source {rows[0]['frame']}..{rows[-1]['frame']} ({len(rows)} frames)")


if __name__ == "__main__":
    main()
