#!/usr/bin/env python3
"""Dense MOVE_MILK_DRINK RAM/OAM/RGB evidence."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit("usage: milkDrinkProbe.py <scenario> <output.json> <rgb-dir> <start-frame>")

SCENARIO = Path(sys.argv[1])
OUTPUT = Path(sys.argv[2])
RGB_DIR = Path(sys.argv[3])
START = int(sys.argv[4])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def main() -> None:
    scenario = json.loads(SCENARIO.read_text())
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(
        reference / "pokeemerald.gba",
        reference / "pokeemerald.map",
        HARNESS / "oracle" / "bootstrap" / "factory.json",
    )
    request = validate_request(scenario, "battle-scene-on")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    RGB_DIR.mkdir()

    sprites = oracle.symbols["gSprites"]
    matrices = oracle.symbols["gOamMatrices"]
    battler_ids = oracle.symbols["gBattlerSpriteIds"]
    bottle_template = oracle.symbols["gMilkBottleSpriteTemplate"]
    ring_template = oracle.symbols["gThinRingExpandingSpriteTemplate"]
    star_template = oracle.symbols["gHealingBlueStarSpriteTemplate"]

    def u16(address: int) -> int:
        return oracle.read_u8(address) | (oracle.read_u8(address + 1) << 8)

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        attr0 = u16(base)
        attr1 = u16(base + 2)
        matrix_num = (attr1 >> 9) & 0x1F
        matrix = matrices + matrix_num * 8
        return {
            "slot": slot,
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "animCmdIndex": oracle.read_u8(base + 0x2B),
            "animDelayCounter": oracle.read_u8(base + 0x2C),
            "affineAnimCmdIndex": oracle.read_u8(base + 0x31),
            "affineAnimEnded": bool(oracle.read_u8(base + 0x3F) & 0x20),
            "invisible": bool(oracle.read_u8(base + 0x3E) & 0x4),
            "affineMode": (attr0 >> 8) & 3,
            "objMode": (attr0 >> 10) & 3,
            "matrix": {
                "a": s16(matrix),
                "b": s16(matrix + 2),
                "c": s16(matrix + 4),
                "d": s16(matrix + 6),
            },
            "data": [s16(base + 0x2E + i * 2) for i in range(8)],
        }

    def battler(battler_id: int) -> dict:
        return sprite(oracle.read_u8(battler_ids + battler_id))

    rows = []

    def capture(frame: int) -> None:
        if frame < START:
            return
        snapshot = lab.snapshot()
        active = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if not (oracle.read_u8(base + 0x3E) & 1):
                continue
            template = oracle.read_u32(base + 0x14)
            kind = None
            if template == bottle_template:
                kind = "bottle"
            elif template == ring_template:
                kind = "ring"
            elif template == star_template:
                kind = "star"
            if kind is not None:
                active.append({"kind": kind, **sprite(slot)})
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({
            "frame": frame,
            "sha256": hashlib.sha256(rgb).hexdigest(),
            "currentMove": snapshot["engine"]["currentMove"],
            "player": snapshot["battlers"]["player"],
            "opponent": snapshot["battlers"]["opponent"],
            "playerSprite": battler(0),
            "opponentSprite": battler(1),
            "effectSprites": active,
            "bldcnt": u16(0x04000050),
            "bldalpha": u16(0x04000052),
        })

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            capture(frame)

    OUTPUT.write_text(json.dumps({
        "schema": "milk-drink-dense-evidence/v1",
        "setup": setup,
        "frames": rows,
    }) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} frames)")


main()
