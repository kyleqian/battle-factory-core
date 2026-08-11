#!/usr/bin/env python3
"""Pointer-bounded Scene-ON evidence for MOVE_DRILL_PECK."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: drillPeckProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 65


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    RGB_DIR.mkdir(parents=True)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [
        (int(parts[0], 16), parts[2])
        for line in nm.splitlines()
        if len(parts := line.split()) == 3 and all(ch in "0123456789abcdefABCDEF" for ch in parts[0])
    ]
    names = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}
    start, end = names["Move_DRILL_PECK"] & ~1, names["Move_WATERFALL"] & ~1
    symbols = oracle.symbols
    sprites, tasks, matrices = symbols["gSprites"], symbols["gTasks"], symbols["gOamMatrices"]
    battler_ids = symbols["gBattlerSpriteIds"]
    faded, unfaded = symbols["gPlttBufferFaded"], names["gPlttBufferUnfaded"]
    palette_tags, tile_tags = names["sSpritePaletteTags"], names["sSpriteTileRangeTags"]
    software_oam, script_ptr, script_active = names["gMain"] + 0x38, names["sBattleAnimScriptPtr"], symbols["gAnimScriptActive"]
    se1_info, se2_info = symbols["gMPlayInfo_SE1"], symbols["gMPlayInfo_SE2"]
    se1_tracks, se2_tracks, song_table = symbols["gMPlayTrack_SE1"], symbols["gMPlayTrack_SE2"], symbols["gSongTable"]
    template_names = ("gBowMonSpriteTemplate", "gFlashingHitSplatSpriteTemplate", "gWhirlwindLineSpriteTemplate", "gSlideMonToOriginalPosSpriteTemplate")

    def u16(address: int) -> int:
        return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value

    def raw(address: int, length: int) -> str:
        return bytes(oracle.read_u8(address + offset) for offset in range(length)).hex()

    def ident(address: int) -> dict:
        value = address & ~1
        return {"address": value, "symbol": by_address.get(value)}

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        attr0, attr1, attr2 = u16(base), u16(base + 2), u16(base + 4)
        matrix_num = attr1 >> 9 & 0x1f
        matrix = matrices + matrix_num * 8
        flags = oracle.read_u8(base + 0x3e)
        return {
            "slot": slot, "template": ident(oracle.read_u32(base + 0x14)), "callback": ident(oracle.read_u32(base + 0x1c)),
            "x": s16(base + 0x20), "y": s16(base + 0x22), "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "attr0": attr0, "attr1": attr1, "attr2": attr2, "subpriority": oracle.read_u8(base + 0x43),
            "inUse": bool(flags & 1), "invisible": bool(flags & 4), "matrixNum": matrix_num,
            "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
            "data": [s16(base + 0x2e + index * 2) for index in range(8)],
        }

    def active_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4):
                result.append({"slot": slot, "func": ident(oracle.read_u32(base)), "data": [s16(base + 8 + index * 2) for index in range(16)]})
        return result

    def player(info: int, tracks: int) -> dict:
        return {"songHeader": oracle.read_u32(info), "status": oracle.read_u32(info + 4), "tracks": [
            {"flags": oracle.read_u8(tracks + index * 0x50), "pan": s8(tracks + index * 0x50 + 0x14), "panX": s8(tracks + index * 0x50 + 0x15)}
            for index in range(4)
        ]}

    rows: list[dict] = []
    started = False
    complete = False

    def capture(frame: int) -> None:
        nonlocal started, complete
        if complete:
            return
        snapshot = lab.snapshot()
        pointer = oracle.read_u32(script_ptr)
        active = bool(oracle.read_u8(script_active))
        in_source = start <= pointer < end
        if not started:
            if snapshot["engine"]["currentMove"] != MOVE or not active or not in_source:
                return
            started = True
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        battler_slots = [oracle.read_u8(battler_ids + index) for index in (0, 1)]
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "scriptPtr": pointer, "scriptOffset": pointer - start if in_source else None, "animScriptActive": active,
            "battleAnimAttacker": oracle.read_u8(symbols["gBattleAnimAttacker"]), "battleAnimTarget": oracle.read_u8(symbols["gBattleAnimTarget"]),
            "battlers": [sprite(slot) for slot in battler_slots],
            "sprites": [sprite(slot) for slot in range(64) if sprite(slot)["inUse"]],
            "tasks": active_tasks(), "visualTaskCount": oracle.read_u8(symbols["gAnimVisualTaskCount"]), "soundTaskCount": oracle.read_u8(symbols["gAnimSoundTaskCount"]),
            "softwareOam": [raw(software_oam + index * 8, 8) for index in range(128)],
            "hardwareOam": [[u16(0x07000000 + index * 8 + offset) for offset in (0, 2, 4)] for index in range(128)],
            "hardwareMatrices": [[s16(0x07000006 + index * 0x20 + offset) for offset in (0, 8, 16, 24)] for index in range(32)],
            "fadedPalette": [u16(faded + index * 2) for index in range(512)], "unfadedPalette": [u16(unfaded + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "paletteTags": [u16(palette_tags + index * 2) for index in range(16)], "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
            "registers": {"dispcnt": u16(0x04000000), "bldcnt": u16(0x04000050), "bldalpha": u16(0x04000052), "bldy": u16(0x04000054)},
            "se1": player(se1_info, se1_tracks), "se2": player(se2_info, se2_tracks), "battlerState": snapshot["battlers"],
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
        raise RuntimeError("complete Drill Peck body through first inactive cleanup not observed")
    OUTPUT.write_text(json.dumps({
        "schema": "drill-peck-dense-evidence/v1", "move": MOVE, "setup": setup,
        "sourceBounds": {"start": start, "endExclusive": end},
        "templates": {name: names[name] for name in template_names},
        "songHeaders": {"SE_M_HEADBUTT": oracle.read_u32(song_table + 162 * 8), "SE_M_HORN_ATTACK": oracle.read_u32(song_table + 166 * 8)},
        "sourceWindow": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"], "frameCount": len(rows)}, "frames": rows,
    }, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} frames; {rows[0]['frame']}..{rows[-1]['frame']})")


if __name__ == "__main__":
    main()
