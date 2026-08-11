#!/usr/bin/env python3
"""Capture a complete Scene-ON BACK_ANIM_DIP_RIGHT_SIDE window."""
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

# Source `sBackAnimNatureModTable[NUM_NATURES]`, indexed by `GetNature`.
NATURE_MODS = [0, 2, 0, 0, 0, 1, 1, 1, 0, 1, 2, 0, 1, 0, 0, 2, 2, 2, 2, 1, 1, 2, 1, 2, 1]
VARIANTS = {
    0: ("ANIM_H_DIP_TWICE", "Anim_HorizontalDip_Twice", 132, 30, 8, -32, 2),
    1: ("ANIM_H_DIP", "Anim_HorizontalDip", 130, 60, 8, -32, 1),
    2: ("ANIM_H_DIP_FAST", "Anim_HorizontalDip_Fast", 131, 90, 8, -32, 1),
}
EVIDENCE = {
    (318, 4): ("Factory record index 75 FRONTIER_MON_BALTOY NATURE_NAUGHTY", 75),
    (191, 7): ("Factory record index 0 FRONTIER_MON_SUNKERN NATURE_RELAXED", 0),
    (11, 18): ("Factory record index 8 FRONTIER_MON_METAPOD NATURE_BASHFUL", 8),
}


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    oracle = EmeraldOracle(ROM, MAP, BOOTSTRAP)
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

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        attr0 = u16(base)
        attr1 = u16(base + 2)
        matrix_number = (attr1 >> 9) & 31
        matrix = matrices + matrix_number * 8
        callback = u32(base + 0x1C)
        flags = u16(base + 0x3E)
        return {
            "slot": slot, "flags": flags, "visible": not bool(flags & 4),
            "x": s16(base + 0x20), "y": s16(base + 0x22), "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "animNum": u8(base + 0x2A), "animCmdIndex": u8(base + 0x2B),
            "centerToCornerVecX": s8(base + 0x28), "centerToCornerVecY": s8(base + 0x29),
            "data": [s16(base + 0x2E + index * 2) for index in range(8)],
            "callback": f"0x{callback:08x}", "callbackSymbol": name_by_address.get(callback & ~1),
            "oam": {"attr0": attr0, "attr1": attr1, "attr2": u16(base + 4), "affineMode": (attr0 >> 8) & 3,
                    "matrixNumber": matrix_number, "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
                    "raw": raw(base, 8)},
        }

    def snapshot() -> dict:
        slot = u8(sprite_ids)
        return {"battler0": None} if slot >= 64 else {"battler0": sprite(slot)}

    oracle.screen_png = lambda: b""  # type: ignore[method-assign]
    lab = BattleLab(oracle, "battle-scene-on")
    lab.snapshot = snapshot  # type: ignore[method-assign]
    captures = lab.prepare(request)["preCheckpointCaptures"]
    player = request["overrides"]["parties"]["player"][0]
    species = player["species"]
    nature_id = player["nature"]
    nature_mod = NATURE_MODS[nature_id]
    selector, initializer, source_id, duration, amplitude, offset, runs = VARIANTS[nature_mod]
    selector_evidence, source_record_index = EVIDENCE.get((species, nature_id), (None, None))
    if selector_evidence is None:
        raise RuntimeError(f"unexpected right-side-dip evidence party: species={species}, nature={nature_id}")
    first = next((index for index, capture in enumerate(captures)
                  if (capture["state"].get("battler0") or {}).get("callbackSymbol") == initializer), None)
    if first is None:
        seen = sorted({(capture["state"].get("battler0") or {}).get("callbackSymbol") for capture in captures})
        raise RuntimeError(f"{selector} callback window not observed; callbacks={seen}")
    dense = []
    for capture in captures[first:]:
        dense.append({"frame": capture["frame"], "sha256": capture["sha256"], "battler0": capture["state"]["battler0"]})
        if len(dense) > 1 and dense[-1]["battler0"]["callbackSymbol"] == "SpriteCallbackDummy":
            break
    else:
        raise RuntimeError(f"{selector} dense window did not reach SpriteCallbackDummy")
    if len(dense) < 3 or dense[1]["battler0"]["callbackSymbol"] != initializer:
        raise RuntimeError(f"{selector} did not retain its guarded initializer after its first SetHorizontalDip call")
    callbacks = {initializer, "SetHorizontalDip", "WaitAnimEnd", "SpriteCallbackDummy"}
    result = {
        "schema": "back-dip-right-side-scene-on-dense/v1", "profile": "battle-scene-on",
        "species": species, "natureId": nature_id, "natureMod": nature_mod,
        "selectorEvidence": selector_evidence, "sourceRecordIndex": source_record_index,
        "sourceBackAnimSet": "BACK_ANIM_DIP_RIGHT_SIDE", "sourceBackAnimSetIndex": 18,
        "sourceSelector": selector, "sourceInitializer": initializer, "sourceId": source_id,
        "sourceDuration": duration, "sourceAmplitude": amplitude, "sourceOffset": offset, "sourceRuns": runs,
        "sourceOverflow": "data[2] > data[7]", "sourceWindow": {"startFrame": dense[0]["frame"], "endFrame": dense[-1]["frame"], "frameCount": len(dense)},
        "callbackAddresses": {name: address_by_name[name] for name in sorted(callbacks) if name in address_by_name},
        "frames": dense,
    }
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: species={species}, nature={nature_id}, {selector}, dense={dense[0]['frame']}..{dense[-1]['frame']} ({len(dense)} frames)")


if __name__ == "__main__":
    main()
