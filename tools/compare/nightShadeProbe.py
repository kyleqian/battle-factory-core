#!/usr/bin/env python3
"""Pointer-bounded dense Scene-ON receipt for legal MOVE_NIGHT_SHADE."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: nightShadeProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    sy = oracle.symbols
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    names = {name: address for address, name in pairs}
    by_address = {address & ~1: name for address, name in pairs}
    start, end = names["Move_NIGHT_SHADE"], names["Move_EGG_BOMB"]
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    battler_ids = sy["gBattlerSpriteIds"]
    ptr, active = names["sBattleAnimScriptPtr"], names["gAnimScriptActive"]
    visual, sound = sy["gAnimVisualTaskCount"], sy["gAnimSoundTaskCount"]
    frames_to_wait = names["sAnimFramesToWait"]
    scanline, scanline_buffers = sy["gScanlineEffect"], sy["gScanlineEffectRegBuffers"]
    faded, unfaded = sy["gPlttBufferFaded"], sy["gPlttBufferUnfaded"]
    palette_tags, tile_tags = names["sSpritePaletteTags"], names["sSpriteTileRangeTags"]
    software_oam = names["gMain"] + 0x38
    audio_symbols = [("SE1", sy["gMPlayInfo_SE1"], sy["gMPlayTrack_SE1"]), ("SE2", sy["gMPlayInfo_SE2"], sy["gMPlayTrack_SE2"])]
    RGB_DIR.mkdir(parents=True, exist_ok=True)

    def u16(a: int) -> int: return oracle.read_u8(a) | oracle.read_u8(a + 1) << 8
    def u32(a: int) -> int: return u16(a) | u16(a + 2) << 16
    def s16(a: int) -> int:
        value = u16(a)
        return value - 0x10000 if value >= 0x8000 else value
    def s8(a: int) -> int:
        value = oracle.read_u8(a)
        return value - 0x100 if value >= 0x80 else value
    def raw(a: int, n: int) -> str: return bytes(oracle.read_u8(a + i) for i in range(n)).hex()
    def identifier(address: int) -> dict: return {"address": address, "symbol": by_address.get(address & ~1)}
    def task(slot: int) -> dict:
        base = tasks + slot * 0x28
        return {"slot": slot, "func": identifier(u32(base)), "raw": raw(base, 0x28), "data": [s16(base + 8 + i * 2) for i in range(16)]}
    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        attr0, attr1, attr2 = u16(base), u16(base + 2), u16(base + 4)
        matrix_num = (attr1 >> 9) & 0x1f
        matrix = matrices + matrix_num * 8
        hardware_matrix = 0x07000006 + matrix_num * 0x20
        flags = oracle.read_u8(base + 0x3e)
        return {
            "slot": slot, "raw": raw(base, 0x44), "inUse": bool(flags & 1), "invisible": bool(flags & 4),
            "template": identifier(u32(base + 0x14)), "callback": identifier(u32(base + 0x1c)),
            "attr": [attr0, attr1, attr2], "objMode": (attr0 >> 10) & 3, "affineMode": (attr0 >> 8) & 3,
            "priority": (attr2 >> 10) & 3, "subpriority": oracle.read_u8(base + 0x43),
            "x": s16(base + 0x20), "y": s16(base + 0x22), "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "matrixNum": matrix_num, "matrix": [s16(matrix + o) for o in (0, 2, 4, 6)],
            "hardwareMatrix": [s16(hardware_matrix + o) for o in (0, 8, 16, 24)],
            "animNum": oracle.read_u8(base + 0x2a), "animCmdIndex": oracle.read_u8(base + 0x2b),
            "data": [s16(base + 0x2e + i * 2) for i in range(8)],
        }
    def audio(info: int, tracks: int) -> dict:
        return {"rawInfo": raw(info, 0x40), "songHeader": u32(info), "status": u32(info + 4),
                "tracks": [{"flags": oracle.read_u8(tracks + i * 0x50), "pan": s8(tracks + i * 0x50 + 0x14),
                            "panX": s8(tracks + i * 0x50 + 0x15), "raw": raw(tracks + i * 0x50, 0x50)} for i in range(4)]}
    def active_tasks() -> list[dict]: return [task(i) for i in range(16) if oracle.read_u8(tasks + i * 0x28 + 4)]
    def logical_sprites() -> list[dict]: return [sprite(i) for i in range(64) if oracle.read_u8(sprites + i * 0x44 + 0x3e) & 1]

    registers = {"DISPCNT": 0x04000000, "BG1CNT": 0x0400000A, "BG2CNT": 0x0400000C,
                 "BG1HOFS": 0x04000014, "BG1VOFS": 0x04000016, "BG2HOFS": 0x04000018,
                 "BG2VOFS": 0x0400001A, "BLDCNT": 0x04000050, "BLDALPHA": 0x04000052, "BLDY": 0x04000054}
    rows: list[dict] = []
    seen_pointers: list[int] = []
    started = False
    done = False

    def capture(frame: int) -> None:
        nonlocal started, done
        if done: return
        pointer = oracle.read_u32(ptr)
        seen_pointers.append(pointer)
        in_bounds = start <= pointer < end
        script_active = bool(oracle.read_u8(active))
        if not started and in_bounds and script_active: started = True
        if not started: return
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        snapshot = lab.snapshot()
        live_tasks = active_tasks()
        live_sprites = logical_sprites()
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "script": {"active": script_active, "pointer": pointer, "symbol": by_address.get(pointer & ~1),
                       "offset": pointer - start if in_bounds else None, "inBounds": in_bounds, "framesToWait": s8(frames_to_wait)},
            "visualTaskCount": oracle.read_u8(visual), "soundTaskCount": oracle.read_u8(sound),
            "tasks": live_tasks, "sprites": live_sprites,
            "battlers": [sprite(oracle.read_u8(battler_ids + i)) for i in range(2)],
            "battle": {"battlers": snapshot["battlers"], "engine": snapshot["engine"]},
            "softwareOam": [raw(software_oam + i * 8, 8) for i in range(128)],
            "hardwareOam": [raw(0x07000000 + i * 8, 8) for i in range(128)],
            "hardwareMatrices": [[s16(0x07000006 + i * 0x20 + o) for o in (0, 8, 16, 24)] for i in range(32)],
            "fadedPalette": [u16(faded + i * 2) for i in range(512)], "unfadedPalette": [u16(unfaded + i * 2) for i in range(512)],
            "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)],
            "paletteTags": [u16(palette_tags + i * 2) for i in range(16)], "tileTags": [u16(tile_tags + i * 2) for i in range(16)],
            "scanline": {"raw": raw(scanline, 0x1c), "state": oracle.read_u8(scanline + 21), "srcBuffer": oracle.read_u8(scanline + 20)},
            "scanlineBuffers": [[s16(scanline_buffers + bank * 0x780 + i * 2) for i in range(320)] for bank in range(2)],
            "registers": {name: u16(address) for name, address in registers.items()},
            "battleBg": {name: s16(sy[name]) for name in ("gBattle_BG1_X", "gBattle_BG1_Y", "gBattle_BG2_X", "gBattle_BG2_Y")},
            "audio": {name: audio(info, tracks) for name, info, tracks in audio_symbols},
        })
        if len(rows) > 1 and not script_active and not oracle.read_u8(visual) and not live_tasks: done = True

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; capture(frame)
    if not rows: raise RuntimeError("Move_NIGHT_SHADE pointer window was not observed")
    if rows[-1]["script"]["active"] or rows[-1]["visualTaskCount"] or rows[-1]["tasks"]: raise RuntimeError("inactive cleanup was not observed")
    topology = {
        "tasks": sorted({item["func"]["symbol"] for row in rows for item in row["tasks"] if item["func"]["symbol"]}),
        "templates": sorted({item["template"]["symbol"] for row in rows for item in row["sprites"] if item["template"]["symbol"]}),
        "callbacks": sorted({item["callback"]["symbol"] for row in rows for item in row["sprites"] if item["callback"]["symbol"]}),
    }
    OUTPUT.write_text(json.dumps({
        "schema": "night-shade-dense-evidence/v1", "profile": "battle-scene-on", "setup": setup,
        "sourceBounds": {"start": start, "endExclusive": end},
        "sourceSymbols": {name: names.get(name) for name in ("Move_NIGHT_SHADE", "Move_EGG_BOMB", "AnimTask_NightShadeClone", "AnimTask_NightShadeClone_Step1", "AnimTask_NightShadeClone_Step2", "AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step", "AnimTask_BlendColorCycle", "AnimTask_BlendColorCycleLoop")},
        "topology": topology, "sourceWindow": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"], "frameCount": len(rows)},
        "seenPointers": sorted(set(seen_pointers)), "frames": rows,
    }, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} frames; {rows[0]['frame']}..{rows[-1]['frame']})")


main()
