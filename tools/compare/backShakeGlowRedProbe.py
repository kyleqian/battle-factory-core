#!/usr/bin/env python3
"""Capture a complete Scene-ON BACK_ANIM_SHAKE_GLOW_RED callback window."""
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
NATURE_MODS = [0, 2, 0, 0, 0, 1, 1, 1, 0, 1, 2, 0, 1, 0, 0, 2, 2, 2, 2, 1, 1, 2, 1, 2, 1]
VARIANTS = {
    0: ("ANIM_SHAKE_GLOW_RED_FAST", "Anim_ShakeGlowRed_Fast", 142, 10, 2, 54),
    1: ("ANIM_SHAKE_GLOW_RED", "Anim_ShakeGlowRed", 143, 20, 1, 54),
    2: ("ANIM_SHAKE_GLOW_RED_SLOW", "Anim_ShakeGlowRed_Slow", 144, 80, 1, 24),
}
EVIDENCE = {
    (77, 0): ("Factory record index 191 FRONTIER_MON_PONYTA_1 NATURE_HARDY", 191),
    (218, 22): ("Factory record index 30 FRONTIER_MON_SLUGMA NATURE_SASSY", 30),
    (219, 21): ("Factory record index 194 FRONTIER_MON_MAGCARGO_1 NATURE_GENTLE", 194),
}


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    oracle = EmeraldOracle(
        REFERENCE / "pokeemerald.gba",
        REFERENCE / "pokeemerald.map",
        HARNESS / "oracle" / "bootstrap" / "factory.json",
    )
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

    sprites = oracle.symbols["gSprites"]
    matrices = oracle.symbols["gOamMatrices"]
    sprite_ids = oracle.symbols["gBattlerSpriteIds"]
    tasks = oracle.symbols["gTasks"]
    faded = oracle.symbols["gPlttBufferFaded"]
    unfaded = oracle.symbols["gPlttBufferUnfaded"]

    def mon_animation_task() -> dict | None:
        target = address_by_name["Task_HandleMonAnimation"]
        for slot in range(16):
            base = tasks + slot * 0x28
            if u8(base + 4) and (u32(base) & ~1) == target:
                return {
                    "slot": slot, "callbackSymbol": "Task_HandleMonAnimation",
                    "data": [s16(base + 8 + index * 2) for index in range(16)],
                    "raw": raw(base, 0x28),
                }
        return None

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        attr0, attr1, attr2 = u16(base), u16(base + 2), u16(base + 4)
        matrix_number = (attr1 >> 9) & 31
        matrix = matrices + matrix_number * 8
        callback = u32(base + 0x1C)
        flags = u16(base + 0x3E)
        palette_num = (attr2 >> 12) & 15
        palette_base = 0x100 + palette_num * 16
        return {
            "slot": slot, "flags": flags, "visible": not bool(flags & 4),
            "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "animNum": u8(base + 0x2A), "animCmdIndex": u8(base + 0x2B),
            "centerToCornerVecX": s8(base + 0x28), "centerToCornerVecY": s8(base + 0x29),
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
            "callbackSymbol": name_by_address.get(callback & ~1),
            "oam": {
                "attr0": attr0, "attr1": attr1, "attr2": attr2,
                "affineMode": (attr0 >> 8) & 3, "matrixNumber": matrix_number,
                "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
                "raw": raw(base, 8),
            },
            "objPalette": {
                "paletteNum": palette_num, "base": palette_base,
                "unfaded": [u16(unfaded + (palette_base + index) * 2) for index in range(16)],
                "faded": [u16(faded + (palette_base + index) * 2) for index in range(16)],
                "hardware": [u16(0x05000000 + (palette_base + index) * 2) for index in range(16)],
            },
        }

    def snapshot() -> dict:
        slot = u8(sprite_ids)
        return {"battler0": None, "monAnimationTask": mon_animation_task()} if slot >= 64 else {
            "battler0": sprite(slot), "monAnimationTask": mon_animation_task(),
        }

    oracle.screen_png = lambda: b""  # type: ignore[method-assign]
    lab = BattleLab(oracle, "battle-scene-on")
    lab.snapshot = snapshot  # type: ignore[method-assign]
    captures = lab.prepare(request)["preCheckpointCaptures"]
    player = request["overrides"]["parties"]["player"][0]
    species, nature_id = player["species"], player["nature"]
    nature_mod = NATURE_MODS[nature_id]
    selector, initializer, source_id, period, passes, threshold = VARIANTS[nature_mod]
    selector_evidence, source_record_index = EVIDENCE.get((species, nature_id), (None, None))
    if selector_evidence is None:
        raise RuntimeError(f"unexpected red-glow evidence party: species={species}, nature={nature_id}")
    first = next((index for index, capture in enumerate(captures)
                  if (capture["state"].get("battler0") or {}).get("callbackSymbol") == initializer), None)
    if first is None:
        raise RuntimeError(f"{selector} initializer was not observed")
    dense = []
    for capture in captures[first:]:
        dense.append({
            "frame": capture["frame"], "sha256": capture["sha256"],
            "battler0": capture["state"]["battler0"],
            "monAnimationTask": capture["state"]["monAnimationTask"],
        })
        if len(dense) > 1 and dense[-1]["battler0"]["callbackSymbol"] == "SpriteCallbackDummy":
            break
    else:
        raise RuntimeError(f"{selector} did not reach SpriteCallbackDummy")
    expected_callbacks = [initializer, "WaitAnimEnd", "SpriteCallbackDummy"]
    observed_callbacks = [row["battler0"]["callbackSymbol"] for row in dense]
    missing = [name for name in expected_callbacks if name not in observed_callbacks]
    if missing:
        raise RuntimeError(f"incomplete callback lifecycle: missing={missing}")
    result = {
        "schema": "back-shake-glow-red-scene-on-dense/v1", "profile": "battle-scene-on",
        "species": species, "natureId": nature_id, "natureMod": nature_mod,
        "selectorEvidence": selector_evidence, "sourceRecordIndex": source_record_index,
        "sourceBackAnimSet": "BACK_ANIM_SHAKE_GLOW_RED", "sourceBackAnimSetIndex": 22,
        "sourceSelector": selector, "sourceInitializer": initializer, "sourceId": source_id,
        "sourcePeriod": period, "sourcePasses": passes, "sourceMovementThreshold": threshold,
        "sourceColorSelector": "SHAKEGLOW_RED", "sourcePhases": ["ShakeGlow_Blend", "ShakeGlow_Move", "WaitAnimEnd"],
        "paletteContract": "OBJ_PLTT_ID(oam.paletteNum), even-tick Sin(data[2],12), RGB_RED restore",
        "sourceWindow": {"startFrame": dense[0]["frame"], "endFrame": dense[-1]["frame"], "frameCount": len(dense)},
        "callbackAddresses": {name: address_by_name[name] for name in sorted(expected_callbacks)},
        "frames": dense,
    }
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: {selector}, dense={dense[0]['frame']}..{dense[-1]['frame']} ({len(dense)} frames)")


if __name__ == "__main__":
    main()
