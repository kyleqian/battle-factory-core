#!/usr/bin/env python3
"""Pointer-bounded Scene-ON MOVE_HEAT_WAVE hardware/audio/raw-RGB evidence."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: heatWaveProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents)
               if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_ID = 257
MOVE_NAME = "Move_HEAT_WAVE"
END_NAME = "Move_HAIL"


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    if setup.get("preCheckpointCaptures") != []:
        raise RuntimeError("HEAT_WAVE unexpectedly requested pre-checkpoint captures")
    setup.pop("preCheckpointCaptures")
    RGB_DIR.mkdir(parents=True, exist_ok=True)
    nm_text = subprocess.run(["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")],
                             check=True, capture_output=True, text=True).stdout
    pairs = [(int(parts[0], 16), parts[2]) for line in nm_text.splitlines()
             if len(parts := line.split()) == 3]
    nm = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}
    start, end = nm[MOVE_NAME], nm[END_NAME]
    if (start, end) != (0x082CDBC6, 0x082CDC76):
        raise RuntimeError("HEAT_WAVE pointer-isolation contract changed")

    sy = oracle.symbols
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    battler_ids, software_oam = sy["gBattlerSpriteIds"], nm["gMain"] + 0x38
    faded, unfaded = sy["gPlttBufferFaded"], nm["gPlttBufferUnfaded"]
    palette_tags, tile_tags = nm["sSpritePaletteTags"], nm["sSpriteTileRangeTags"]
    sprite_order = nm["sSpriteOrder"]
    script_ptr, active_ptr = nm["sBattleAnimScriptPtr"], nm["gAnimScriptActive"]
    visual_count, sound_count = sy["gAnimVisualTaskCount"], sy["gAnimSoundTaskCount"]
    se1_info, se1_tracks = sy["gMPlayInfo_SE1"], sy["gMPlayTrack_SE1"]
    se2_info, se2_tracks = sy["gMPlayInfo_SE2"], sy["gMPlayTrack_SE2"]
    bg_positions = {name: nm[name] for name in (
        "gBattle_BG0_X", "gBattle_BG0_Y", "gBattle_BG1_X", "gBattle_BG1_Y",
        "gBattle_BG2_X", "gBattle_BG2_Y", "gBattle_BG3_X", "gBattle_BG3_Y")}

    def u16(address: int) -> int:
        return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value

    def raw(address: int, size: int) -> str:
        return bytes(oracle.read_u8(address + index) for index in range(size)).hex()

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
            "template": ident(oracle.read_u32(base + 0x14)),
            "callback": ident(oracle.read_u32(base + 0x1C)),
            "animNum": oracle.read_u8(base + 0x2A),
            "animCmdIndex": oracle.read_u8(base + 0x2B),
            "invisible": bool(oracle.read_u8(base + 0x3E) & 4),
            "subpriority": oracle.read_u8(base + 0x43), "matrixNum": matrix_num,
            "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
            "hardwareMatrix": [s16(hardware_matrix + offset) for offset in (0, 8, 16, 24)],
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def live_sprites() -> list[dict]:
        return [sprite(slot) for slot in range(64)
                if oracle.read_u8(sprites + slot * 0x44 + 0x3E) & 1]

    def live_tasks() -> list[dict]:
        return [{"slot": slot, "raw": raw(base, 0x28),
                 "func": ident(oracle.read_u32(base)),
                 "data": [s16(base + 8 + index * 2) for index in range(16)]}
                for slot in range(16)
                if oracle.read_u8((base := tasks + slot * 0x28) + 4)]

    def audio(info: int, tracks: int) -> dict:
        return {"rawInfo": raw(info, 0x40), "songHeader": oracle.read_u32(info),
                "status": oracle.read_u32(info + 4),
                "tracks": [{"flags": oracle.read_u8(tracks + index * 0x50),
                            "pan": s8(tracks + index * 0x50 + 0x14),
                            "panX": s8(tracks + index * 0x50 + 0x15),
                            "raw": raw(tracks + index * 0x50, 0x50)} for index in range(3)]}

    rows: list[dict] = []
    started = False
    complete = False

    def capture(frame: int) -> None:
        nonlocal started, complete
        if complete:
            return
        pointer = oracle.read_u32(script_ptr) & ~1
        active = bool(oracle.read_u8(active_ptr))
        snap = lab.snapshot()
        if not started:
            if snap["engine"]["currentMove"] != MOVE_ID or not active or not start <= pointer < end:
                return
            started = True
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "scriptPtr": pointer, "scriptOffset": pointer - start if start <= pointer < end else None,
            "animScriptActive": active, "visualTaskCount": oracle.read_u8(visual_count),
            "soundTaskCount": oracle.read_u8(sound_count), "tasks": live_tasks(),
            "sprites": live_sprites(), "playerSprite": sprite(oracle.read_u8(battler_ids)),
            "opponentSprite": sprite(oracle.read_u8(battler_ids + 1)),
            "battlers": snap["battlers"], "parties": snap["parties"], "engine": snap["engine"],
            "immutableState": {key: snap[key] for key in ("rngValue", "battleOutcome", "weather",
                "weatherTurns", "sideStatuses", "sideConditions")},
            "softwareOam": [raw(software_oam + index * 8, 8) for index in range(128)],
            "hardwareOam": [raw(0x07000000 + index * 8, 8) for index in range(128)],
            "spriteOrder": [oracle.read_u8(sprite_order + index) for index in range(64)],
            "hardwareMatrices": [[s16(0x07000006 + index * 0x20 + offset)
                                  for offset in (0, 8, 16, 24)] for index in range(32)],
            "fadedPalette": [u16(faded + index * 2) for index in range(512)],
            "unfadedPalette": [u16(unfaded + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
            "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
            "registers": {name: u16(address) for name, address in {
                "dispcnt": 0x04000000, "bg0cnt": 0x04000008, "bg1cnt": 0x0400000A,
                "bg2cnt": 0x0400000C, "bg3cnt": 0x0400000E, "winin": 0x04000048,
                "winout": 0x0400004A, "bldcnt": 0x04000050,
                "bldalpha": 0x04000052, "bldy": 0x04000054}.items()},
            "backgroundPositions": {name: s16(address) for name, address in bg_positions.items()},
            "se1": audio(se1_info, se1_tracks), "se2": audio(se2_info, se2_tracks),
        })
        if not active:
            complete = True

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)
    if not rows or not complete:
        raise RuntimeError("MOVE_HEAT_WAVE complete pointer-bounded window was not captured")
    topology = {
        "templates": sorted({item["template"]["symbol"] for row in rows for item in row["sprites"]
                             if item["template"]["symbol"]}),
        "callbacks": sorted({item["callback"]["symbol"] for row in rows for item in row["sprites"]
                             if item["callback"]["symbol"]}),
        "tasks": sorted({item["func"]["symbol"] for row in rows for item in row["tasks"]
                         if item["func"]["symbol"]}),
    }
    starts = 0
    prior: set[int] = set()
    for row in rows:
        current = {item["slot"] for item in row["sprites"]
                   if item["template"]["symbol"] == "gFlyingSandCrescentSpriteTemplate"}
        starts += len(current - prior)
        prior = current
    if starts != 7:
        raise RuntimeError(f"HEAT_WAVE flying-dirt lifecycle changed: {starts}")
    OUTPUT.write_text(json.dumps({
        "schema": "heat-wave-dense-evidence/v1", "moveId": MOVE_ID, "setup": setup,
        "sourceWindow": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"],
                         "frameCount": len(rows)},
        "sourceSymbols": {MOVE_NAME: start, END_NAME: end},
        "lifecycleCounts": {"gFlyingSandCrescentSpriteTemplate": starts},
        "topology": topology, "frames": rows,
    }, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: {len(rows)} source frames {rows[0]['frame']}..{rows[-1]['frame']}")
    print(json.dumps(topology, separators=(",", ":")))


if __name__ == "__main__":
    main()
