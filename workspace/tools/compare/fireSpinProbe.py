#!/usr/bin/env python3
"""Pointer-bounded dense MOVE_FIRE_SPIN Scene-ON evidence."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: fireSpinProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB_DIR = (Path(value) for value in sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(
    path for path in (ROOT, *ROOT.parents)
    if (path / "oracle" / "emerald_core.py").is_file()
)
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_START = 0x082CAC96
MOVE_END = 0x082CAD4A


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
    RGB_DIR.mkdir()

    nm = subprocess.run(
        ["arm-none-eabi-nm", str(reference / "pokeemerald.elf")],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    symbols = {
        parts[2]: int(parts[0], 16)
        for line in nm.splitlines()
        if len(parts := line.split()) == 3
    }
    watched = {
        name: symbols[name] | 1
        for name in (
            "AnimTask_ShakeMon",
            "AnimTask_ShakeMon_Step",
            "AnimParticleInVortex",
            "AnimParticleInVortex_Step",
        )
    }
    watched["sBattleAnimScriptPtr"] = symbols["sBattleAnimScriptPtr"]
    templates = {"gFireSpinSpriteTemplate": oracle.symbols["gFireSpinSpriteTemplate"]}

    sprites = oracle.symbols["gSprites"]
    tasks = oracle.symbols["gTasks"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    active = oracle.symbols["gAnimScriptActive"]
    visual_task_count = oracle.symbols["gAnimVisualTaskCount"]
    sound_task_count = oracle.symbols["gAnimSoundTaskCount"]
    se1_info = oracle.symbols["gMPlayInfo_SE1"]
    se1_tracks = oracle.symbols["gMPlayTrack_SE1"]

    def u16(address: int) -> int:
        return oracle.read_u8(address) | (oracle.read_u8(address + 1) << 8)

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value

    def block(address: int, size: int) -> str:
        return bytes(oracle.read_u8(address + offset) for offset in range(size)).hex()

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        return {
            "slot": slot,
            "template": oracle.read_u32(base + 0x14),
            "callback": oracle.read_u32(base + 0x1C),
            "attr": [u16(base), u16(base + 2), u16(base + 4)],
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "animNum": oracle.read_u8(base + 0x2A),
            "animCmdIndex": oracle.read_u8(base + 0x2B),
            "animDelayCounter": oracle.read_u8(base + 0x2C) & 0x3F,
            "sheetTileStart": u16(base + 0x40),
            "subpriority": oracle.read_u8(base + 0x43),
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
        }

    def active_tasks() -> list[dict]:
        return [
            {
                "slot": slot,
                "func": oracle.read_u32(tasks + slot * 0x28),
                "data": [s16(tasks + slot * 0x28 + 8 + index * 2) for index in range(16)],
            }
            for slot in range(16)
            if oracle.read_u8(tasks + slot * 0x28 + 4)
        ]

    rows: list[dict] = []
    source_started = False
    cleanup_captured = False

    def capture(frame: int) -> None:
        nonlocal source_started, cleanup_captured
        # nm symbols name code and data together. Only code addresses carry
        # the Thumb bit; this static EWRAM pointer is a raw word address.
        pointer = oracle.read_u32(symbols["sBattleAnimScriptPtr"])
        script_active = bool(oracle.read_u8(active))
        snap = lab.snapshot()
        source_active = (
            script_active
            and snap["engine"]["currentMove"] == 83
            and MOVE_START <= pointer < MOVE_END
        )
        if source_active and not source_started:
            source_started = True
        if not source_started or cleanup_captured:
            return
        # `waitforvisualfinish` can park on a command outside the immediate
        # source byte range. Once MOVE_FIRE_SPIN is pointer-bounded at entry,
        # preserve every following active frame through its inactive cleanup.
        if not script_active:
            cleanup_captured = True

        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        battler_slots = [oracle.read_u8(battler_ids + index) for index in range(2)]
        active_slots = [
            slot for slot in range(64)
            if oracle.read_u8(sprites + slot * 0x44 + 0x3E) & 1
        ]
        active_sprites = [sprite(slot) for slot in active_slots]
        rows.append({
            "frame": frame,
            "sourceActive": source_active,
            "scriptPointer": pointer,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "currentMove": snap["engine"]["currentMove"],
            "activeBattler": snap["engine"]["activeBattler"],
            "player": snap["battlers"]["player"],
            "opponent": snap["battlers"]["opponent"],
            "visualTaskCount": oracle.read_u8(visual_task_count),
            "soundTaskCount": oracle.read_u8(sound_task_count),
            "tasks": active_tasks(),
            "battlerSprites": [sprite(slot) for slot in battler_slots],
            "fireSpinSprites": [
                value for value in active_sprites
                if value["template"] == templates["gFireSpinSpriteTemplate"]
            ],
            "hardwareOam": block(0x07000000, 0x400),
            "se1": {
                "songHeader": oracle.read_u32(se1_info),
                "status": oracle.read_u32(se1_info + 4),
                "tracks": [
                    {
                        "flags": oracle.read_u8(se1_tracks + index * 0x50),
                        "pan": s8(se1_tracks + index * 0x50 + 0x14),
                        "panX": s8(se1_tracks + index * 0x50 + 0x15),
                    }
                    for index in range(3)
                ],
            },
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
        "schema": "fire-spin-dense-evidence/v1",
        "setup": setup,
        "source": {
            "moveStart": MOVE_START,
            "moveEnd": MOVE_END,
            "script": "Move_FIRE_SPIN 0x082cac96 .. Move_FURY_CUTTER 0x082cad4a",
        },
        "symbols": {**watched, **templates},
        "sourceWindow": {
            "startFrame": active_rows[0]["frame"] if active_rows else None,
            "endFrame": active_rows[-1]["frame"] if active_rows else None,
            "frameCount": len(active_rows),
            "cleanupFrame": rows[-1]["frame"] if cleanup_captured else None,
        },
        "frames": rows,
    }) + "\n")
    print(
        f"wrote {OUTPUT} ({len(active_rows)} source frames; "
        f"{active_rows[0]['frame'] if active_rows else '-'}.."
        f"{active_rows[-1]['frame'] if active_rows else '-'})"
    )


main()
