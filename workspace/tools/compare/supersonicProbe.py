#!/usr/bin/env python3
"""Dense MOVE_SUPERSONIC RAM/OAM/RGB evidence for legal mechanicLab fixtures."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit("usage: supersonicProbe.py <scenario> <output.json> <rgb-dir> <start-frame>")

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
    ring_template = oracle.symbols["gSupersonicRingSpriteTemplate"]

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
            "subpriority": oracle.read_u8(base + 0x43),
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
        active = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if (oracle.read_u8(base + 0x3E) & 1) and oracle.read_u32(base + 0x14) == ring_template:
                active.append(sprite(slot))
        snapshot = lab.snapshot()
        if not active and snapshot["engine"]["currentMove"] != 48:
            return
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
            "rings": active,
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
        "schema": "supersonic-dense-evidence/v1",
        "setup": setup,
        "frames": rows,
    }) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} frames; {rows[0]['frame'] if rows else '-'}..{rows[-1]['frame'] if rows else '-'})")


main()
