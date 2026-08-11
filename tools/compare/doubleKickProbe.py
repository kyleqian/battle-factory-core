#!/usr/bin/env python3
"""Pointer-bounded Scene-ON MOVE_DOUBLE_KICK component/hardware/RGB evidence."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: doubleKickProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents)
               if (path / "oracle/emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_ID, START, END = 24, 0x082D2261, 0x082D2293


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    if setup.get("preCheckpointCaptures") != []:
        raise RuntimeError("DOUBLE_KICK unexpectedly requested pre-checkpoint captures")
    setup.pop("preCheckpointCaptures")
    RGB_DIR.mkdir(parents=True, exist_ok=True)
    nm_text = subprocess.run(["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")],
                             check=True, capture_output=True, text=True).stdout
    pairs = [(int(parts[0], 16), parts[2]) for line in nm_text.splitlines()
             if len(parts := line.split()) == 3]
    nm = {name: address for address, name in pairs}
    by_address = {(address & ~1): name for address, name in pairs}
    if (nm["Move_DOUBLE_KICK"], nm["Move_TRIPLE_KICK"]) != (START, END):
        raise RuntimeError("DOUBLE_KICK pointer-isolation contract changed")

    sy = oracle.symbols
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    battler_ids, software_oam = sy["gBattlerSpriteIds"], nm["gMain"] + 0x38
    faded, unfaded = sy["gPlttBufferFaded"], nm["gPlttBufferUnfaded"]
    palette_tags, tile_tags = nm["sSpritePaletteTags"], nm["sSpriteTileRangeTags"]
    script_ptr, active_ptr = nm["sBattleAnimScriptPtr"], nm["gAnimScriptActive"]
    visual_count, sound_count = sy["gAnimVisualTaskCount"], sy["gAnimSoundTaskCount"]
    se1_info, se1_tracks = sy["gMPlayInfo_SE1"], sy["gMPlayTrack_SE1"]
    se2_info, se2_tracks = sy["gMPlayInfo_SE2"], sy["gMPlayTrack_SE2"]

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
            "animDelayCounter": oracle.read_u8(base + 0x2C) & 0x3F,
            "invisible": bool(oracle.read_u8(base + 0x3E) & 4),
            "hFlip": bool(oracle.read_u8(base + 0x3F) & 1),
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
        pointer = oracle.read_u32(script_ptr)
        active = bool(oracle.read_u8(active_ptr))
        snap = lab.snapshot()
        if not started:
            if snap["engine"]["currentMove"] != MOVE_ID or not active or not START <= pointer < END:
                return
            started = True
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "scriptPtr": pointer, "scriptOffset": pointer - START if START <= pointer < END else None,
            "animScriptActive": active, "visualTaskCount": oracle.read_u8(visual_count),
            "soundTaskCount": oracle.read_u8(sound_count), "tasks": live_tasks(),
            "sprites": live_sprites(), "playerSprite": sprite(oracle.read_u8(battler_ids)),
            "opponentSprite": sprite(oracle.read_u8(battler_ids + 1)),
            "battlers": snap["battlers"], "parties": snap["parties"], "engine": snap["engine"],
            "immutableState": {key: snap[key] for key in ("battleOutcome", "weather",
                "weatherTurns", "sideStatuses", "sideConditions")},
            "animationRng": oracle.read_u32(nm["gRng2Value"]),
            "softwareOam": [raw(software_oam + index * 8, 8) for index in range(128)],
            "hardwareOam": [raw(0x07000000 + index * 8, 8) for index in range(128)],
            "softwareMatrices": [[s16(matrices + index * 8 + offset) for offset in (0, 2, 4, 6)]
                                 for index in range(32)],
            "hardwareMatrices": [[s16(0x07000006 + index * 0x20 + offset)
                                  for offset in (0, 8, 16, 24)] for index in range(32)],
            "fadedPalette": [u16(faded + index * 2) for index in range(512)],
            "unfadedPalette": [u16(unfaded + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
            "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
            "registers": {name: u16(address) for name, address in {
                "dispcnt": 0x04000000, "bldcnt": 0x04000050,
                "bldalpha": 0x04000052, "bldy": 0x04000054}.items()},
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
        raise RuntimeError("MOVE_DOUBLE_KICK complete pointer-bounded window was not captured")
    topology = {
        "templates": sorted({item["template"]["symbol"] for row in rows for item in row["sprites"]
                             if item["template"]["symbol"]}),
        "callbacks": sorted({item["callback"]["symbol"] for row in rows for item in row["sprites"]
                             if item["callback"]["symbol"]}),
        "tasks": sorted({item["func"]["symbol"] for row in rows for item in row["tasks"]
                         if item["func"]["symbol"]}),
    }
    counts = {}
    for template in ("gFistFootRandomPosSpriteTemplate", "gBasicHitSplatSpriteTemplate"):
        starts, prior = 0, set()
        for row in rows:
            current = {item["slot"] for item in row["sprites"]
                       if item["template"]["symbol"] == template}
            starts += len(current - prior)
            prior = current
        counts[template] = starts
    if counts != {"gFistFootRandomPosSpriteTemplate": 1, "gBasicHitSplatSpriteTemplate": 1}:
        raise RuntimeError(f"DOUBLE_KICK sprite lifecycle changed: {counts}")
    component_names = ("gFistFootRandomPosSpriteTemplate", "gBasicHitSplatSpriteTemplate",
                       "AnimFistOrFootRandomPos", "AnimFistOrFootRandomPos_Step",
                       "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
                       "gBattleAnimSpriteGfx_HandsAndFeet", "gBattleAnimSpritePal_HandsAndFeet",
                       "gBattleAnimSpriteGfx_Impact", "gBattleAnimSpritePal_Impact")
    OUTPUT.write_text(json.dumps({
        "schema": "double-kick-dense-evidence/v1", "moveId": MOVE_ID, "setup": setup,
        "sourceWindow": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"],
                         "frameCount": len(rows)},
        "sourceSymbols": {"Move_DOUBLE_KICK": START, "Move_TRIPLE_KICK": END},
        "componentSymbols": {name: nm[name] for name in component_names},
        "songHeaders": {"SE_M_VITAL_THROW2": oracle.read_u32(nm["gSongTable"] + 123 * 8)},
        "lifecycleCounts": counts, "topology": topology, "frames": rows,
    }, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: {len(rows)} source frames {rows[0]['frame']}..{rows[-1]['frame']}")
    print(json.dumps(topology, separators=(",", ":")))


if __name__ == "__main__":
    main()
