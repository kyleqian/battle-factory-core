#!/usr/bin/env python3
"""Dense Scene-ON MOVE_TEETER_DANCE source/hardware/audio/raw-RGB receipt."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: teeterDanceProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents)
               if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 298


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    RGB_DIR.mkdir(parents=True, exist_ok=True)
    sprites = oracle.symbols["gSprites"]
    tasks = oracle.symbols["gTasks"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    faded = oracle.symbols["gPlttBufferFaded"]
    unfaded = oracle.symbols["gPlttBufferUnfaded"]
    battle_mons = oracle.symbols["gBattleMons"]
    visual_count = oracle.symbols["gAnimVisualTaskCount"]
    sound_count = oracle.symbols["gAnimSoundTaskCount"]
    script_active = oracle.symbols["gAnimScriptActive"]
    # Static `sBattleAnimScriptPtr`; the pinned Emerald build places it here.
    script_ptr = 0x020383F0
    fast_template = oracle.symbols["gFastFlyingMusicNotesSpriteTemplate"]
    duck_template = oracle.symbols["gDizzyPunchDuckSpriteTemplate"]
    nm = subprocess.run(["arm-none-eabi-nm", str(reference / "pokeemerald.elf")],
                        check=True, capture_output=True, text=True).stdout
    elf = {parts[2]: int(parts[0], 16) | 1 for line in nm.splitlines()
           if len(parts := line.split()) == 3}
    script_bounds = {
        "Move_TEETER_DANCE": elf["Move_TEETER_DANCE"],
        "Move_MUD_SPORT": elf["Move_MUD_SPORT"],
    }
    watched = {name: elf[name] for name in (
        "AnimFlyingMusicNotes", "AnimFlyingMusicNotes_Step",
        "AnimTask_TeeterDanceMovement", "AnimTask_TeeterDanceMovement_Step",
    )}
    se1_info = oracle.symbols["gMPlayInfo_SE1"]
    se1_tracks = oracle.symbols["gMPlayTrack_SE1"]
    song_table = oracle.symbols["gSongTable"]

    def u16(address: int) -> int:
        return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value

    def block(address: int, size: int) -> bytes:
        return bytes(oracle.read_u8(address + i) for i in range(size))

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        attr0, attr1, attr2 = u16(base), u16(base + 2), u16(base + 4)
        matrix_num = (attr1 >> 9) & 31
        matrix = oracle.symbols["gOamMatrices"] + matrix_num * 8
        return {
            "slot": slot, "template": oracle.read_u32(base + 0x14),
            "callback": oracle.read_u32(base + 0x1c), "x": s16(base + 0x20),
            "y": s16(base + 0x22), "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "attr0": attr0, "attr1": attr1, "attr2": attr2,
            "animNum": oracle.read_u8(base + 0x2a),
            "animCmdIndex": oracle.read_u8(base + 0x2b),
            "animDelayCounter": oracle.read_u8(base + 0x2c),
            "paletteNum": (attr2 >> 12) & 15, "priority": (attr2 >> 10) & 3,
            "affineMode": (attr0 >> 8) & 3, "objMode": (attr0 >> 10) & 3,
            "matrixNum": matrix_num, "subpriority": oracle.read_u8(base + 0x43),
            "invisible": bool(oracle.read_u8(base + 0x3e) & 4),
            "matrix": {"a": s16(matrix), "b": s16(matrix + 2),
                       "c": s16(matrix + 4), "d": s16(matrix + 6)},
            "data": [s16(base + 0x2e + i * 2) for i in range(8)],
        }

    def active_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4):
                result.append({"slot": slot, "func": oracle.read_u32(base),
                               "data": [s16(base + 8 + i * 2) for i in range(16)]})
        return result

    def battle_mon(slot: int) -> dict:
        base = battle_mons + slot * 0x58
        return {"species": u16(base), "hp": u16(base + 0x28),
                "maxHp": u16(base + 0x2c), "status1": oracle.read_u32(base + 0x4c)}

    rows = []
    finished = False

    def capture(frame: int) -> None:
        nonlocal finished
        # The cursor remains at the move's terminal command for a few
        # controller frames. Retain exactly through the first inactive row.
        if finished:
            return
        snapshot = lab.snapshot()
        if snapshot["engine"]["currentMove"] != MOVE:
            return
        pointer = oracle.read_u32(script_ptr)
        if not (script_bounds["Move_TEETER_DANCE"] <= pointer < script_bounds["Move_MUD_SPORT"]):
            return
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        battler_slots = [oracle.read_u8(battler_ids + i) for i in range(2)]
        active_slots = [slot for slot in range(64)
                        if oracle.read_u8(sprites + slot * 0x44 + 0x3e) & 1]
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "engine": snapshot["engine"], "battleMons": [battle_mon(i) for i in range(2)],
            "animScriptPtr": pointer, "inMoveScript": True,
            "gameplayRng": snapshot.get("rng"),
            "animScriptActive": oracle.read_u8(script_active),
            "visualTaskCount": oracle.read_u8(visual_count),
            "soundTaskCount": oracle.read_u8(sound_count), "tasks": active_tasks(),
            "battlerSprites": [sprite(slot) for slot in battler_slots],
            "effects": [sprite(slot) for slot in active_slots
                        if oracle.read_u32(sprites + slot * 0x44 + 0x14)
                        in (fast_template, duck_template)],
            "registers": {name: u16(address) for name, address in {
                "DISPCNT": 0x04000000, "BG0CNT": 0x04000008, "BG1CNT": 0x0400000a,
                "BG2CNT": 0x0400000c, "BG3CNT": 0x0400000e,
                "BLDCNT": 0x04000050, "BLDALPHA": 0x04000052, "BLDY": 0x04000054}.items()},
            "fadedPalette": [u16(faded + i * 2) for i in range(512)],
            "unfadedPalette": [u16(unfaded + i * 2) for i in range(512)],
            "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)],
            "hardwareOam": block(0x07000000, 0x400).hex(),
            "hardwareMatrices": [[s16(0x07000006 + i * 0x20 + o)
                                  for o in (0, 8, 16, 24)] for i in range(32)],
            "se1": {"songHeader": oracle.read_u32(se1_info),
                    "status": oracle.read_u32(se1_info + 4),
                    "tracks": [{"flags": oracle.read_u8(se1_tracks + i * 0x50),
                                "pan": s8(se1_tracks + i * 0x50 + 0x14),
                                "panX": s8(se1_tracks + i * 0x50 + 0x15)} for i in range(3)]},
        })
        if not rows[-1]["animScriptActive"]:
            finished = True

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)
    if not rows:
        raise RuntimeError("stock ROM did not reach MOVE_TEETER_DANCE")
    OUTPUT.write_text(json.dumps({
        "schema": "teeter-dance-dense-evidence/v1", "setup": setup,
        "templates": {"gFastFlyingMusicNotesSpriteTemplate": fast_template,
                      "gDizzyPunchDuckSpriteTemplate": duck_template},
        "taskFuncs": watched,
        "scriptBounds": script_bounds,
        "songHeaders": {"SE_M_TEETER_DANCE": oracle.read_u32(song_table + 244 * 8)},
        "frames": rows,
    }) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} currentMove frames; {rows[0]['frame']}..{rows[-1]['frame']})")


main()
