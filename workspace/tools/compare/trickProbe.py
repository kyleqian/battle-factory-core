#!/usr/bin/env python3
"""Capture complete dense Scene-ON MOVE_TRICK evidence.

The probe only observes a legal mechanicLab battle.  It records the exact
pointer-owned script window through its first inactive cleanup row, including
the ordinary OAM, palette, allocator, task, audio, party, engine, RNG, and
raw-RGB state needed by the source-age reducer and later compositor work.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: trickProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents)
               if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_TRICK = 271


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
    sprites, matrices, tasks = (
        symbols["gSprites"],
        symbols["gOamMatrices"],
        symbols["gTasks"],
    )
    active = names["gAnimScriptActive"]
    pointer = names["sBattleAnimScriptPtr"]
    start, end = names["Move_TRICK"], names["Move_WISH"]
    palette_tags = names["sSpritePaletteTags"]
    tile_tags = names["sSpriteTileRangeTags"]
    tile_ranges = names["sSpriteTileRanges"]
    tile_bitmap = names["sSpriteTileAllocBitmap"]
    software = names["gMain"] + 0x38
    wait = names["sAnimFramesToWait"]
    RGB.mkdir(parents=True, exist_ok=True)

    def u8(address: int) -> int:
        return oracle.read_u8(address)

    def u16(address: int) -> int:
        return u8(address) | u8(address + 1) << 8

    def u32(address: int) -> int:
        return u16(address) | u16(address + 2) << 16

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = u8(address)
        return value - 0x100 if value >= 0x80 else value

    def raw(address: int, size: int) -> str:
        return bytes(u8(address + offset) for offset in range(size)).hex()

    def identity(address: int) -> dict[str, int | str | None]:
        return {"address": address, "symbol": by_address.get(address & ~1)}

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 31
        matrix = matrices + matrix_num * 8
        return {
            "slot": slot,
            "raw": raw(base, 0x44),
            "template": identity(u32(base + 0x14)),
            "callback": identity(u32(base + 0x1C)),
            "attr": [u16(base + offset) for offset in (0, 2, 4)],
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "animNum": u8(base + 0x2A),
            "animCmdIndex": u8(base + 0x2B),
            "animDelayCounter": u8(base + 0x2C),
            "affineAnimCmdIndex": u8(base + 0x2D),
            "subpriority": u8(base + 0x43),
            "invisible": (u8(base + 0x3E) >> 2) & 1,
            "matrixNum": matrix_num,
            "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def mplay(name: str) -> dict:
        info = symbols[f"gMPlayInfo_{name}"]
        track = symbols[f"gMPlayTrack_{name}"]
        header = u32(info)
        return {
            "songHeader": header,
            "songHeaderIdentity": identity(header),
            "status": u32(info + 4),
            "tracks": [
                {
                    "flags": u8(track + index * 0x50),
                    "pan": s8(track + index * 0x50 + 0x14),
                    "panX": s8(track + index * 0x50 + 0x15),
                    "raw": raw(track + index * 0x50, 0x50),
                }
                for index in range(4)
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
        "win0h": 0x04000040,
        "win1h": 0x04000042,
        "win0v": 0x04000044,
        "win1v": 0x04000046,
        "winin": 0x04000048,
        "winout": 0x0400004A,
        "mosaic": 0x0400004C,
        "bldcnt": 0x04000050,
        "bldalpha": 0x04000052,
        "bldy": 0x04000054,
    }

    def row(frame: int, snapshot: dict) -> dict:
        rgb = oracle.screen_rgb()
        (RGB / f"{frame:05d}.rgb").write_bytes(rgb)
        script = u32(pointer)
        live_tasks = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if u8(base + 4):
                live_tasks.append({
                    "slot": slot,
                    "raw": raw(base, 0x28),
                    "func": identity(u32(base)),
                    "priority": u8(base + 5),
                    "data": [s16(base + 8 + index * 2) for index in range(16)],
                })
        attacker = u8(names["gBattleAnimAttacker"])
        target = u8(names["gBattleAnimTarget"])
        sprite_ids = [u8(names["gBattlerSpriteIds"] + index) for index in range(4)]
        healthbox_ids = [u8(names["gHealthboxSpriteIds"] + index) for index in range(4)]
        return {
            "frame": frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "animScriptActive": bool(u8(active)),
            "scriptPtr": script,
            "scriptIdentity": identity(script),
            "scriptOwner": "Move_TRICK" if start <= script < end else None,
            "scriptOffset": script - start if start <= script < end else None,
            "scriptPtrParity": script & 1,
            "scriptWait": s8(wait),
            "animArgs": [s16(names["gBattleAnimArgs"] + index * 2) for index in range(8)],
            "visualTaskCount": u8(symbols["gAnimVisualTaskCount"]),
            "soundTaskCount": u8(symbols["gAnimSoundTaskCount"]),
            "tasks": live_tasks,
            "sprites": [
                sprite(slot) for slot in range(64)
                if u8(sprites + slot * 0x44 + 0x3E) & 1
            ],
            "spriteOrder": [u8(names["sSpriteOrder"] + index) for index in range(64)],
            "animationBattlers": {
                "attacker": attacker,
                "target": target,
                "spriteIds": sprite_ids,
            },
            "battlerSprites": {
                "attacker": sprite(sprite_ids[attacker]),
                "target": sprite(sprite_ids[target]),
            },
            "chrome": {
                "healthboxSpriteIds": healthbox_ids,
                "healthboxSprites": [sprite(slot) for slot in healthbox_ids],
            },
            "battlers": snapshot["battlers"],
            "parties": snapshot["parties"],
            "engine": snapshot["engine"],
            "semanticState": {
                key: snapshot[key]
                for key in ("battleOutcome", "weather", "weatherTurns", "sideStatuses", "sideConditions")
            },
            "immutableState": {
                key: snapshot[key]
                for key in ("rngValue", "battleOutcome", "weather", "weatherTurns", "sideStatuses", "sideConditions")
            },
            "gameplayRng": snapshot["rngValue"],
            "animationRng": u32(names["gRng2Value"]),
            "softwareOam": [raw(software + index * 8, 8) for index in range(128)],
            "hardwareOam": [raw(0x07000000 + index * 8, 8) for index in range(128)],
            "softwareMatrices": [
                [s16(matrices + index * 8 + offset) for offset in (0, 2, 4, 6)]
                for index in range(32)
            ],
            "hardwareMatrices": [
                [s16(0x07000006 + index * 0x20 + offset) for offset in (0, 8, 16, 24)]
                for index in range(32)
            ],
            "fadedPalette": [u16(symbols["gPlttBufferFaded"] + index * 2) for index in range(512)],
            "unfadedPalette": [u16(symbols["gPlttBufferUnfaded"] + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "allocators": {
                "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
                "tileTags": [u16(tile_tags + index * 2) for index in range(64)],
                "tileRanges": [
                    [u16(tile_ranges + index * 4), u16(tile_ranges + index * 4 + 2)]
                    for index in range(64)
                ],
                "tileBitmap": raw(tile_bitmap, 128),
                "matrixBitmap": u32(names["gOamMatrixAllocBitmap"]),
                "reservedPaletteCount": u8(names["gReservedSpritePaletteCount"]),
                "reservedTileCount": u16(names["gReservedSpriteTileCount"]),
            },
            "registers": {name: u16(address) for name, address in registers.items()},
            "audio": {"SE1": mplay("SE1"), "SE2": mplay("SE2")},
        }

    rows: list[dict] = []
    started = False
    frame = 0

    def take() -> None:
        nonlocal started
        snapshot = lab.snapshot()
        script = u32(pointer)
        if (
            not started
            and snapshot["engine"]["currentMove"] == MOVE_TRICK
            and start <= script < end
            and bool(u8(active))
        ):
            started = True
        if started:
            rows.append(row(frame, snapshot))

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            take()
            if started and rows[-1]["animScriptActive"] is False:
                break
        if started and rows[-1]["animScriptActive"] is False:
            break

    if (
        not rows
        or rows[0]["scriptOwner"] != "Move_TRICK"
        or rows[0]["scriptOffset"] != 0
        or rows[-1]["animScriptActive"] is not False
    ):
        raise RuntimeError("complete Trick pointer window was not observed")

    topology = {
        "tasks": sorted({
            task["func"]["symbol"]
            for entry in rows for task in entry["tasks"]
            if task["func"]["symbol"]
        }),
        "templates": sorted({
            sprite_entry["template"]["symbol"]
            for entry in rows for sprite_entry in entry["sprites"]
            if sprite_entry["template"]["symbol"]
        }),
        "callbacks": sorted({
            sprite_entry["callback"]["symbol"]
            for entry in rows for sprite_entry in entry["sprites"]
            if sprite_entry["callback"]["symbol"]
        }),
    }
    watched = (
        "Move_TRICK", "Move_WISH", "gTrickBagSpriteTemplate",
        "AnimTrickBag", "AnimTrickBag_Step1", "AnimTrickBag_Step2",
        "AnimTrickBag_Step3", "AnimTask_StretchTargetUp",
        "AnimTask_StretchAttackerUp", "AnimTask_ShakeMon",
        "AnimTask_ShakeMon_Step", "se_m_sketch", "se_m_double_team",
        "se_m_attract",
    )
    result = {
        "schema": "trick-dense-evidence/v1",
        "profile": "battle-scene-on",
        "move": MOVE_TRICK,
        "setup": setup,
        "sourceWindow": {
            "startFrame": rows[0]["frame"],
            "endFrame": rows[-1]["frame"],
            "frameCount": len(rows),
            "sourceFrameCount": sum(row["scriptOwner"] == "Move_TRICK" for row in rows),
        },
        "sourcePointerContract": {
            "start": start,
            "endExclusive": end,
            "observedAddresses": sorted({row["scriptPtr"] for row in rows}),
            "observedParities": sorted({
                row["scriptPtrParity"] for row in rows
                if row["scriptOwner"] is not None
            }),
        },
        "sourceSymbols": {name: names[name] for name in watched},
        "topology": topology,
        "frames": rows,
    }
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(
        f"wrote {OUTPUT}: source {rows[0]['frame']}..{rows[-1]['frame']} "
        f"({len(rows)} frames)"
    )


if __name__ == "__main__":
    main()
