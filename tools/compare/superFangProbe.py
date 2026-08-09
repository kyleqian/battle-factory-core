#!/usr/bin/env python3
"""Pointer-bounded dense MOVE_SUPER_FANG Scene-ON evidence."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: superFangProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB_DIR = (Path(value) for value in sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents)
               if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_ID = 162
MOVE_START = 0x082CD35A
MOVE_END = 0x082CD3DB


def stage_raticate_set_302(request: dict) -> None:
    """Replace the existing complete ZUBAT carrier with Factory set 302.

    The fixture bases already provide complete three-mon legal parties and an
    ONIX target in both directions.  Player input chooses set 302's first
    move; the AI's four slots are intentionally SUPER_FANG, the standard
    mechanic-lab legal-choice constraint (the source record remains stated in
    the evidence receipt).
    """
    for side in ("player", "opponent"):
        mon = request["overrides"]["parties"][side][0]
        if mon["species"] != 41:
            continue
        mon.update({
            "species": 20,
            "level": 50,
            "nature": 3,  # NATURE_ADAMANT
            "ivs": {"hp": 31, "attack": 31, "defense": 31,
                    "speed": 31, "spAttack": 31, "spDefense": 31},
            "evs": {"hp": 0, "attack": 255, "defense": 0,
                    "speed": 255, "spAttack": 0, "spDefense": 0},
            "moves": ([MOVE_ID] * 4 if side == "opponent"
                      else [MOVE_ID, 158, 247, 184]),
            "ppUps": [0, 0, 0, 0],
            "item": 196,  # ITEM_FOCUS_BAND
            "abilitySlot": 0,
            "friendship": 70,
            "gender": "male",
            "shiny": False,
        })


def main() -> None:
    request = json.loads(SCENARIO.read_text())
    stage_raticate_set_302(request)
    request = validate_request(request, "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    RGB_DIR.mkdir()

    nm = subprocess.run(["arm-none-eabi-nm", str(reference / "pokeemerald.elf")],
                        check=True, capture_output=True, text=True).stdout
    symbols = {parts[2]: int(parts[0], 16)
               for line in nm.splitlines() if len(parts := line.split()) == 3}
    funcs = {name: symbols[name] | 1 for name in (
        "AnimTask_ShakeMonInPlace", "AnimTask_ShakeMonInPlace_Step",
        "AnimTask_BlendMonInAndOut", "AnimTask_BlendMonInAndOut_Step",
        "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step",
        "AnimSuperFang", "DoHorizontalLunge", "AnimComplexPaletteBlend",
        "AnimComplexPaletteBlend_Step1", "AnimComplexPaletteBlend_Step2",
    )}
    templates = {name: oracle.symbols[name] for name in (
        "gSuperFangSpriteTemplate", "gHorizontalLungeSpriteTemplate",
        "gComplexPaletteBlendSpriteTemplate",
    )}
    sprites = oracle.symbols["gSprites"]
    tasks = oracle.symbols["gTasks"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    active = oracle.symbols["gAnimScriptActive"]
    visual_count = oracle.symbols["gAnimVisualTaskCount"]
    sound_count = oracle.symbols["gAnimSoundTaskCount"]
    faded = oracle.symbols["gPlttBufferFaded"]
    unfaded = oracle.symbols["gPlttBufferUnfaded"]
    se1_info = oracle.symbols["gMPlayInfo_SE1"]
    se1_tracks = oracle.symbols["gMPlayTrack_SE1"]
    song_table = oracle.symbols["gSongTable"]

    def u16(address: int) -> int:
        return oracle.read_u8(address) | (oracle.read_u8(address + 1) << 8)

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value

    def raw(address: int, size: int) -> str:
        return bytes(oracle.read_u8(address + offset) for offset in range(size)).hex()

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 0x1F
        matrix = oracle.symbols["gOamMatrices"] + matrix_num * 8
        hardware_matrix = 0x07000006 + matrix_num * 0x20
        return {
            "slot": slot, "attr": [u16(base), u16(base + 2), u16(base + 4)],
            "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "template": oracle.read_u32(base + 0x14),
            "callback": oracle.read_u32(base + 0x1C),
            "animNum": oracle.read_u8(base + 0x2A),
            "animCmdIndex": oracle.read_u8(base + 0x2B),
            "animDelayCounter": oracle.read_u8(base + 0x2C) & 0x3F,
            "sheetTileStart": u16(base + 0x40),
            "subpriority": oracle.read_u8(base + 0x43),
            "matrixNum": matrix_num,
            "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
            "hardwareMatrix": [s16(hardware_matrix + offset) for offset in (0, 8, 16, 24)],
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def active_tasks() -> list[dict]:
        return [{"slot": slot, "func": oracle.read_u32(tasks + slot * 0x28),
                 "data": [s16(tasks + slot * 0x28 + 8 + index * 2)
                          for index in range(16)]}
                for slot in range(16) if oracle.read_u8(tasks + slot * 0x28 + 4)]

    rows: list[dict] = []
    source_started = False
    cleanup_captured = False

    def capture(frame: int) -> None:
        nonlocal source_started, cleanup_captured
        pointer = oracle.read_u32(symbols["sBattleAnimScriptPtr"])
        script_active = bool(oracle.read_u8(active))
        snap = lab.snapshot()
        source_active = (script_active and snap["engine"]["currentMove"] == MOVE_ID
                         and MOVE_START <= pointer < MOVE_END)
        if source_active:
            source_started = True
        if not source_started or cleanup_captured:
            return
        if not script_active:
            cleanup_captured = True
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        active_sprites = [sprite(slot) for slot in range(64)
                          if oracle.read_u8(sprites + slot * 0x44 + 0x3E) & 1]
        battler_slots = [oracle.read_u8(battler_ids + index) for index in range(2)]
        rows.append({
            "frame": frame, "sourceActive": source_active,
            "scriptPointer": pointer, "sha256": hashlib.sha256(rgb).hexdigest(),
            "currentMove": snap["engine"]["currentMove"],
            "activeBattler": snap["engine"]["activeBattler"],
            "player": snap["battlers"]["player"], "opponent": snap["battlers"]["opponent"],
            "animScriptActive": script_active,
            "visualTaskCount": oracle.read_u8(visual_count),
            "soundTaskCount": oracle.read_u8(sound_count),
            "tasks": active_tasks(),
            "battlerSprites": [sprite(slot) for slot in battler_slots],
            "moveSprites": [value for value in active_sprites
                            if value["template"] in templates.values()],
            "fadedPalette": [u16(faded + index * 2) for index in range(512)],
            "unfadedPalette": [u16(unfaded + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "softwareOam": raw(symbols["gMain"] + 0x38, 0x400),
            "hardwareOam": raw(0x07000000, 0x400),
            "dispcnt": u16(0x04000000), "bldcnt": u16(0x04000050),
            "bldalpha": u16(0x04000052), "bldy": u16(0x04000054),
            "se1": {"songHeader": oracle.read_u32(se1_info),
                    "status": oracle.read_u32(se1_info + 4),
                    "tracks": [{"flags": oracle.read_u8(se1_tracks + index * 0x50),
                                "pan": s8(se1_tracks + index * 0x50 + 0x14),
                                "panX": s8(se1_tracks + index * 0x50 + 0x15)}
                               for index in range(3)]},
        })

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)

    active_rows = [row for row in rows if row["sourceActive"]]
    OUTPUT.write_text(json.dumps({
        "schema": "super-fang-dense-evidence/v1", "setup": setup,
        "staging": {"carrierSet": 302, "carrier": "RATICATE", "nature": "ADAMANT",
                    "evs": ["SPEED", "ATTACK"], "item": "FOCUS_BAND",
                    "sourceMoves": [162, 158, 247, 184]},
        "source": {"moveStart": MOVE_START, "moveEnd": MOVE_END,
                   "script": "Move_SUPER_FANG 0x082cd35a .. Move_SLASH 0x082cd3db"},
        "symbols": {**funcs, **templates},
        "songHeaders": {"SE_M_DRAGON_RAGE": oracle.read_u32(song_table + 163 * 8),
                        "SE_M_BITE": oracle.read_u32(song_table + 161 * 8)},
        "sourceWindow": {"startFrame": active_rows[0]["frame"] if active_rows else None,
                         "endFrame": active_rows[-1]["frame"] if active_rows else None,
                         "frameCount": len(active_rows),
                         "cleanupFrame": rows[-1]["frame"] if cleanup_captured and rows else None},
        "frames": rows,
    }) + "\n")
    print(f"wrote {OUTPUT} ({len(active_rows)} source frames; "
          f"{active_rows[0]['frame'] if active_rows else '-'}.."
          f"{active_rows[-1]['frame'] if active_rows else '-'})")


main()
