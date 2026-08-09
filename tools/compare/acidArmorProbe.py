#!/usr/bin/env python3
"""Pointer-bounded dense MOVE_ACID_ARMOR Scene-ON evidence.

Records the complete Move_ACID_ARMOR..Move_SHARPEN body through its first
inactive cleanup, including every source-touched task, scanline, GPU, monbg,
OAM/matrix, palette, audio, and immutable battle-state surface.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: acidArmorProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    RGB_DIR.mkdir(parents=True, exist_ok=True)

    nm = subprocess.run(["arm-none-eabi-nm", str(reference / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    symbols = {parts[2]: int(parts[0], 16) for line in nm.splitlines() if len(parts := line.split()) == 3}
    bounds = {name: symbols[name] for name in ("Move_ACID_ARMOR", "Move_SHARPEN")}
    task_funcs = {symbols[name] | 1 for name in ("AnimTask_AcidArmor", "AnimTask_AcidArmor_Step")}
    sprites = oracle.symbols["gSprites"]
    tasks = oracle.symbols["gTasks"]
    matrices = oracle.symbols["gOamMatrices"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    scanline = oracle.symbols["gScanlineEffect"]
    buffers = oracle.symbols["gScanlineEffectRegBuffers"]
    faded = oracle.symbols["gPlttBufferFaded"]
    unfaded = oracle.symbols["gPlttBufferUnfaded"]
    se1_info = oracle.symbols["gMPlayInfo_SE1"]
    se1_tracks = oracle.symbols["gMPlayTrack_SE1"]
    song_table = oracle.symbols["gSongTable"]
    script_ptr = 0x020383F0  # static sBattleAnimScriptPtr
    software_oam = symbols["gMain"] + 0x38

    def u16(a: int) -> int:
        return oracle.read_u8(a) | (oracle.read_u8(a + 1) << 8)

    def s16(a: int) -> int:
        value = u16(a)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(a: int) -> int:
        value = oracle.read_u8(a)
        return value - 0x100 if value >= 0x80 else value

    def raw(a: int, count: int) -> str:
        return bytes(oracle.read_u8(a + i) for i in range(count)).hex()

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 0x1F
        matrix = matrices + matrix_num * 8
        hw_matrix = 0x07000006 + matrix_num * 0x20
        return {
            "slot": slot, "attr": [u16(base + i) for i in (0, 2, 4)],
            "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "invisible": bool(oracle.read_u8(base + 0x3E) & 4),
            "matrixNum": matrix_num,
            "matrix": [s16(matrix + i) for i in (0, 2, 4, 6)],
            "hardwareMatrix": [s16(hw_matrix + i) for i in (0, 8, 16, 24)],
            "data": [s16(base + 0x2E + i * 2) for i in range(8)],
        }

    def battler(index: int) -> dict:
        return sprite(oracle.read_u8(battler_ids + index))

    def acid_tasks() -> list[dict]:
        rows = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if not oracle.read_u8(base + 4):
                continue
            func = oracle.read_u32(base)
            if func in task_funcs:
                rows.append({"slot": slot, "func": func, "data": [s16(base + 8 + i * 2) for i in range(16)]})
        return rows

    rows: list[dict] = []
    started = False
    stopped = False

    def capture(frame: int) -> None:
        nonlocal started, stopped
        if stopped:
            return
        snap = lab.snapshot()
        ptr = oracle.read_u32(script_ptr)
        in_bounds = bounds["Move_ACID_ARMOR"] <= ptr < bounds["Move_SHARPEN"]
        if snap["engine"]["currentMove"] != 151 or not in_bounds:
            return
        started = True
        active = bool(oracle.read_u8(oracle.symbols["gAnimScriptActive"]))
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "animScriptActive": active, "scriptPtr": ptr,
            "engine": snap["engine"], "player": snap["battlers"]["player"], "opponent": snap["battlers"]["opponent"],
            "playerSprite": battler(0), "opponentSprite": battler(1), "tasks": acid_tasks(),
            "scanline": {
                "dmaSrcBuffers": [oracle.read_u32(scanline), oracle.read_u32(scanline + 4)],
                "dmaDest": oracle.read_u32(scanline + 8), "dmaControl": oracle.read_u32(scanline + 12),
                "setFirstScanlineReg": oracle.read_u32(scanline + 16),
                "srcBuffer": oracle.read_u8(scanline + 20), "state": oracle.read_u8(scanline + 21),
                "unused16": oracle.read_u8(scanline + 22), "unused17": oracle.read_u8(scanline + 23),
                "waveTaskId": oracle.read_u8(scanline + 24),
            },
            "scanlineBuffers": [[s16(buffers + bank * 0x780 + i * 2) for i in range(320)] for bank in range(2)],
            "registers": {name: u16(address) for name, address in {
                "DISPCNT": 0x04000000, "BG1CNT": 0x0400000A, "BG2CNT": 0x0400000C,
                "BG1HOFS": 0x04000014, "BG1VOFS": 0x04000016,
                "BG2HOFS": 0x04000018, "BG2VOFS": 0x0400001A,
                "BLDCNT": 0x04000050, "BLDALPHA": 0x04000052, "BLDY": 0x04000054,
            }.items()},
            "battleBg": {name: s16(oracle.symbols[name]) for name in ("gBattle_BG1_X", "gBattle_BG1_Y", "gBattle_BG2_X", "gBattle_BG2_Y")},
            "fadedPalette": [u16(faded + i * 2) for i in range(512)],
            "unfadedPalette": [u16(unfaded + i * 2) for i in range(512)],
            "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)],
            "softwareOam": [raw(software_oam + i * 8, 8) for i in range(128)],
            "hardwareOam": [[u16(0x07000000 + i * 8 + j) for j in (0, 2, 4)] for i in range(128)],
            "hardwareMatrices": [[s16(0x07000006 + i * 0x20 + j) for j in (0, 8, 16, 24)] for i in range(32)],
            "se1": {"songHeader": oracle.read_u32(se1_info), "status": oracle.read_u32(se1_info + 4),
                    "tracks": [{"flags": oracle.read_u8(se1_tracks + i * 0x50), "pan": s8(se1_tracks + i * 0x50 + 0x14), "panX": s8(se1_tracks + i * 0x50 + 0x15)} for i in range(3)]},
        })
        if started and not active:
            stopped = True

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)
    if not rows or rows[-1]["animScriptActive"]:
        raise RuntimeError("complete MOVE_ACID_ARMOR body was not observed")
    OUTPUT.write_text(json.dumps({
        "schema": "acid-armor-dense-evidence/v1", "setup": setup,
        "scriptBounds": bounds,
        "taskFuncs": {"AnimTask_AcidArmor": symbols["AnimTask_AcidArmor"], "AnimTask_AcidArmor_Step": symbols["AnimTask_AcidArmor_Step"]},
        "songHeaders": {"SE_M_ACID_ARMOR": oracle.read_u32(song_table + 218 * 8)},
        "frames": rows,
    }) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} move frames; {rows[0]['frame']}..{rows[-1]['frame']})")


main()
