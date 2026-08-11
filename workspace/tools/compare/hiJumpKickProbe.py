#!/usr/bin/env python3
"""Dense Battle-Scene-ON source receipt for MOVE_HI_JUMP_KICK.

The rows begin at the first real Move_HI_JUMP_KICK script pointer and end at
the first inactive cleanup.  The probe records RAM truth and raw RGB; no
display-frame or framebuffer lookup is part of the evidence.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: hiJumpKickProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents)
               if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_ID = 136
SCRIPT_BOUNDS = {"Move_HI_JUMP_KICK": 0x082D21CB, "Move_DOUBLE_KICK": 0x082D2261}


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    RGB_DIR.mkdir(parents=True, exist_ok=True)
    nm_text = subprocess.run(["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")],
                             check=True, capture_output=True, text=True).stdout
    nm = {line.split()[2]: int(line.split()[0], 16)
          for line in nm_text.splitlines() if len(line.split()) == 3}
    for name, expected in SCRIPT_BOUNDS.items():
        if nm.get(name) != expected:
            raise RuntimeError(f"{name} pointer-isolation contract changed")

    sprites, matrices, tasks = (oracle.symbols["gSprites"], oracle.symbols["gOamMatrices"],
                                oracle.symbols["gTasks"])
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    faded, unfaded = oracle.symbols["gPlttBufferFaded"], nm["gPlttBufferUnfaded"]
    palette_tags, tile_tags = nm["sSpritePaletteTags"], nm["sSpriteTileRangeTags"]
    software_oam = nm["gMain"] + 0x38
    script_ptr = 0x020383F0  # static sBattleAnimScriptPtr
    active_ptr, current_move = nm["gAnimScriptActive"], oracle.symbols["gCurrentMove"]
    anim_attacker, anim_target = oracle.symbols["gBattleAnimAttacker"], oracle.symbols["gBattleAnimTarget"]
    visual_count, sound_count = oracle.symbols["gAnimVisualTaskCount"], oracle.symbols["gAnimSoundTaskCount"]
    se1_info, se1_tracks = oracle.symbols["gMPlayInfo_SE1"], oracle.symbols["gMPlayTrack_SE1"]
    se2_info, se2_tracks = oracle.symbols["gMPlayInfo_SE2"], oracle.symbols["gMPlayTrack_SE2"]
    song_table = oracle.symbols["gSongTable"]
    bg_positions = {name: nm[name] for name in (
        "gBattle_BG0_X", "gBattle_BG0_Y", "gBattle_BG1_X", "gBattle_BG1_Y",
        "gBattle_BG2_X", "gBattle_BG2_Y", "gBattle_BG3_X", "gBattle_BG3_Y")}
    template_names = ("gSlideMonToOffsetSpriteTemplate", "gSlideMonToOriginalPosSpriteTemplate",
                      "gJumpKickSpriteTemplate", "gBasicHitSplatSpriteTemplate")
    templates = {name: nm[name] for name in template_names}
    callback_names = ("AnimJumpKick", "AnimSlideHandOrFootToTarget", "AnimTravelDiagonally",
                      "SlideMonToOffset", "TranslateSpriteLinearByIdFixedPoint",
                      "SlideMonToOriginalPos", "SlideMonToOriginalPos_Step",
                      "AnimTranslateLinear", "AnimTranslateLinear_WithFollowup",
                      "AnimHitSplatBasic", "RunStoredCallbackWhenAnimEnds",
                      "RunStoredCallbackWhenAffineAnimEnds",
                      "DestroyAnimSprite", "DestroySpriteAndMatrix", "SpriteCallbackDummy")
    callbacks = {name: nm[name] | 1 for name in callback_names if name in nm}
    task_names = ("AnimTask_ShakeMonInPlace", "AnimTask_ShakeMonInPlace_Step")
    task_funcs = {name: nm[name] | 1 for name in task_names}

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

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 0x1F
        matrix = matrices + matrix_num * 8
        hardware_matrix = 0x07000006 + matrix_num * 0x20
        return {
            "slot": slot, "attr0": u16(base), "attr1": u16(base + 2), "attr2": u16(base + 4),
            "x": s16(base + 0x20), "y": s16(base + 0x22), "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "template": oracle.read_u32(base + 0x14), "callback": oracle.read_u32(base + 0x1C),
            "subpriority": oracle.read_u8(base + 0x43), "invisible": bool(oracle.read_u8(base + 0x3E) & 4),
            "hFlip": bool(oracle.read_u8(base + 0x3F) & 1), "animNum": oracle.read_u8(base + 0x2A),
            "animCmdIndex": oracle.read_u8(base + 0x2B), "animDelayCounter": oracle.read_u8(base + 0x2C) & 0x3F,
            "matrixNum": matrix_num,
            "matrix": {"a": s16(matrix), "b": s16(matrix + 2), "c": s16(matrix + 4), "d": s16(matrix + 6)},
            "hardwareMatrix": {"a": s16(hardware_matrix), "b": s16(hardware_matrix + 8),
                               "c": s16(hardware_matrix + 16), "d": s16(hardware_matrix + 24)},
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def battler(index: int) -> dict:
        return sprite(oracle.read_u8(battler_ids + index))

    def active_tasks() -> list[dict]:
        return [{"slot": slot, "func": oracle.read_u32(tasks + slot * 0x28),
                 "data": [s16(tasks + slot * 0x28 + 8 + index * 2) for index in range(16)]}
                for slot in range(16) if oracle.read_u8(tasks + slot * 0x28 + 4)]

    def move_sprites() -> list[dict]:
        watched_templates = set(templates.values())
        watched_callbacks = set(callbacks.values())
        return [sprite(slot) for slot in range(64)
                if (oracle.read_u8(sprites + slot * 0x44 + 0x3E) & 1)
                and (oracle.read_u32(sprites + slot * 0x44 + 0x14) in watched_templates
                     or oracle.read_u32(sprites + slot * 0x44 + 0x1C) in watched_callbacks)]

    def sound_player(info: int, tracks: int) -> dict:
        return {"songHeader": oracle.read_u32(info), "status": oracle.read_u32(info + 4),
                "tracks": [{"flags": oracle.read_u8(tracks + index * 0x50),
                            "pan": s8(tracks + index * 0x50 + 0x14),
                            "panX": s8(tracks + index * 0x50 + 0x15)} for index in range(3)]}

    rows: list[dict] = []
    started = False
    complete = False

    def capture(frame: int) -> None:
        nonlocal started, complete
        pointer = oracle.read_u32(script_ptr) & ~1
        active = bool(oracle.read_u8(active_ptr))
        snap = lab.snapshot()
        in_move = SCRIPT_BOUNDS["Move_HI_JUMP_KICK"] <= pointer < SCRIPT_BOUNDS["Move_DOUBLE_KICK"]
        if not started:
            if snap["engine"]["currentMove"] != MOVE_ID or not in_move:
                return
            started = True
        if complete or not in_move:
            return
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(), "scriptPtr": pointer,
            "animScriptActive": active, "battleAnimAttacker": oracle.read_u8(anim_attacker),
            "battleAnimTarget": oracle.read_u8(anim_target), "player": snap["battlers"]["player"],
            "opponent": snap["battlers"]["opponent"], "parties": snap["parties"], "engine": snap["engine"],
            "playerSprite": battler(0), "opponentSprite": battler(1), "tasks": active_tasks(),
            "moveSprites": move_sprites(), "fadedPalette": [u16(faded + i * 2) for i in range(512)],
            "unfadedPalette": [u16(unfaded + i * 2) for i in range(512)],
            "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)],
            "paletteTags": [u16(palette_tags + i * 2) for i in range(16)],
            "tileTags": [u16(tile_tags + i * 2) for i in range(128)],
            "softwareOam": [raw(software_oam + i * 8, 8) for i in range(128)],
            "hardwareOam": [[u16(0x07000000 + i * 8 + j) for j in (0, 2, 4)] for i in range(128)],
            "hardwareMatrices": [[s16(0x07000006 + i * 0x20 + j) for j in (0, 8, 16, 24)] for i in range(32)],
            "visualTaskCount": oracle.read_u8(visual_count), "soundTaskCount": oracle.read_u8(sound_count),
            "se1": sound_player(se1_info, se1_tracks), "se2": sound_player(se2_info, se2_tracks),
            "registers": {"dispcnt": u16(0x04000000), "bldcnt": u16(0x04000050),
                           "bldalpha": u16(0x04000052), "bldy": u16(0x04000054)},
            "backgroundPositions": {name: s16(address) for name, address in bg_positions.items()},
            "immutableState": {key: snap[key] for key in ("rngValue", "battleOutcome", "weather",
                "weatherTurns", "sideStatuses", "sideConditions")},
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
    if not rows:
        raise RuntimeError("MOVE_HI_JUMP_KICK pointer body was not observed")
    if not complete:
        raise RuntimeError("MOVE_HI_JUMP_KICK first inactive cleanup was not captured")
    OUTPUT.write_text(json.dumps({
        "schema": "hi-jump-kick-dense-evidence/v1", "moveId": MOVE_ID, "setup": setup,
        "scriptBounds": SCRIPT_BOUNDS, "templates": templates, "callbacks": callbacks,
        "taskFuncs": task_funcs, "songHeaders": {
            "SE_M_JUMP_KICK": oracle.read_u32(song_table + 143 * 8),
            "SE_M_VITAL_THROW2": oracle.read_u32(song_table + 123 * 8)},
        "sourceWindow": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"], "frameCount": len(rows)},
        "frames": rows,
    }, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: {len(rows)} pointer-isolated source frames {rows[0]['frame']}..{rows[-1]['frame']}")


if __name__ == "__main__":
    main()
