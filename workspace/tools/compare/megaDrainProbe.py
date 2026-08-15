#!/usr/bin/env python3
"""Capture a complete pointer-owned Scene-ON MOVE_MEGA_DRAIN evidence window.

The retained interval begins at the first real `Move_MEGA_DRAIN` pointer and
contains every subsequent animation row, including the MegaDrainAbsorbEffect
and HealingEffect calls, through the first inactive cleanup row.  This is a
capture-only instrument: it makes no staged transient battle-state changes.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path


if len(sys.argv) != 4:
    raise SystemExit("usage: megaDrainProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents)
               if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


MOVE_ID = 72
MOVE_NAME = "Move_MEGA_DRAIN"
MOVE_END_NAME = "MegaDrainAbsorbEffect"
EFFECT_NAME = "MegaDrainAbsorbEffect"
EFFECT_END_NAME = "Move_GIGA_DRAIN"
HEALING_NAME = "HealingEffect"
HEALING_END_NAME = "HealingEffect2"


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    if setup.get("preCheckpointCaptures") != []:
        raise RuntimeError("MEGA_DRAIN unexpectedly requested pre-checkpoint captures")
    setup.pop("preCheckpointCaptures")
    RGB_DIR.mkdir(parents=True, exist_ok=True)

    nm_text = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")],
        check=True, capture_output=True, text=True,
    ).stdout
    pairs = [
        (int(parts[0], 16), parts[2])
        for line in nm_text.splitlines()
        if len(parts := line.split()) == 3
        and all(char in "0123456789abcdefABCDEF" for char in parts[0])
    ]
    nm = {name: address for address, name in pairs}
    by_address = {address & ~1: name for address, name in pairs}

    # Battle-animation scripts are byte streams, not Thumb function pointers:
    # nested labels legitimately begin at odd addresses.  Keep their literal
    # pointer values so the receipt can distinguish script ownership exactly.
    move_symbol, move_start, move_end = nm[MOVE_NAME], nm[MOVE_NAME], nm[MOVE_END_NAME]
    effect_symbol, effect_start, effect_end = nm[EFFECT_NAME], nm[EFFECT_NAME], nm[EFFECT_END_NAME]
    healing_symbol, healing_start, healing_end = nm[HEALING_NAME], nm[HEALING_NAME], nm[HEALING_END_NAME]
    expected = (
        (move_symbol, move_start, move_end),
        (effect_symbol, effect_start, effect_end),
        (healing_symbol, healing_start, healing_end),
    )
    if expected != (
        (0x082D10B2, 0x082D10B2, 0x082D1121),
        (0x082D1121, 0x082D1121, 0x082D1242),
        (0x082D79DF, 0x082D79DF, 0x082D7A28),
    ):
        raise RuntimeError(f"MEGA_DRAIN source pointer bounds changed: {expected!r}")

    sy = oracle.symbols
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    battler_ids, software_oam = sy["gBattlerSpriteIds"], nm["gMain"] + 0x38
    faded, unfaded = sy["gPlttBufferFaded"], nm["gPlttBufferUnfaded"]
    palette_tags, tile_tags = nm["sSpritePaletteTags"], nm["sSpriteTileRangeTags"]
    sprite_order = nm["sSpriteOrder"]
    script_ptr, active_ptr = nm["sBattleAnimScriptPtr"], nm["gAnimScriptActive"]
    visual_count, sound_count = sy["gAnimVisualTaskCount"], sy["gAnimSoundTaskCount"]
    anim_args, anim_rng = nm["gBattleAnimArgs"], nm["gRng2Value"]
    bg_positions = {name: nm[name] for name in (
        "gBattle_BG0_X", "gBattle_BG0_Y", "gBattle_BG1_X", "gBattle_BG1_Y",
        "gBattle_BG2_X", "gBattle_BG2_Y", "gBattle_BG3_X", "gBattle_BG3_Y",
        "gBattle_WIN0H", "gBattle_WIN0V") if name in nm}
    scanline, scanline_buffers = sy.get("gScanlineEffect"), sy.get("gScanlineEffectRegBuffers")
    channels = {
        name.lower(): (sy[f"gMPlayInfo_{name}"], sy[f"gMPlayTrack_{name}"])
        for name in ("SE1", "SE2")
    }
    song_headers = {
        "SE_M_ABSORB": nm["se_m_absorb"],
        "SE_M_BUBBLE3": nm["se_m_bubble3"],
        "SE_M_ABSORB_2": nm["se_m_absorb_2"],
    }

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
        return bytes(u8(address + index) for index in range(size)).hex()

    def ident(address: int) -> dict[str, int | str | None]:
        return {"address": address, "symbol": by_address.get(address & ~1)}

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 0x1F
        matrix = matrices + matrix_num * 8
        hardware_matrix = 0x07000006 + matrix_num * 0x20
        return {
            "slot": slot, "raw": raw(base, 0x44),
            "attr": [u16(base + offset) for offset in (0, 2, 4)],
            "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "template": ident(u32(base + 0x14)), "callback": ident(u32(base + 0x1C)),
            "animNum": u8(base + 0x2A), "animCmdIndex": u8(base + 0x2B),
            "invisible": bool(u8(base + 0x3E) & 4), "subpriority": u8(base + 0x43),
            "matrixNum": matrix_num,
            "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
            "hardwareMatrix": [s16(hardware_matrix + offset) for offset in (0, 8, 16, 24)],
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def live_sprites() -> list[dict]:
        return [sprite(slot) for slot in range(64) if u8(sprites + slot * 0x44 + 0x3E) & 1]

    def live_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if u8(base + 4):
                result.append({"slot": slot, "raw": raw(base, 0x28), "func": ident(u32(base)),
                               "data": [s16(base + 8 + index * 2) for index in range(16)]})
        return result

    def matrices_snapshot() -> dict:
        return {
            "software": [[s16(matrices + index * 8 + offset) for offset in (0, 2, 4, 6)]
                         for index in range(32)],
            "hardware": [[s16(0x07000006 + index * 0x20 + offset) for offset in (0, 8, 16, 24)]
                         for index in range(32)],
        }

    def scanline_snapshot() -> dict | None:
        if scanline is None or scanline_buffers is None:
            return None
        return {
            "state": raw(scanline, 0x1C),
            "buffers": [[s16(scanline_buffers + bank * 0x780 + index * 2) for index in range(320)]
                        for bank in range(2)],
        }

    def audio(info: int, tracks: int) -> dict:
        header = u32(info)
        return {
            "rawInfo": raw(info, 0x40), "songHeader": header,
            "songHeaderIdentity": ident(header), "status": u32(info + 4),
            "tracks": [
                {"flags": u8(tracks + index * 0x50),
                 "pan": s8(tracks + index * 0x50 + 0x14),
                 "panX": s8(tracks + index * 0x50 + 0x15),
                 "raw": raw(tracks + index * 0x50, 0x50)}
                for index in range(4)
            ],
        }

    regs = {
        "dispcnt": 0x04000000, "bg0cnt": 0x04000008, "bg1cnt": 0x0400000A,
        "bg2cnt": 0x0400000C, "bg3cnt": 0x0400000E,
        "bg0hofs": 0x04000010, "bg0vofs": 0x04000012,
        "bg1hofs": 0x04000014, "bg1vofs": 0x04000016,
        "bg2hofs": 0x04000018, "bg2vofs": 0x0400001A,
        "bg3hofs": 0x0400001C, "bg3vofs": 0x0400001E,
        "win0h": 0x04000040, "win0v": 0x04000044,
        "winin": 0x04000048, "winout": 0x0400004A,
        "bldcnt": 0x04000050, "bldalpha": 0x04000052, "bldy": 0x04000054,
    }

    def background_memory() -> dict:
        result = {}
        for bank in range(4):
            cnt = u16(0x04000008 + bank * 2)
            tile_base = 0x06000000 + ((cnt >> 2) & 3) * 0x4000
            map_base = 0x06000000 + ((cnt >> 8) & 31) * 0x800
            result[f"bg{bank}"] = {
                "cnt": cnt, "tileBase": tile_base, "mapBase": map_base,
                "tiles": raw(tile_base, 0x800), "tilemap": raw(map_base, 0x800),
            }
        return result

    def script_owner(pointer: int) -> str | None:
        if move_start <= pointer < move_end:
            return MOVE_NAME
        if effect_start <= pointer < effect_end:
            return EFFECT_NAME
        if healing_start <= pointer < healing_end:
            return HEALING_NAME
        return None

    def script_owner_offset(pointer: int) -> int | None:
        if move_start <= pointer < move_end:
            return pointer - move_start
        if effect_start <= pointer < effect_end:
            return pointer - effect_start
        if healing_start <= pointer < healing_end:
            return pointer - healing_start
        return None

    rows: list[dict] = []
    started = False
    complete = False

    def capture(frame: int) -> None:
        nonlocal started, complete
        if complete:
            return
        pointer = u32(script_ptr)
        active = bool(u8(active_ptr))
        snap = lab.snapshot()
        if not started:
            if snap["engine"]["currentMove"] != MOVE_ID or not active or pointer != move_start:
                return
            started = True
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        battler_sprite_ids = [u8(battler_ids + index) for index in range(4)]
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "scriptPtr": pointer, "scriptEven": pointer % 2 == 0,
            "scriptOwner": script_owner(pointer),
            "scriptOffset": pointer - move_start if move_start <= pointer < move_end else None,
            "scriptOwnerOffset": script_owner_offset(pointer),
            "animScriptActive": active, "visualTaskCount": u8(visual_count),
            "soundTaskCount": u8(sound_count),
            "battleAnimArgs": [u16(anim_args + index * 2) for index in range(8)],
            "tasks": live_tasks(), "sprites": live_sprites(),
            "animationBattlers": {
                "attacker": u8(nm["gBattleAnimAttacker"]), "target": u8(nm["gBattleAnimTarget"]),
                "spriteIds": battler_sprite_ids,
            },
            "playerSprite": sprite(battler_sprite_ids[0]), "opponentSprite": sprite(battler_sprite_ids[1]),
            "battlers": snap["battlers"], "parties": snap["parties"], "engine": snap["engine"],
            "immutableState": {key: snap[key] for key in (
                "rngValue", "battleOutcome", "weather", "weatherTurns", "sideStatuses", "sideConditions")},
            "animationRng": u32(anim_rng),
            "softwareOam": [raw(software_oam + index * 8, 8) for index in range(128)],
            "hardwareOam": [raw(0x07000000 + index * 8, 8) for index in range(128)],
            "spriteOrder": [u8(sprite_order + index) for index in range(64)],
            "matrices": matrices_snapshot(),
            "fadedPalette": [u16(faded + index * 2) for index in range(512)],
            "unfadedPalette": [u16(unfaded + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
            "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
            "registers": {name: u16(address) for name, address in regs.items()},
            "backgroundPositions": {name: s16(address) for name, address in bg_positions.items()},
            "backgroundMemory": background_memory(), "scanline": scanline_snapshot(),
            **{name: audio(info, tracks) for name, (info, tracks) in channels.items()},
        })
        if started and not active:
            complete = True

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)
            if complete:
                break
        if complete:
            break
    if not rows or not complete:
        raise RuntimeError("MOVE_MEGA_DRAIN complete pointer-owned window was not captured")
    topology = {
        "templates": sorted({item["template"]["symbol"] for row in rows for item in row["sprites"]
                             if item["template"]["symbol"]}),
        "callbacks": sorted({item["callback"]["symbol"] for row in rows for item in row["sprites"]
                             if item["callback"]["symbol"]}),
        "tasks": sorted({item["func"]["symbol"] for row in rows for item in row["tasks"]
                         if item["func"]["symbol"]}),
    }
    OUTPUT.write_text(json.dumps({
        "schema": "mega-drain-dense-evidence/v1", "moveId": MOVE_ID, "setup": setup,
        "sourceWindow": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"],
                         "frameCount": len(rows)},
        "sourceSymbols": {
            MOVE_NAME: move_symbol, "evenPointerStart": move_start, MOVE_END_NAME: move_end,
            EFFECT_NAME: effect_symbol, EFFECT_END_NAME: effect_end,
            HEALING_NAME: healing_symbol, HEALING_END_NAME: healing_end,
        },
        "songHeaders": song_headers, "topology": topology, "frames": rows,
    }, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: {len(rows)} source frames {rows[0]['frame']}..{rows[-1]['frame']}")
    print(json.dumps(topology, separators=(",", ":")))


if __name__ == "__main__":
    main()
