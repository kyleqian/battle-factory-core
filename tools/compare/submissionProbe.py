#!/usr/bin/env python3
"""Dense Scene-ON software/hardware/audio/RGB evidence for MOVE_SUBMISSION."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: submissionProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(
    path for path in (ROOT, *ROOT.parents)
    if (path / "oracle" / "emerald_core.py").is_file()
)
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_SUBMISSION = 66


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
    nm = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    pairs = [
        (int(parts[0], 16), parts[2])
        for line in nm.splitlines()
        if len(parts := line.split()) == 3
        and all(char in "0123456789abcdefABCDEF" for char in parts[0])
    ]
    names = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}
    symbols = oracle.symbols
    sprites = symbols["gSprites"]
    matrices = symbols["gOamMatrices"]
    tasks = symbols["gTasks"]
    battler_ids = symbols["gBattlerSpriteIds"]
    script_active = names["gAnimScriptActive"]
    script_ptr = names["sBattleAnimScriptPtr"]
    script_wait = names["sAnimFramesToWait"]
    source_start = names["Move_SUBMISSION"]
    source_end = names["Move_SUNNY_DAY"]
    palette_tags = names["sSpritePaletteTags"]
    software_oam = names["gMain"] + 0x38
    RGB.mkdir(parents=True, exist_ok=True)
    all_rgb = RGB.parent / f"{RGB.name}-all"
    all_rgb.mkdir(parents=True, exist_ok=True)

    def u16(address: int) -> int:
        return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8

    def u32(address: int) -> int:
        return u16(address) | u16(address + 2) << 16

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value

    def raw(address: int, length: int) -> str:
        return "".join(f"{oracle.read_u8(address + offset):02x}" for offset in range(length))

    def identifier(address: int) -> dict[str, int | str | None]:
        return {"address": address, "symbol": by_address.get(address & ~1)}

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = u16(base + 2) >> 9 & 31
        matrix = matrices + matrix_num * 8
        return {
            "slot": slot,
            "raw": raw(base, 0x44),
            "template": identifier(u32(base + 0x14)),
            "callback": identifier(u32(base + 0x1C)),
            "attr": [u16(base + offset) for offset in (0, 2, 4)],
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "matrixNum": matrix_num,
            "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def battler(index: int) -> dict:
        return sprite(oracle.read_u8(battler_ids + index))

    def sound_player(name: str) -> dict:
        info = symbols[f"gMPlayInfo_{name}"]
        track = symbols[f"gMPlayTrack_{name}"]
        return {
            "rawInfo": raw(info, 0x40),
            "songHeader": u32(info),
            "status": u32(info + 4),
            "tracks": [
                {
                    "flags": oracle.read_u8(track + index * 0x50),
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
        "bg1hofs": 0x04000014,
        "bg1vofs": 0x04000016,
        "winin": 0x04000048,
        "winout": 0x0400004A,
        "bldcnt": 0x04000050,
        "bldalpha": 0x04000052,
        "bldy": 0x04000054,
    }
    rows: list[dict] = []
    seen: set[int] = set()
    frame = 0

    def capture() -> None:
        nonlocal frame
        snapshot = lab.snapshot()
        current = snapshot["engine"]["currentMove"]
        seen.add(current)
        if current != MOVE_SUBMISSION:
            return
        rgb = oracle.screen_rgb()
        (all_rgb / f"{frame:05d}.rgb").write_bytes(rgb)
        pointer = u32(script_ptr)
        live_sprites = [
            sprite(slot)
            for slot in range(64)
            if oracle.read_u8(sprites + slot * 0x44 + 0x3E) & 1
        ]
        live_tasks = [
            {
                "slot": slot,
                "raw": raw(base, 0x28),
                "func": identifier(u32(base)),
                "data": [s16(base + 8 + index * 2) for index in range(16)],
            }
            for slot in range(16)
            if oracle.read_u8((base := tasks + slot * 0x28) + 4)
        ]
        rows.append({
            "frame": frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "gAnimScriptActive": oracle.read_u8(script_active),
            "script": identifier(pointer),
            "scriptOffset": pointer - source_start
            if source_start <= pointer < source_end else None,
            "scriptWait": s8(script_wait),
            "visualTaskCount": oracle.read_u8(symbols["gAnimVisualTaskCount"]),
            "soundTaskCount": oracle.read_u8(symbols["gAnimSoundTaskCount"]),
            "tasks": live_tasks,
            "sprites": live_sprites,
            "battlers": snapshot["battlers"],
            "playerSprite": battler(0),
            "opponentSprite": battler(1),
            "softwareOam": [raw(software_oam + index * 8, 8) for index in range(128)],
            "hardwareOam": [raw(0x07000000 + index * 8, 8) for index in range(128)],
            "hardwareMatrices": [
                [s16(0x07000006 + index * 0x20 + offset) for offset in (0, 8, 16, 24)]
                for index in range(32)
            ],
            "fadedPalette": [u16(symbols["gPlttBufferFaded"] + index * 2) for index in range(512)],
            "unfadedPalette": [u16(symbols["gPlttBufferUnfaded"] + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
            "registers": {name: u16(address) for name, address in registers.items()},
            "se1": sound_player("SE1"),
            "se2": sound_player("SE2"),
        })

    capture()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture()

    first = next(
        (
            index for index, row in enumerate(rows)
            if row["gAnimScriptActive"] and row["scriptOffset"] is not None
        ),
        None,
    )
    if first is None:
        raise RuntimeError(f"Submission source pointer not observed; saw {sorted(seen)}")
    last = next(
        (index for index in range(first + 1, len(rows)) if not rows[index]["gAnimScriptActive"]),
        None,
    )
    if last is None:
        raise RuntimeError("Submission inactive cleanup not observed")
    source = rows[first:last + 1]
    topology = {
        "tasks": sorted({
            item["func"]["symbol"]
            for row in source for item in row["tasks"]
            if item["func"]["symbol"]
        }),
        "templates": sorted({
            item["template"]["symbol"]
            for row in source for item in row["sprites"]
            if item["template"]["symbol"]
        }),
        "callbacks": sorted({
            item["callback"]["symbol"]
            for row in source for item in row["sprites"]
            if item["callback"]["symbol"]
        }),
    }
    expected_tasks = {
        "AnimTask_TranslateMonElliptical_Step",
        "Task_ClearMonBg",
        "Task_UpdateMonBg",
    }
    if not expected_tasks <= set(topology["tasks"]):
        raise RuntimeError(f"Submission task topology changed: {topology}")
    if "gBasicHitSplatSpriteTemplate" not in topology["templates"]:
        raise RuntimeError(f"Submission hitsplat topology changed: {topology}")
    if source[-1]["gAnimScriptActive"] or source[-1]["visualTaskCount"]:
        raise RuntimeError("Submission cleanup retained animation")
    for row in source:
        filename = f"{row['frame']:05d}.rgb"
        (RGB / filename).write_bytes((all_rgb / filename).read_bytes())
    result = {
        "schema": "submission-dense-evidence/v1",
        "setup": setup,
        "sourceWindow": {
            "startFrame": source[0]["frame"],
            "endFrame": source[-1]["frame"],
            "frameCount": len(source),
        },
        "sourceSymbols": {
            "Move_SUBMISSION": source_start,
            "Move_SUNNY_DAY": source_end,
        },
        "topology": topology,
        "frames": source,
    }
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(
        f"wrote {OUTPUT}: source {source[0]['frame']}..{source[-1]['frame']} "
        f"({len(source)} frames)"
    )


if __name__ == "__main__":
    main()
