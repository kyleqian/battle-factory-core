#!/usr/bin/env python3
"""Locate and summarize the legal Scene-ON MOVE_CHARM animation body."""
from __future__ import annotations
import json, sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: charmProbe.py <scenario> <output.json>")
SCENARIO, OUTPUT = Path(sys.argv[1]), Path(sys.argv[2])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_CHARM = 204

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    sprites = oracle.symbols["gSprites"]
    matrices = oracle.symbols["gOamMatrices"]
    visual_count = oracle.symbols["gAnimVisualTaskCount"]
    anim_attacker = oracle.symbols["gBattleAnimAttacker"]
    current_rows = []
    def s16(value: int) -> int:
        return value - 0x10000 if value >= 0x8000 else value
    frame = 0
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            snap = lab.snapshot()
            if snap["engine"]["currentMove"] != MOVE_CHARM:
                continue
            active = []
            for slot in range(64):
                base = sprites + slot * 0x44
                if oracle.read_u8(base + 0x3e) & 1:
                    matrix_num = (oracle.read_u16(base + 2) >> 9) & 0x1f
                    matrix = matrices + matrix_num * 8
                    active.append({
                        "slot": slot,
                        "template": oracle.read_u32(base + 0x14),
                        "callback": oracle.read_u32(base + 0x1c),
                        "x": s16(oracle.read_u16(base + 0x20)),
                        "y": s16(oracle.read_u16(base + 0x22)),
                        "x2": s16(oracle.read_u16(base + 0x24)),
                        "y2": s16(oracle.read_u16(base + 0x26)),
                        "attr0": oracle.read_u16(base),
                        "attr1": oracle.read_u16(base + 2),
                        "attr2": oracle.read_u16(base + 4),
                        "matrixNum": matrix_num,
                        "matrix": {
                            "a": s16(oracle.read_u16(matrix)),
                            "b": s16(oracle.read_u16(matrix + 2)),
                            "c": s16(oracle.read_u16(matrix + 4)),
                            "d": s16(oracle.read_u16(matrix + 6)),
                        },
                        "data": [s16(oracle.read_u16(base + 0x2e + i * 2))
                                 for i in range(8)],
                    })
            current_rows.append({
                "frame": frame,
                "attacker": oracle.read_u8(anim_attacker),
                "visualTaskCount": oracle.read_u8(visual_count),
                "active": active,
            })
    if not current_rows:
        raise RuntimeError("stock ROM did not reach MOVE_CHARM")
    OUTPUT.write_text(json.dumps({
        "schema": "charm-window-probe/v1",
        "setup": setup,
        "magentaHeartTemplate": oracle.symbols["gMagentaHeartSpriteTemplate"],
        "firstFrame": current_rows[0]["frame"],
        "lastFrame": current_rows[-1]["frame"],
        "rows": current_rows,
    }) + "\n")
    print(f"wrote {OUTPUT}: currentMove {current_rows[0]['frame']}..{current_rows[-1]['frame']}")
main()
