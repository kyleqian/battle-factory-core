#!/usr/bin/env python3
"""Pointer-bounded Scene-ON evidence for MOVE_ROLE_PLAY."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: rolePlayProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
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
    RGB_DIR.mkdir()

    nm = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")],
        check=True, capture_output=True, text=True,
    ).stdout
    raw_symbols = {line.split()[2]: int(line.split()[0], 16) for line in nm.splitlines() if len(line.split()) == 3}
    funcs = {name: address | 1 for name, address in raw_symbols.items()}
    start = raw_symbols["Move_ROLE_PLAY"] & ~1
    end = raw_symbols["Move_REFRESH"] & ~1
    additional_template = raw_symbols["sSpriteTemplates_MoveEffectMons"]
    simple_blend_template = oracle.symbols["gSimplePaletteBlendSpriteTemplate"]
    task_names = (
        "AnimTask_BlendBattleAnimPal",
        "StartBlendAnimSpriteColor",
        "AnimTask_BlendSpriteColor_Step2",
        "AnimTask_RolePlaySilhouette",
        "AnimTask_RolePlaySilhouette_Step1",
        "AnimTask_RolePlaySilhouette_Step2",
        "DestroyAnimVisualTaskAndDisableBlend",
    )

    sprites = oracle.symbols["gSprites"]
    matrices = oracle.symbols["gOamMatrices"]
    tasks = oracle.symbols["gTasks"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    faded = oracle.symbols["gPlttBufferFaded"]
    unfaded = oracle.symbols["gPlttBufferUnfaded"]
    palette_tags = raw_symbols["sSpritePaletteTags"]
    tile_tags = raw_symbols["sSpriteTileRangeTags"]
    software_oam = raw_symbols["gMain"] + 0x38
    script_ptr_addr = raw_symbols["sBattleAnimScriptPtr"]
    visual_count = oracle.symbols["gAnimVisualTaskCount"]
    sound_count = oracle.symbols["gAnimSoundTaskCount"]
    active_addr = oracle.symbols["gAnimScriptActive"]
    se1_info, se1_tracks = oracle.symbols["gMPlayInfo_SE1"], oracle.symbols["gMPlayTrack_SE1"]
    se2_info, se2_tracks = oracle.symbols["gMPlayInfo_SE2"], oracle.symbols["gMPlayTrack_SE2"]
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
        return bytes(oracle.read_u8(address + index) for index in range(size)).hex()

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        attr0, attr1, attr2 = u16(base), u16(base + 2), u16(base + 4)
        matrix_num = (attr1 >> 9) & 0x1f
        matrix = matrices + matrix_num * 8
        hardware_matrix = 0x07000006 + matrix_num * 0x20
        flags = oracle.read_u8(base + 0x3e)
        return {
            "slot": slot, "template": oracle.read_u32(base + 0x14), "callback": oracle.read_u32(base + 0x1c),
            "x": s16(base + 0x20), "y": s16(base + 0x22), "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "attr0": attr0, "attr1": attr1, "attr2": attr2, "subpriority": oracle.read_u8(base + 0x43),
            "inUse": bool(flags & 1), "invisible": bool(flags & 4), "matrixNum": matrix_num,
            "objMode": (attr0 >> 10) & 3, "affineMode": (attr0 >> 8) & 3,
            "animNum": oracle.read_u8(base + 0x2a), "animCmdIndex": oracle.read_u8(base + 0x2b),
            "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
            "hardwareMatrix": [s16(hardware_matrix + offset) for offset in (0, 8, 16, 24)],
            "data": [s16(base + 0x2e + index * 2) for index in range(8)],
        }

    def battler(index: int) -> dict:
        return sprite(oracle.read_u8(battler_ids + index))

    def active_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4):
                result.append({"slot": slot, "func": oracle.read_u32(base), "data": [s16(base + 8 + index * 2) for index in range(16)]})
        return result

    def player(info: int, tracks: int) -> dict:
        return {
            "songHeader": oracle.read_u32(info), "status": oracle.read_u32(info + 4),
            "tracks": [{"flags": oracle.read_u8(tracks + index * 0x50), "pan": s8(tracks + index * 0x50 + 0x14), "panX": s8(tracks + index * 0x50 + 0x15)} for index in range(4)],
        }

    rows: list[dict] = []
    started = False
    complete = False

    def capture(frame: int) -> None:
        nonlocal started, complete
        if complete:
            return
        snapshot = lab.snapshot()
        pointer = oracle.read_u32(script_ptr_addr)
        active = bool(oracle.read_u8(active_addr))
        in_source = start <= pointer < end
        if not started:
            if snapshot["engine"]["currentMove"] != 272 or not active or not in_source:
                return
            started = True
        interesting_sprites = []
        for slot in range(64):
            item = sprite(slot)
            if item["inUse"] and item["template"] in (additional_template, simple_blend_template):
                interesting_sprites.append(item)
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "scriptPtr": pointer, "scriptOffset": pointer - start if in_source else None, "animScriptActive": active,
            "player": snapshot["battlers"]["player"], "opponent": snapshot["battlers"]["opponent"],
            "playerSprite": battler(0), "opponentSprite": battler(1), "sprites": interesting_sprites,
            "tasks": active_tasks(), "visualTaskCount": oracle.read_u8(visual_count), "soundTaskCount": oracle.read_u8(sound_count),
            "fadedPalette": [u16(faded + index * 2) for index in range(512)],
            "unfadedPalette": [u16(unfaded + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
            "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
            "softwareOam": [raw(software_oam + index * 8, 8) for index in range(128)],
            "hardwareOam": [[u16(0x07000000 + index * 8 + offset) for offset in (0, 2, 4)] for index in range(128)],
            "hardwareMatrices": [[s16(0x07000006 + index * 0x20 + offset) for offset in (0, 8, 16, 24)] for index in range(32)],
            "se1": player(se1_info, se1_tracks), "se2": player(se2_info, se2_tracks),
            "dispcnt": u16(0x04000000), "bldcnt": u16(0x04000050), "bldalpha": u16(0x04000052), "bldy": u16(0x04000054),
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
        raise RuntimeError("Role Play entry through first inactive cleanup not captured")
    payload = {
        "schema": "role-play-dense-evidence/v1", "setup": setup,
        "sourceBounds": {"Move_ROLE_PLAY": start, "Move_REFRESH": end},
        "templates": {"additionalMon": additional_template, "simplePaletteBlend": simple_blend_template},
        "taskFuncs": {name: funcs[name] for name in task_names},
        "songHeaders": {"SE_M_DETECT": oracle.read_u32(song_table + 209 * 8), "SE_M_TRI_ATTACK": oracle.read_u32(song_table + 220 * 8)},
        "frames": rows,
    }
    OUTPUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} frames; {rows[0]['frame']}..{rows[-1]['frame']})")


main()
