#!/usr/bin/env python3
"""Pointer-bounded dense Scene-ON evidence for stock Move_POISON_STING."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: poisonStingProbe.py <scenario.json> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
MOVE_ID = 40
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
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
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(parts[0], 16), parts[2]) for line in nm.splitlines() if len(parts := line.split()) == 3 and all(ch in "0123456789abcdefABCDEF" for ch in parts[0])]
    names = {name: address for address, name in pairs}
    symbols = oracle.symbols
    sprites, matrices, tasks = names["gSprites"], names["gOamMatrices"], names["gTasks"]
    battler_ids = names["gBattlerSpriteIds"]
    active, pointer = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"]
    faded, unfaded = names["gPlttBufferFaded"], names["gPlttBufferUnfaded"]
    palette_tags, tile_tags = names["sSpritePaletteTags"], names["sSpriteTileRangeTags"]
    software_oam = names["gMain"] + 0x38
    templates = {name: names[name] for name in ("gLinearStingerSpriteTemplate", "gBasicHitSplatSpriteTemplate", "gPoisonBubbleSpriteTemplate")}
    callbacks = {name: names[name] for name in ("AnimTranslateLinear_WithFollowup", "RunStoredCallbackWhenAffineAnimEnds", "AnimBubbleEffect_Step", "DestroyAnimSprite")}
    task_funcs = {name: names[name] for name in ("AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step")}
    bounds = {"Move_POISON_STING": names["Move_POISON_STING"], "Move_TWINEEDLE": names["Move_TWINEEDLE"], "PoisonBubblesEffect": names["PoisonBubblesEffect"]}

    def u16(address: int) -> int:
        return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8
    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value
    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value
    def raw(address: int, size: int) -> str:
        return bytes(oracle.read_u8(address + i) for i in range(size)).hex()
    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 31
        matrix = matrices + matrix_num * 8
        hardware_matrix = 0x07000006 + matrix_num * 0x20
        return {
            "slot": slot, "template": oracle.read_u32(base + 0x14), "callback": oracle.read_u32(base + 0x1c),
            "attr0": u16(base), "attr1": u16(base + 2), "attr2": u16(base + 4),
            "x": s16(base + 0x20), "y": s16(base + 0x22), "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "subpriority": oracle.read_u8(base + 0x43), "invisible": bool(oracle.read_u8(base + 0x3e) & 4),
            "animNum": oracle.read_u8(base + 0x2a), "animCmdIndex": oracle.read_u8(base + 0x2b), "matrixNum": matrix_num,
            "matrix": {"a": s16(matrix), "b": s16(matrix + 2), "c": s16(matrix + 4), "d": s16(matrix + 6)},
            "hardwareMatrix": {"a": s16(hardware_matrix), "b": s16(hardware_matrix + 8), "c": s16(hardware_matrix + 16), "d": s16(hardware_matrix + 24)},
            "data": [s16(base + 0x2e + i * 2) for i in range(8)],
        }
    def battler(index: int) -> dict:
        return sprite(oracle.read_u8(battler_ids + index))
    def active_tasks() -> list[dict]:
        return [{"slot": slot, "func": oracle.read_u32(tasks + slot * 0x28), "data": [s16(tasks + slot * 0x28 + 8 + i * 2) for i in range(16)]} for slot in range(16) if oracle.read_u8(tasks + slot * 0x28 + 4)]
    def effect_sprites() -> dict[str, list[dict]]:
        grouped = {name: [] for name in templates}
        for slot in range(64):
            if not oracle.read_u8(sprites + slot * 0x44 + 0x3e) & 1:
                continue
            item = sprite(slot)
            for name, template in templates.items():
                if item["template"] == template:
                    grouped[name].append(item)
        return grouped
    def audio() -> dict:
        info, tracks = names["gMPlayInfo_SE1"], names["gMPlayTrack_SE1"]
        return {"songHeader": oracle.read_u32(info), "status": oracle.read_u32(info + 4), "tracks": [{"flags": oracle.read_u8(tracks + i * 0x50), "pan": s8(tracks + i * 0x50 + 0x14), "panX": s8(tracks + i * 0x50 + 0x15)} for i in range(3)]}

    rows: list[dict] = []
    started = complete = False
    observed: set[int] = set()
    def capture(frame: int) -> None:
        nonlocal started, complete
        snapshot = lab.snapshot()
        script = oracle.read_u32(pointer)
        script_active = bool(oracle.read_u8(active))
        if snapshot["engine"]["currentMove"] == MOVE_ID:
            observed.add(script)
        if not started:
            if snapshot["engine"]["currentMove"] != MOVE_ID or not script_active or not (bounds["Move_POISON_STING"] <= script < bounds["Move_TWINEEDLE"]):
                return
            started = True
        if complete:
            return
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(), "scriptPtr": script,
            "scriptOffset": script - bounds["Move_POISON_STING"] if bounds["Move_POISON_STING"] <= script < bounds["Move_TWINEEDLE"] else None,
            "animScriptActive": script_active, "player": snapshot["battlers"]["player"], "opponent": snapshot["battlers"]["opponent"],
            "playerSprite": battler(0), "opponentSprite": battler(1), "moveSprites": effect_sprites(), "tasks": active_tasks(),
            "visualTaskCount": oracle.read_u8(names["gAnimVisualTaskCount"]), "soundTaskCount": oracle.read_u8(names["gAnimSoundTaskCount"]),
            "fadedPalette": [u16(faded + i * 2) for i in range(512)], "unfadedPalette": [u16(unfaded + i * 2) for i in range(512)],
            "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)], "paletteTags": [u16(palette_tags + i * 2) for i in range(16)], "tileTags": [u16(tile_tags + i * 2) for i in range(128)],
            "softwareOam": [raw(software_oam + i * 8, 8) for i in range(128)], "hardwareOam": [[u16(0x07000000 + i * 8 + off) for off in (0, 2, 4)] for i in range(128)],
            "hardwareMatrices": [[s16(0x07000006 + i * 0x20 + off) for off in (0, 8, 16, 24)] for i in range(32)],
            "registers": {"dispcnt": u16(0x04000000), "bldcnt": u16(0x04000050), "bldalpha": u16(0x04000052), "bldy": u16(0x04000054)}, "se1": audio(),
        })
        if not script_active:
            complete = True
    capture(0)
    frame = 0
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; capture(frame)
    if not rows:
        raise RuntimeError(f"Move_POISON_STING pointer body absent; observed {[hex(x) for x in sorted(observed)]}")
    if not complete:
        raise RuntimeError("Move_POISON_STING first inactive cleanup was not captured")
    result = {"schema": "poison-sting-dense-evidence/v1", "moveId": MOVE_ID, "setup": setup, "scriptBounds": bounds, "templates": templates, "callbacks": callbacks, "taskFuncs": task_funcs,
              "songHeaders": {"SE_M_RAZOR_WIND2": oracle.read_u32(names["gSongTable"] + 160 * 8), "SE_M_HORN_ATTACK": oracle.read_u32(names["gSongTable"] + 166 * 8), "SE_M_TOXIC": oracle.read_u32(names["gSongTable"] + 148 * 8)},
              "sourceWindow": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"], "frameCount": len(rows)}, "frames": rows}
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: {len(rows)} source frames {rows[0]['frame']}..{rows[-1]['frame']}")


if __name__ == "__main__":
    main()
