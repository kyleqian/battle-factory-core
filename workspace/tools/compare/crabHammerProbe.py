#!/usr/bin/env python3
"""Dense MOVE_CRABHAMMER Scene-ON RAM/OAM/palette/RGB evidence.

Captures the entire source-owned `Move_CRABHAMMER` window, using the ELF
script range `Move_CRABHAMMER` (0x082d1cd0) through `Move_SURF`
(0x082d1dca), including the first inactive cleanup.  The record deliberately
keeps RAM truth separate from display truth: every frame has raw RGB and a
hash alongside the battle animation script pointer, all relevant software
state, and the hardware OAM/matrix/palette latches.

The move body is small but crosses the common water/contact seam: the initial
WATER_IMPACT splat, complex BG+battler palette blend, both slide dummies,
`AnimTask_ShakeMon`, and all eight ICE_CRYSTALS small-bubble pairs.  Each is
captured by template and callback rather than inferred from a battle tick.

Run from the run root through the validated mGBA wrapper:
  python3 tools/run-mgba-probe.py <out.json> -- \
    python3 tools/compare/crabHammerProbe.py <scenario.json> <out.json> <rgb-dir> 152
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) not in (4, 5):
    raise SystemExit(
        "usage: crabHammerProbe.py <scenario> <output.json> <rgb-dir> [move-id]"
    )

SCENARIO = Path(sys.argv[1])
OUTPUT = Path(sys.argv[2])
RGB_DIR = Path(sys.argv[3])
MOVE_ID = int(sys.argv[4]) if len(sys.argv) == 5 else 152
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(
    path for path in (ROOT, *ROOT.parents)
    if (path / "oracle" / "emerald_core.py").is_file()
)
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba",
        reference / "pokeemerald.map",
        HARNESS / "oracle" / "bootstrap" / "factory.json",
    )
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    RGB_DIR.mkdir(parents=True, exist_ok=True)

    sprites = oracle.symbols["gSprites"]
    matrices = oracle.symbols["gOamMatrices"]
    tasks = oracle.symbols["gTasks"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    faded = oracle.symbols["gPlttBufferFaded"]
    unfaded = oracle.symbols["gPlttBufferUnfaded"]
    visual_task_count = oracle.symbols["gAnimVisualTaskCount"]
    sound_task_count = oracle.symbols["gAnimSoundTaskCount"]
    anim_script_active = oracle.symbols["gAnimScriptActive"]
    anim_attacker = oracle.symbols["gBattleAnimAttacker"]
    anim_target = oracle.symbols["gBattleAnimTarget"]
    software_oam = oracle.symbols["gMain"] + 0x38
    script_ptr = 0x020383F0  # static sBattleAnimScriptPtr

    nm = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    names = {
        line.split()[2]: int(line.split()[0], 16)
        for line in nm.splitlines()
        if len(line.split()) == 3
    }
    funcs = {name: address | 1 for name, address in names.items()}
    palette_tags = names["sSpritePaletteTags"] & ~1
    tile_tags = names["sSpriteTileRangeTags"] & ~1
    template_names = (
        "gSmallBubblePairSpriteTemplate",
        "gWaterHitSplatSpriteTemplate",
        "gSlideMonToOffsetSpriteTemplate",
        "gSlideMonToOriginalPosSpriteTemplate",
        "gComplexPaletteBlendSpriteTemplate",
    )
    templates = {name: names[name] for name in template_names}
    shake_task_names = ("AnimTask_ShakeMon", "AnimTask_ShakeMon_Step")
    shake_task_funcs = {funcs[name] for name in shake_task_names}
    watched_callback_names = (
        "AnimSmallBubblePair",
        "AnimSmallBubblePair_Step",
        "AnimHitSplatBasic",
        "SlideMonToOffset",
        "SlideMonToOriginalPos",
        "AnimComplexPaletteBlend",
        "AnimComplexPaletteBlend_Step1",
        "AnimComplexPaletteBlend_Step2",
        "DestroyAnimSprite",
        "DestroySpriteAndMatrix",
    )
    watched_callbacks = {funcs[name] for name in watched_callback_names}
    script_bounds = {
        "Move_CRABHAMMER": 0x082D1CD0,
        "Move_SURF": 0x082D1DCA,
    }

    def u16(address: int) -> int:
        return oracle.read_u8(address) | (oracle.read_u8(address + 1) << 8)

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def raw(address: int, count: int) -> str:
        return bytes(oracle.read_u8(address + index) for index in range(count)).hex()

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 0x1F
        matrix = matrices + matrix_num * 8
        hardware_matrix = 0x07000006 + matrix_num * 0x20
        return {
            "slot": slot,
            "attr0": u16(base),
            "attr1": u16(base + 2),
            "attr2": u16(base + 4),
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "template": oracle.read_u32(base + 0x14),
            "callback": oracle.read_u32(base + 0x1C),
            "subpriority": oracle.read_u8(base + 0x43),
            "invisible": bool(oracle.read_u8(base + 0x3E) & 4),
            "hFlip": bool(oracle.read_u8(base + 0x3F) & 1),
            "animNum": oracle.read_u8(base + 0x2A),
            "animCmdIndex": oracle.read_u8(base + 0x2B),
            "animDelayCounter": oracle.read_u8(base + 0x2C) & 0x3F,
            "matrixNum": matrix_num,
            "matrix": {
                "a": s16(matrix),
                "b": s16(matrix + 2),
                "c": s16(matrix + 4),
                "d": s16(matrix + 6),
            },
            "hardwareMatrix": {
                "a": s16(hardware_matrix),
                "b": s16(hardware_matrix + 8),
                "c": s16(hardware_matrix + 16),
                "d": s16(hardware_matrix + 24),
            },
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def battler(index: int) -> dict:
        return sprite(oracle.read_u8(battler_ids + index))

    def active_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4) == 0:
                continue
            result.append({
                "slot": slot,
                "func": oracle.read_u32(base),
                "data": [s16(base + 8 + index * 2) for index in range(16)],
            })
        return result

    def shake_tasks() -> list[dict]:
        return [task for task in active_tasks() if task["func"] in shake_task_funcs]

    def move_sprites() -> dict[str, list[dict]]:
        grouped = {name: [] for name in template_names}
        grouped["watchedCallbacks"] = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if oracle.read_u8(base + 0x3E) & 1 == 0:
                continue
            item = sprite(slot)
            for name, template in templates.items():
                if item["template"] == template:
                    grouped[name].append(item)
                    break
            else:
                if item["callback"] in watched_callbacks:
                    grouped["watchedCallbacks"].append(item)
        return grouped

    rows: list[dict] = []
    rgb_frames: dict[int, bytes] = {}
    observed_moves: set[int] = set()
    observed_move_pointers: set[int] = set()

    def capture(frame: int) -> None:
        snapshot = lab.snapshot()
        observed_moves.add(snapshot["engine"]["currentMove"])
        if snapshot["engine"]["currentMove"] == MOVE_ID:
            observed_move_pointers.add(oracle.read_u32(script_ptr))
        if snapshot["engine"]["currentMove"] != MOVE_ID:
            return
        live_script_ptr = oracle.read_u32(script_ptr)
        rgb = oracle.screen_rgb()
        rgb_frames[frame] = rgb
        rows.append({
            "frame": frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "scriptPtr": live_script_ptr,
            "player": snapshot["battlers"]["player"],
            "opponent": snapshot["battlers"]["opponent"],
            "battleAnimAttacker": oracle.read_u8(anim_attacker),
            "battleAnimTarget": oracle.read_u8(anim_target),
            "playerSprite": battler(0),
            "opponentSprite": battler(1),
            "shakeTasks": shake_tasks(),
            "allTasks": active_tasks(),
            "moveSprites": move_sprites(),
            "fadedPalette": [u16(faded + index * 2) for index in range(512)],
            "unfadedPalette": [u16(unfaded + index * 2) for index in range(512)],
            "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
            "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
            "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
            "softwareOam": [raw(software_oam + index * 8, 8) for index in range(128)],
            "hardwareOam": [
                [u16(0x07000000 + index * 8 + offset) for offset in (0, 2, 4)]
                for index in range(128)
            ],
            "hardwareMatrices": [
                [s16(0x07000006 + index * 0x20 + offset) for offset in (0, 8, 16, 24)]
                for index in range(32)
            ],
            "visualTaskCount": oracle.read_u8(visual_task_count),
            "soundTaskCount": oracle.read_u8(sound_task_count),
            "animScriptActive": bool(oracle.read_u8(anim_script_active)),
            "dispcnt": u16(0x04000000),
            "bldcnt": u16(0x04000050),
            "bldalpha": u16(0x04000052),
            "bldy": u16(0x04000054),
        })

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)

    if not rows:
        raise RuntimeError(
            "MOVE_CRABHAMMER body was not observed; "
            f"currentMove values={sorted(observed_moves)} "
            f"scriptPointers={[hex(pointer) for pointer in sorted(observed_move_pointers)]}"
        )
    first = next((index for index, row in enumerate(rows)
                  if row["animScriptActive"]
                  and script_bounds["Move_CRABHAMMER"] <= row["scriptPtr"] < script_bounds["Move_SURF"]), None)
    if first is None:
        raise RuntimeError(
            "MOVE_CRABHAMMER source pointer was not observed; "
            f"scriptPointers={[hex(pointer) for pointer in sorted(observed_move_pointers)]}"
        )
    last = next((index for index in range(first + 1, len(rows))
                 if not rows[index]["animScriptActive"]), None)
    if last is None:
        raise RuntimeError("MOVE_CRABHAMMER first inactive cleanup was not captured")
    source = rows[first:last + 1]
    for row in source:
        (RGB_DIR / f"{row['frame']:05d}.rgb").write_bytes(rgb_frames[row["frame"]])
    OUTPUT.write_text(json.dumps({
        "schema": "crabhammer-dense-evidence/v1",
        "setup": setup,
        "moveId": MOVE_ID,
        "scriptBounds": script_bounds,
        "templates": templates,
        "shakeTaskFuncs": {name: funcs[name] for name in shake_task_names},
        "watchedCallbacks": {name: funcs[name] for name in watched_callback_names},
        "sourceWindow": {
            "startFrame": source[0]["frame"],
            "endFrame": source[-1]["frame"],
            "frameCount": len(source),
        },
        "frames": source,
    }, separators=(",", ":")) + "\n")
    print(
        f"wrote {OUTPUT}: {len(source)} source frames "
        f"{source[0]['frame']}..{source[-1]['frame']}"
    )


main()
