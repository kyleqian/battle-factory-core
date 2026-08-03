#!/usr/bin/env python3
"""Capture the full Scene-ON front send-out lifecycle for selector 14.

The BattleLab pre-checkpoint route is captured every video frame. This receipt
keeps RGB888 framebuffer hashes with the target sprite's signed state, OAM,
and affine matrix; PNG payloads are deliberately discarded after their hashes
are taken.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit(f"usage: {sys.argv[0]} <scenario.json> <output.json>")

SCENARIO = Path(sys.argv[1])
OUTPUT = Path(sys.argv[2])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(
    parent for parent in (ROOT, *ROOT.parents)
    if (parent / "oracle" / "emerald_core.py").is_file()
)
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE = (ROOT / "reference" / "pokeemerald").resolve()
ROM = REFERENCE / "pokeemerald.gba"
MAP = REFERENCE / "pokeemerald.map"
BOOTSTRAP = HARNESS / "oracle" / "bootstrap" / "factory.json"


def main() -> None:
    raw_request = json.loads(SCENARIO.read_text())
    request = validate_request(raw_request, "battle-scene-on")
    oracle = EmeraldOracle(ROM, MAP, BOOTSTRAP)
    symbols = oracle.symbols

    nm = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(REFERENCE / "pokeemerald.elf")],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    address_by_name: dict[str, int] = {}
    name_by_address: dict[int, str] = {}
    for line in nm.splitlines():
        parts = line.split()
        if len(parts) != 3:
            continue
        try:
            address = int(parts[0], 16)
        except ValueError:
            continue
        address_by_name[parts[2]] = address
        name_by_address[address] = parts[2]

    def u8(address: int) -> int:
        return oracle.read_u8(address)

    def u16(address: int) -> int:
        return u8(address) | (u8(address + 1) << 8)

    def u32(address: int) -> int:
        return u16(address) | (u16(address + 2) << 16)

    def s8(address: int) -> int:
        value = u8(address)
        return value - 0x100 if value >= 0x80 else value

    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value

    def raw(address: int, size: int) -> str:
        return "".join(f"{u8(address + offset):02x}" for offset in range(size))

    def callback_symbol(address: int) -> str | None:
        return name_by_address.get(address & ~1)

    sprites = symbols["gSprites"]
    matrices = symbols["gOamMatrices"]
    sprite_ids = symbols["gBattlerSpriteIds"]

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        attr0 = u16(base)
        attr1 = u16(base + 2)
        matrix_number = (attr1 >> 9) & 31
        matrix = matrices + matrix_number * 8
        callback = u32(base + 0x1C)
        return {
            "slot": slot,
            "flags": u16(base + 0x3E),
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "animNum": u8(base + 0x2A),
            "animCmdIndex": u8(base + 0x2B),
            "centerToCornerVecX": s8(base + 0x28),
            "centerToCornerVecY": s8(base + 0x29),
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
            "callback": f"0x{callback:08x}",
            "callbackSymbol": callback_symbol(callback),
            "oam": {
                "attr0": attr0,
                "attr1": attr1,
                "attr2": u16(base + 4),
                "affineMode": (attr0 >> 8) & 3,
                "matrixNumber": matrix_number,
                "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
                "raw": raw(base, 8),
            },
        }

    def snapshot() -> dict:
        slot = u8(sprite_ids + 1)
        if slot >= 64:
            return {"battler1": None}
        return {"battler1": sprite(slot)}

    oracle.screen_png = lambda: b""  # type: ignore[method-assign]
    lab = BattleLab(oracle, "battle-scene-on")
    lab.snapshot = snapshot  # type: ignore[method-assign]
    setup = lab.prepare(request)
    captures = setup["preCheckpointCaptures"]

    callbacks = {
        "Anim_SwingConvex_Fast",
        "SwingConvex",
        "WaitAnimEnd",
        "SpriteCallbackDummy",
    }
    first = next(
        (
            index
            for index, capture in enumerate(captures)
            if (capture["state"].get("battler1") or {}).get("callbackSymbol")
            in callbacks - {"WaitAnimEnd", "SpriteCallbackDummy"}
        ),
        None,
    )
    if first is None:
        seen = sorted({
            (capture["state"].get("battler1") or {}).get("callbackSymbol")
            for capture in captures
        })
        raise RuntimeError(f"selector-14 callback window not observed; callbacks={seen}")

    dense = []
    for capture in captures[first:]:
        dense.append({
            "frame": capture["frame"],
            "sha256": capture["sha256"],
            "battler1": capture["state"]["battler1"],
        })
        if len(dense) > 1 and dense[-1]["battler1"]["callbackSymbol"] == "SpriteCallbackDummy":
            break
    else:
        raise RuntimeError("selector-14 dense window did not reach SpriteCallbackDummy")

    species = request["overrides"]["parties"]["opponent"][0]["species"]
    result = {
        "schema": "swing-convex-fast-scene-on-dense/v1",
        "profile": "battle-scene-on",
        "species": species,
        "sourceSelector": "ANIM_SWING_CONVEX_FAST",
        "sourceId": 14,
        "sourceWindow": {
            "startFrame": dense[0]["frame"],
            "endFrame": dense[-1]["frame"],
            "frameCount": len(dense),
        },
        "callbackAddresses": {
            name: address_by_name[name]
            for name in sorted(callbacks)
            if name in address_by_name
        },
        "frames": dense,
    }
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(
        f"wrote {OUTPUT}: species={species}, "
        f"dense={dense[0]['frame']}..{dense[-1]['frame']} ({len(dense)} frames)",
    )


if __name__ == "__main__":
    main()
