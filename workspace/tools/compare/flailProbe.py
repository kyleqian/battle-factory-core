#!/usr/bin/env python3
"""Pointer-bounded Scene-ON MOVE_FLAIL full-state and raw-RGB evidence."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) not in (4, 5):
    raise SystemExit("usage: flailProbe.py <scenario> <output.json> <rgb-dir> [expected-power]")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:4])
EXPECTED_POWER = int(sys.argv[4]) if len(sys.argv) == 5 else None
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents)
               if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_ID = 175
START = 0x082CD4F9
END = 0x082CD536


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    if setup.get("preCheckpointCaptures") != []:
        raise RuntimeError("FLAIL unexpectedly requested pre-checkpoint captures")
    setup.pop("preCheckpointCaptures")
    RGB_DIR.mkdir(parents=True, exist_ok=True)
    nm_text = subprocess.run(["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")],
                             check=True, capture_output=True, text=True).stdout
    pairs = [(int(parts[0], 16), parts[2]) for line in nm_text.splitlines()
             if len(parts := line.split()) == 3]
    nm = {name: address for address, name in pairs}
    by_address = {(address & ~1): name for address, name in pairs}
    if (nm["Move_FLAIL"], nm["Move_SPITE"]) != (START, END):
        raise RuntimeError("FLAIL pointer-isolation contract changed")

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
            "subpriority": oracle.read_u8(base + 0x43), "matrixNum": matrix_num,
            "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
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
        move_power = u16(nm["gAnimMovePower"])
        if not started:
            if (snap["engine"]["currentMove"] != MOVE_ID or not active
                    or not START <= pointer < END
                    or EXPECTED_POWER is not None and move_power != EXPECTED_POWER):
                return
            started = True
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "scriptPtr": pointer, "scriptOffset": pointer - START if START <= pointer < END else None,
            "animScriptActive": active, "scriptWait": s8(nm["sAnimFramesToWait"]),
            "visualTaskCount": oracle.read_u8(visual_count),
            "soundTaskCount": oracle.read_u8(sound_count), "tasks": live_tasks(),
            "sprites": live_sprites(), "battlerSpriteIds": [oracle.read_u8(battler_ids + i) for i in range(4)],
            "animationRng": oracle.read_u32(nm["gRng2Value"]),
            "gameplayRng": oracle.read_u32(nm["gRngValue"]),
            "animMovePower": move_power, "animMoveDmg": s16(nm["gAnimMoveDmg"]),
            "animArgs": [s16(nm["gBattleAnimArgs"] + i * 2) for i in range(8)],
            "battlers": snap["battlers"], "parties": snap["parties"], "engine": snap["engine"],
            "immutableState": {key: snap[key] for key in ("battleOutcome", "weather",
                "weatherTurns", "sideStatuses", "sideConditions")},
            "softwareOam": [raw(software_oam + i * 8, 8) for i in range(128)],
            "hardwareOam": [raw(0x07000000 + i * 8, 8) for i in range(128)],
            "softwareMatrices": [[s16(matrices + i * 8 + offset) for offset in (0, 2, 4, 6)] for i in range(32)],
            "hardwareMatrices": [[s16(0x07000006 + i * 0x20 + offset) for offset in (0, 8, 16, 24)] for i in range(32)],
            "fadedPalette": [u16(faded + i * 2) for i in range(512)],
            "unfadedPalette": [u16(unfaded + i * 2) for i in range(512)],
            "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)],
            "paletteTags": [u16(palette_tags + i * 2) for i in range(16)],
            "tileTags": [u16(tile_tags + i * 2) for i in range(128)],
            "registers": {name: u16(address) for name, address in {
                "dispcnt": 0x04000000, "bg0cnt": 0x04000008, "bg1cnt": 0x0400000A,
                "bg2cnt": 0x0400000C, "bg3cnt": 0x0400000E, "winin": 0x04000048,
                "winout": 0x0400004A, "bldcnt": 0x04000050,
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
        raise RuntimeError("MOVE_FLAIL complete pointer-bounded window was not captured")
    topology = {
        "templates": sorted({item["template"]["symbol"] for row in rows for item in row["sprites"] if item["template"]["symbol"]}),
        "callbacks": sorted({item["callback"]["symbol"] for row in rows for item in row["sprites"] if item["callback"]["symbol"]}),
        "tasks": sorted({item["func"]["symbol"] for row in rows for item in row["tasks"] if item["func"]["symbol"]}),
    }
    required = ({"gRandomPosHitSplatSpriteTemplate"},
                {"AnimTask_FlailMovement_Step", "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step"})
    if any(not need <= set(topology[key]) for need, key in zip(required, ("templates", "tasks"))):
        raise RuntimeError(f"FLAIL topology incomplete: {topology}")
    if rows[-1]["animScriptActive"] or rows[-1]["visualTaskCount"] or rows[-1]["soundTaskCount"]:
        raise RuntimeError("FLAIL first inactive cleanup retained a task")
    song_table = nm["gSongTable"]
    result = {"schema": "flail-dense-evidence/v2", "moveId": MOVE_ID,
              "expectedPower": EXPECTED_POWER, "setup": setup,
              "sourceWindow": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"], "frameCount": len(rows)},
              "sourceSymbols": {"Move_FLAIL": START, "Move_SPITE": END}, "topology": topology,
              "componentSymbols": {name: nm[name] for name in ("AnimTask_FlailMovement", "AnimTask_FlailMovement_Step",
                  "gRandomPosHitSplatSpriteTemplate", "AnimHitSplatRandom", "AnimTask_ShakeTargetBasedOnMovePowerOrDmg",
                  "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step", "gRng2Value")},
              "songHeaders": {"SE_M_HEADBUTT": oracle.read_u32(song_table + 142 * 8),
                              "SE_M_MEGA_KICK2": oracle.read_u32(song_table + 141 * 8)}, "frames": rows}
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: {len(rows)} source frames {rows[0]['frame']}..{rows[-1]['frame']}")


if __name__ == "__main__":
    main()
