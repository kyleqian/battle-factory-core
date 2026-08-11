#!/usr/bin/env python3
"""Capture a complete Scene-ON BACK_ANIM_SHRINK_GROW window.

The mechanicLab pre-checkpoint path is captured densely. Each row retains the
raw framebuffer hash and the selected player's sprite/OAM/affine state from
the live ROM, through SpriteCallbackDummy.
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
HARNESS = next(parent for parent in (ROOT, *ROOT.parents) if (parent / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE = (ROOT / "reference" / "pokeemerald").resolve()
ROM = REFERENCE / "pokeemerald.gba"
MAP = REFERENCE / "pokeemerald.map"
BOOTSTRAP = HARNESS / "oracle" / "bootstrap" / "factory.json"

VARIANTS = {
    0: ("ANIM_SHRINK_GROW_FAST", "Anim_ShrinkGrow_Fast", 113, 8, 5),
    1: ("ANIM_SHRINK_GROW", "Anim_ShrinkGrow", 19, 8, 3),
    2: ("ANIM_SHRINK_GROW_SLOW", "Anim_ShrinkGrow_Slow", 114, 4, 3),
}
NATURE_MODS = [0, 2, 0, 0, 0, 1, 1, 1, 0, 1, 2, 0, 1, 0, 0, 2, 2, 2, 2, 1, 1, 2, 1, 2, 1]


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    oracle = EmeraldOracle(ROM, MAP, BOOTSTRAP)
    symbols = oracle.symbols
    nm = subprocess.run(
        ["arm-none-eabi-nm", "-a", str(REFERENCE / "pokeemerald.elf")],
        check=True, capture_output=True, text=True,
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
            "slot": slot, "flags": u16(base + 0x3E),
            "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "animNum": u8(base + 0x2A), "animCmdIndex": u8(base + 0x2B),
            "centerToCornerVecX": s8(base + 0x28), "centerToCornerVecY": s8(base + 0x29),
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
            "callback": f"0x{callback:08x}", "callbackSymbol": callback_symbol(callback),
            "oam": {
                "attr0": attr0, "attr1": attr1, "attr2": u16(base + 4),
                "affineMode": (attr0 >> 8) & 3, "matrixNumber": matrix_number,
                "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
                "raw": raw(base, 8),
            },
        }

    def snapshot() -> dict:
        slot = u8(sprite_ids)
        return {"battler0": None} if slot >= 64 else {"battler0": sprite(slot)}

    oracle.screen_png = lambda: b""  # type: ignore[method-assign]
    lab = BattleLab(oracle, "battle-scene-on")
    lab.snapshot = snapshot  # type: ignore[method-assign]
    captures = lab.prepare(request)["preCheckpointCaptures"]
    player = request["overrides"]["parties"]["player"][0]
    nature_id = player["nature"]
    nature_mod = NATURE_MODS[nature_id]
    selector, initializer, source_id, speed, phase_limit = VARIANTS[nature_mod]
    callbacks = {initializer, "ShrinkGrow", "WaitAnimEnd", "SpriteCallbackDummy"}
    first = next((index for index, capture in enumerate(captures)
                  if (capture["state"].get("battler0") or {}).get("callbackSymbol") == initializer), None)
    if first is None:
        raise RuntimeError(f"{selector} callback window not observed")
    dense = []
    for capture in captures[first:]:
        dense.append({"frame": capture["frame"], "sha256": capture["sha256"], "battler0": capture["state"]["battler0"]})
        if len(dense) > 1 and dense[-1]["battler0"]["callbackSymbol"] == "SpriteCallbackDummy":
            break
    else:
        raise RuntimeError(f"{selector} dense window did not reach SpriteCallbackDummy")

    species = player["species"]
    if species == 132 and nature_id == 0:
        selector_evidence, source_record_index = "Factory record index 54 NATURE_HARDY", 54
    elif species == 224 and nature_id == 24:
        selector_evidence, source_record_index = "Factory record index 361 NATURE_QUIRKY", 361
    elif species == 207 and nature_id == 15:
        selector_evidence = "staged legal NATURE_MODEST; no DITTO, GLIGAR, or OCTILLERY Factory record has natureMod 2"
        source_record_index = None
    else:
        raise RuntimeError(f"unexpected shrink/grow evidence party: species={species}, nature={nature_id}")

    result = {
        "schema": "back-shrink-grow-scene-on-dense/v1", "profile": "battle-scene-on",
        "species": species, "natureId": nature_id, "natureMod": nature_mod,
        "selectorEvidence": selector_evidence, "sourceRecordIndex": source_record_index,
        "sourceBackAnimSet": "BACK_ANIM_SHRINK_GROW", "sourceBackAnimSetIndex": 4,
        "sourceSelector": selector, "sourceInitializer": initializer,
        "sourceId": source_id, "sourceSpeed": speed, "sourcePhaseLimit": phase_limit,
        "sourceDuration": (128 // speed) * phase_limit,
        "sourceWindow": {"startFrame": dense[0]["frame"], "endFrame": dense[-1]["frame"], "frameCount": len(dense)},
        "callbackAddresses": {name: address_by_name[name] for name in sorted(callbacks) if name in address_by_name},
        "frames": dense,
    }
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: species={species}, nature={nature_id}, {selector}, dense={dense[0]['frame']}..{dense[-1]['frame']} ({len(dense)} frames)")


if __name__ == "__main__":
    main()
