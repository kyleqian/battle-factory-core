#!/usr/bin/env python3
"""Capture complete dense Scene-ON MOVE_RAIN_DANCE evidence.

The probe is intentionally evidence-only.  It retains every source-owned row
from the actual Move_RAIN_DANCE pointer interval through the first inactive
cleanup row, including both raindrop task instances, allocator/OAM state,
palettes/registers/audio, immutable party/RNG state, and raw RGB.
Invoke through tools/run-mgba-probe.py.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: rainDanceProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents)
               if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(
        ref / "pokeemerald.gba", ref / "pokeemerald.map",
        HARNESS / "oracle" / "bootstrap" / "factory.json",
    )
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    nm = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")],
        check=True, capture_output=True, text=True,
    ).stdout
    pairs = [
        (int(parts[0], 16), parts[2])
        for line in nm.splitlines()
        if len(parts := line.split()) == 3
        and all(char in "0123456789abcdefABCDEF" for char in parts[0])
    ]
    names = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}
    sy = oracle.symbols

    sprites = sy["gSprites"]
    matrices = sy["gOamMatrices"]
    tasks = sy["gTasks"]
    active = names["gAnimScriptActive"]
    pointer = names["sBattleAnimScriptPtr"]
    start = names["Move_RAIN_DANCE"]
    end = names["Move_BITE"]
    rain_template = names["gRainDropSpriteTemplate"]
    software_oam = names["gMain"] + 0x38
    palette_tags = names["sSpritePaletteTags"]
    tile_tags = names["sSpriteTileRangeTags"]
    RGB_DIR.mkdir(parents=True, exist_ok=True)

    u8 = lambda address: oracle.read_u8(address)
    u16 = lambda address: u8(address) | u8(address + 1) << 8
    u32 = lambda address: u16(address) | u16(address + 2) << 16

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = u8(address)
        return value - 0x100 if value >= 0x80 else value

    def raw_hex(address: int, size: int) -> str:
        return bytes(u8(address + offset) for offset in range(size)).hex()

    def ident(address: int) -> dict:
        address &= ~1
        return {"address": address, "symbol": by_address.get(address)}

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 31
        matrix = matrices + matrix_num * 8
        return {
            "slot": slot,
            "raw": raw_hex(base, 0x44),
            "template": ident(u32(base + 0x14)),
            "callback": ident(u32(base + 0x1c)),
            "attr": [u16(base + offset) for offset in (0, 2, 4)],
            "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "animNum": u8(base + 0x2a),
            "animCmdIndex": u8(base + 0x2b),
            "animDelayCounter": u8(base + 0x2c),
            "subpriority": u8(base + 0x43),
            "invisible": bool(u8(base + 0x3e) & 4),
            "flags": u8(base + 0x3e),
            "matrixNum": matrix_num,
            "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
            "data": [s16(base + 0x2e + index * 2) for index in range(8)],
        }

    def live_sprites() -> list[dict]:
        return [sprite(slot) for slot in range(64)
                if u8(sprites + slot * 0x44 + 0x3e) & 1]

    def live_tasks() -> list[dict]:
        return [{
            "slot": slot,
            "raw": raw_hex(tasks + slot * 0x28, 0x28),
            "func": ident(u32(tasks + slot * 0x28)),
            "data": [s16(tasks + slot * 0x28 + 8 + index * 2)
                     for index in range(16)],
        } for slot in range(16) if u8(tasks + slot * 0x28 + 4)]

    def mplay(name: str) -> dict:
        info = sy[f"gMPlayInfo_{name}"]
        track = sy[f"gMPlayTrack_{name}"]
        header = u32(info)
        return {
            "songHeader": header,
            "songHeaderIdentity": ident(header),
            "status": u32(info + 4),
            "tracks": [{
                "flags": u8(track + index * 0x50),
                "pan": s8(track + index * 0x50 + 0x14),
                "panX": s8(track + index * 0x50 + 0x15),
                "raw": raw_hex(track + index * 0x50, 0x50),
            } for index in range(4)],
        }

    regs = {
        "dispcnt": 0x04000000,
        "bg0cnt": 0x04000008, "bg1cnt": 0x0400000A,
        "bg2cnt": 0x0400000C, "bg3cnt": 0x0400000E,
        "bg0hofs": 0x04000010, "bg0vofs": 0x04000012,
        "bg1hofs": 0x04000014, "bg1vofs": 0x04000016,
        "bg2hofs": 0x04000018, "bg2vofs": 0x0400001A,
        "bg3hofs": 0x0400001C, "bg3vofs": 0x0400001E,
        "win0h": 0x04000040, "win0v": 0x04000044,
        "winin": 0x04000048, "winout": 0x0400004A,
        "mosaic": 0x0400004C, "bldcnt": 0x04000050,
        "bldalpha": 0x04000052, "bldy": 0x04000054,
    }

    def row(frame: int, snapshot: dict) -> dict:
        script_ptr = u32(pointer)
        in_source = start <= script_ptr < end
        attacker = u8(sy["gBattleAnimAttacker"])
        target = u8(sy["gBattleAnimTarget"])
        battler_ids = [u8(sy["gBattlerSpriteIds"] + index) for index in range(4)]
        all_sprites = live_sprites()
        return {
            "frame": frame,
            "sha256": hashlib.sha256(oracle.screen_rgb()).hexdigest(),
            "animScriptActive": bool(u8(active)),
            "scriptPtr": script_ptr,
            "scriptPtrParity": script_ptr & 1,
            "scriptPointerIdentity": ident(script_ptr),
            "scriptOwner": "Move_RAIN_DANCE" if in_source else None,
            "scriptOffset": script_ptr - start if in_source else None,
            "scriptWait": s8(names["sAnimFramesToWait"]),
            "animArgs": [s16(names["gBattleAnimArgs"] + index * 2)
                         for index in range(8)],
            "visualTaskCount": u8(sy["gAnimVisualTaskCount"]),
            "soundTaskCount": u8(sy["gAnimSoundTaskCount"]),
            "tasks": live_tasks(),
            "sprites": all_sprites,
            "rainDrops": [item for item in all_sprites
                          if item["template"]["address"] == (rain_template & ~1)],
            "spriteFlags": [u8(sprites + slot * 0x44 + 0x3e)
                            for slot in range(64)],
            "spriteOrder": [u8(names["sSpriteOrder"] + index) for index in range(64)],
            "animationBattlers": {
                "attacker": attacker, "target": target, "spriteIds": battler_ids,
            },
            "battlerSprites": {
                "attacker": sprite(battler_ids[attacker]),
                "target": sprite(battler_ids[target]),
            },
            "battlers": snapshot["battlers"],
            "parties": snapshot["parties"],
            "engine": snapshot["engine"],
            "immutableState": {key: snapshot[key] for key in (
                "rngValue", "battleOutcome", "weather", "weatherTurns",
                "sideStatuses", "sideConditions",
            )},
            "animationRng": u32(names["gRng2Value"]),
            "softwareOam": [raw_hex(software_oam + index * 8, 8)
                            for index in range(128)],
            "hardwareOam": [raw_hex(0x07000000 + index * 8, 8)
                            for index in range(128)],
            "softwareMatrices": [[s16(matrices + index * 8 + offset)
                                  for offset in (0, 2, 4, 6)]
                                 for index in range(32)],
            "hardwareMatrices": [[s16(0x07000006 + index * 0x20 + offset)
                                  for offset in (0, 8, 16, 24)]
                                 for index in range(32)],
            "fadedPalette": [u16(sy["gPlttBufferFaded"] + index * 2)
                             for index in range(512)],
            "unfadedPalette": [u16(names["gPlttBufferUnfaded"] + index * 2)
                               for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2)
                                for index in range(512)],
            "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
            "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
            "registers": {name: u16(address) for name, address in regs.items()},
            "audio": {"SE1": mplay("SE1"), "SE2": mplay("SE2")},
        }

    rows: list[dict] = []
    started = False
    done = False
    frame = 0

    def take() -> None:
        nonlocal started, done
        if done:
            return
        snapshot = lab.snapshot()
        script_ptr = u32(pointer)
        in_source = start <= script_ptr < end and bool(u8(active))
        if not started and not in_source:
            return
        started = True
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append(row(frame, snapshot))
        if not bool(u8(active)):
            done = True

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            take()
            if done:
                break
        if done:
            break
    for tail_age in range(1500):
        if done:
            break
        oracle.advance(["A"] if not started and tail_age % 30 < 2 else [])
        frame += 1
        take()

    if not rows or not done:
        raise RuntimeError("complete Rain Dance pointer window through cleanup was not observed")
    source_rows = [row for row in rows if row["scriptOwner"] == "Move_RAIN_DANCE"]
    if not source_rows or source_rows[0]["scriptOffset"] != 0:
        raise RuntimeError("Rain Dance did not begin at the authoritative even pointer")
    pointer_addresses = sorted({row["scriptPtr"] for row in rows})
    pointer_parities = sorted({row["scriptPtrParity"] for row in rows})
    output = {
        "schema": "rain-dance-dense-evidence/v1",
        "profile": "battle-scene-on",
        "move": 240,
        "setup": setup,
        "sourceWindow": {
            "startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"],
            "frameCount": len(rows), "sourceFrameCount": len(source_rows),
        },
        "sourcePointerContract": {
            "start": start, "endExclusive": end,
            "firstPointer": source_rows[0]["scriptPtr"],
            "lastSourcePointer": source_rows[-1]["scriptPtr"],
            "observedAddresses": pointer_addresses,
            "observedParities": pointer_parities,
            "sourceRowsAllEven": all(row["scriptPtrParity"] == 0 for row in source_rows),
        },
        "sourceSymbols": {
            name: names[name] for name in (
                "Move_RAIN_DANCE", "Move_BITE", "gRainDropSpriteTemplate",
                "AnimTask_CreateRaindrops", "AnimTask_BlendBattleAnimPal",
                "AnimRainDrop", "AnimRainDrop_Step",
            ) if name in names
        },
        "topology": {
            "tasks": sorted({task["func"]["symbol"] for row in rows
                              for task in row["tasks"] if task["func"]["symbol"]}),
            "templates": sorted({sprite["template"]["symbol"] for row in rows
                                  for sprite in row["sprites"] if sprite["template"]["symbol"]}),
            "callbacks": sorted({sprite["callback"]["symbol"] for row in rows
                                  for sprite in row["sprites"] if sprite["callback"]["symbol"]}),
        },
        "frames": rows,
    }
    OUTPUT.write_text(json.dumps(output, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: source {rows[0]['frame']}..{rows[-1]['frame']} ({len(rows)} rows; {len(source_rows)} source)")


if __name__ == "__main__":
    main()
