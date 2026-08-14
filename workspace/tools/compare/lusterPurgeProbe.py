#!/usr/bin/env python3
"""Capture a complete even-pointer-bounded Scene-ON MOVE_LUSTER_PURGE window.

The probe starts at the first active row whose script pointer is inside the
exclusive Move_LUSTER_PURGE interval and retains every row through the first
inactive cleanup row.  It deliberately records the full presentation surface:
tasks/data, sprites/callbacks/data, both OAM and matrix stages, all palette
stages/tags, BG/window/blend state, audio, parties/battlers, gameplay and
animation RNG, and raw RGB888.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: lusterPurgeProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents)
               if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_ID = 295
MOVE_NAME = "Move_LUSTER_PURGE"
END_NAME = "Move_MIST_BALL"


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    if setup.get("preCheckpointCaptures") != []:
        raise RuntimeError("LUSTER_PURGE unexpectedly requested pre-checkpoint captures")
    setup.pop("preCheckpointCaptures")
    RGB_DIR.mkdir(parents=True, exist_ok=True)

    nm_text = subprocess.run(["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")],
                             check=True, capture_output=True, text=True).stdout
    pairs = [(int(parts[0], 16), parts[2]) for line in nm_text.splitlines()
             if len(parts := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in parts[0])]
    nm = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}

    symbol_start, start, end = nm[MOVE_NAME], nm[MOVE_NAME] & ~1, nm[END_NAME] & ~1
    if (symbol_start, start, end) != (0x082CE517, 0x082CE516, 0x082CE62E) or start % 2 or end % 2:
        raise RuntimeError("LUSTER_PURGE even-pointer interval changed")

    sy = oracle.symbols
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    battler_ids, software_oam = sy["gBattlerSpriteIds"], nm["gMain"] + 0x38
    faded, unfaded = sy["gPlttBufferFaded"], nm["gPlttBufferUnfaded"]
    palette_tags, tile_tags = nm["sSpritePaletteTags"], nm["sSpriteTileRangeTags"]
    sprite_order = nm["sSpriteOrder"]
    script_ptr, active_ptr = nm["sBattleAnimScriptPtr"], nm["gAnimScriptActive"]
    visual_count, sound_count = sy["gAnimVisualTaskCount"], sy["gAnimSoundTaskCount"]
    anim_args = nm.get("gBattleAnimArgs")
    anim_rng = nm["gRng2Value"]
    bg_positions = {name: nm[name] for name in (
        "gBattle_BG0_X", "gBattle_BG0_Y", "gBattle_BG1_X", "gBattle_BG1_Y",
        "gBattle_BG2_X", "gBattle_BG2_Y", "gBattle_BG3_X", "gBattle_BG3_Y",
        "gBattle_WIN0H", "gBattle_WIN0V") if name in nm}
    scanline = sy.get("gScanlineEffect")
    scanline_buffers = sy.get("gScanlineEffectRegBuffers")
    se1_info, se1_tracks = sy["gMPlayInfo_SE1"], sy["gMPlayTrack_SE1"]
    se2_info, se2_tracks = sy["gMPlayInfo_SE2"], sy["gMPlayTrack_SE2"]

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

    def ident(address: int) -> dict:
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
            "template": ident(u32(base + 0x14)),
            "callback": ident(u32(base + 0x1C)),
            "animNum": u8(base + 0x2A), "animCmdIndex": u8(base + 0x2B),
            "invisible": bool(u8(base + 0x3E) & 4),
            "subpriority": u8(base + 0x43), "matrixNum": matrix_num,
            "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
            "hardwareMatrix": [s16(hardware_matrix + offset) for offset in (0, 8, 16, 24)],
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def live_sprites() -> list[dict]:
        return [sprite(slot) for slot in range(64)
                if u8(sprites + slot * 0x44 + 0x3E) & 1]

    def live_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if not u8(base + 4):
                continue
            result.append({"slot": slot, "raw": raw(base, 0x28),
                           "func": ident(u32(base)),
                           "data": [s16(base + 8 + index * 2) for index in range(16)]})
        return result

    def audio(info: int, tracks: int) -> dict:
        return {"rawInfo": raw(info, 0x40), "songHeader": u32(info),
                "status": u32(info + 4),
                "tracks": [{"flags": u8(tracks + index * 0x50),
                            "pan": s8(tracks + index * 0x50 + 0x14),
                            "panX": s8(tracks + index * 0x50 + 0x15),
                            "raw": raw(tracks + index * 0x50, 0x50)} for index in range(4)]}

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

    rows: list[dict] = []
    started = False
    complete = False

    def capture(frame: int) -> None:
        nonlocal started, complete
        if complete:
            return
        pointer = u32(script_ptr) & ~1
        active = bool(u8(active_ptr))
        snap = lab.snapshot()
        if not started:
            if snap["engine"]["currentMove"] != MOVE_ID or not active or not start <= pointer < end:
                return
            started = True
            if pointer != start:
                raise RuntimeError(f"first LUSTER_PURGE row is not script start: {pointer:#x}")
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        battler_sprite_ids = [u8(battler_ids + index) for index in range(4)]
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "scriptPtr": pointer, "scriptEven": pointer % 2 == 0,
            "scriptOffset": pointer - start if start <= pointer < end else None,
            "animScriptActive": active, "visualTaskCount": u8(visual_count),
            "soundTaskCount": u8(sound_count), "battleAnimArgs":
                [u16(anim_args + index * 2) for index in range(8)] if anim_args else None,
            "tasks": live_tasks(), "sprites": live_sprites(),
            "animationBattlers": {"attacker": u8(nm["gBattleAnimAttacker"]),
                                  "target": u8(nm["gBattleAnimTarget"]),
                                  "spriteIds": battler_sprite_ids},
            "playerSprite": sprite(battler_sprite_ids[0]),
            "opponentSprite": sprite(battler_sprite_ids[1]),
            "battlers": snap["battlers"], "parties": snap["parties"],
            "engine": snap["engine"],
            "immutableState": {key: snap[key] for key in (
                "rngValue", "battleOutcome", "weather", "weatherTurns",
                "sideStatuses", "sideConditions")},
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
            "scanline": scanline_snapshot(),
            "bg1Tiles": raw(0x06000000 + ((u16(0x0400000A) >> 2) & 3) * 0x4000, 0x800),
            "bg1Tilemap": raw(0x06000000 + ((u16(0x0400000A) >> 8) & 31) * 0x800, 0x800),
            "se1": audio(se1_info, se1_tracks), "se2": audio(se2_info, se2_tracks),
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
        raise RuntimeError("MOVE_LUSTER_PURGE complete pointer-bounded window was not captured")
    topology = {
        "templates": sorted({item["template"]["symbol"] for row in rows for item in row["sprites"]
                             if item["template"]["symbol"]}),
        "callbacks": sorted({item["callback"]["symbol"] for row in rows for item in row["sprites"]
                             if item["callback"]["symbol"]}),
        "tasks": sorted({item["func"]["symbol"] for row in rows for item in row["tasks"]
                         if item["func"]["symbol"]}),
    }
    OUTPUT.write_text(json.dumps({
        "schema": "luster-purge-dense-evidence/v1", "moveId": MOVE_ID,
        "setup": setup,
        "sourceWindow": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"],
                         "frameCount": len(rows)},
        "sourceSymbols": {MOVE_NAME: symbol_start, "evenPointerStart": start, END_NAME: end},
        "topology": topology, "frames": rows,
    }, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: {len(rows)} source frames {rows[0]['frame']}..{rows[-1]['frame']}")
    print(json.dumps(topology, separators=(",", ":")))


if __name__ == "__main__":
    main()
