#!/usr/bin/env python3
"""Dense source-window Scene-ON receipts for legal MOVE_SONIC_BOOM fixtures."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: sonicBoomProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents)
               if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 49


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")],
                        check=True, capture_output=True, text=True).stdout
    pairs = [(int(parts[0], 16), parts[2]) for line in nm.splitlines()
             if len(parts := line.split()) == 3 and all(ch in "0123456789abcdefABCDEF" for ch in parts[0])]
    names = {name: address for address, name in pairs}
    symbols = {address: name for address, name in pairs}
    sy = oracle.symbols
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    faded, unfaded = sy["gPlttBufferFaded"], sy["gPlttBufferUnfaded"]
    battler_ids, palette_tags = sy["gBattlerSpriteIds"], names["sSpritePaletteTags"]
    script_active, script_ptr = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"]
    start, end = names["Move_SONIC_BOOM"], names["Move_THUNDER_SHOCK"]

    def u16(address: int) -> int:
        return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8
    def u32(address: int) -> int:
        return u16(address) | u16(address + 2) << 16
    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value
    def s8(address: int) -> int:
        value = oracle.read_u8(address)
        return value - 0x100 if value >= 0x80 else value
    def raw(address: int, size: int) -> str:
        return "".join(f"{oracle.read_u8(address + index):02x}" for index in range(size))
    def identity(address: int) -> dict[str, int | str | None]:
        return {"address": address, "symbol": symbols.get(address & ~1)}
    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 31
        matrix = matrices + matrix_num * 8
        return {"slot": slot, "raw": raw(base, 0x44),
                "template": identity(u32(base + 0x14)), "callback": identity(u32(base + 0x1c)),
                "x": s16(base + 0x20), "y": s16(base + 0x22),
                "x2": s16(base + 0x24), "y2": s16(base + 0x26),
                "attr": [u16(base + offset) for offset in (0, 2, 4)],
                "subpriority": oracle.read_u8(base + 0x43), "matrixNum": matrix_num,
                "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
                "data": [s16(base + 0x2e + index * 2) for index in range(8)]}
    def active_sprites() -> list[dict]:
        return [sprite(slot) for slot in range(64) if oracle.read_u8(sprites + slot * 0x44 + 0x3e) & 1]
    def active_tasks() -> list[dict]:
        rows = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4):
                rows.append({"slot": slot, "raw": raw(base, 0x28), "func": identity(u32(base)),
                             "data": [s16(base + 8 + index * 2) for index in range(16)]})
        return rows
    def player(name: str) -> dict:
        info, tracks = sy[f"gMPlayInfo_{name}"], sy[f"gMPlayTrack_{name}"]
        return {"rawInfo": raw(info, 0x40), "songHeader": u32(info), "status": u32(info + 4),
                "tracks": [{"flags": oracle.read_u8(tracks + index * 0x50),
                            "panX": s8(tracks + index * 0x50 + 0x15),
                            "raw": raw(tracks + index * 0x50, 0x50)} for index in range(3)]}

    RGB_DIR.mkdir(parents=True, exist_ok=True)
    rows: list[dict] = []
    frame = 0
    def capture() -> None:
        if lab.snapshot()["engine"]["currentMove"] != MOVE:
            return
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        pointer = u32(script_ptr)
        rows.append({"frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
                     "gAnimScriptActive": oracle.read_u8(script_active),
                     "script": identity(pointer),
                     "scriptOffset": pointer - start if start <= pointer < end else None,
                     "visualTaskCount": oracle.read_u8(sy["gAnimVisualTaskCount"]),
                     "soundTaskCount": oracle.read_u8(sy["gAnimSoundTaskCount"]),
                     "tasks": active_tasks(), "sprites": active_sprites(),
                     "playerSprite": sprite(oracle.read_u8(battler_ids)),
                     "opponentSprite": sprite(oracle.read_u8(battler_ids + 1)),
                     "hardwareOam": [raw(0x07000000 + index * 8, 8) for index in range(128)],
                     "hardwareMatrices": [[s16(0x07000006 + index * 0x20 + offset)
                                           for offset in (0, 8, 16, 24)] for index in range(32)],
                     "fadedPalette": [u16(faded + index * 2) for index in range(512)],
                     "unfadedPalette": [u16(unfaded + index * 2) for index in range(512)],
                     "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
                     "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
                     "registers": {name: u16(address) for name, address in {
                         "dispcnt": 0x04000000, "bldcnt": 0x04000050,
                         "bldalpha": 0x04000052, "bldy": 0x04000054,
                         "winin": 0x04000048, "winout": 0x0400004A}.items()},
                     "se1": player("SE1"), "se2": player("SE2")})
    capture()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; capture()
    start_index = next((index for index, row in enumerate(rows)
                        if row["gAnimScriptActive"] and row["scriptOffset"] is not None), None)
    if start_index is None:
        raise RuntimeError("Sonic Boom source pointer was not observable")
    end_index = next((index for index in range(start_index + 1, len(rows))
                      if not rows[index]["gAnimScriptActive"]), None)
    if end_index is None:
        raise RuntimeError("Sonic Boom first inactive cleanup was not captured")
    source = rows[start_index:end_index + 1]
    topology = {"tasks": sorted({symbol for row in source for task in row["tasks"]
                                  if (symbol := task["func"]["symbol"]) is not None}),
                "templates": sorted({symbol for row in source for sprite_row in row["sprites"]
                                     if (symbol := sprite_row["template"]["symbol"]) is not None}),
                "callbacks": sorted({symbol for row in source for sprite_row in row["sprites"]
                                     if (symbol := sprite_row["callback"]["symbol"]) is not None})}
    required = {"gSonicBoomSpriteTemplate", "gBasicHitSplatSpriteTemplate"}
    if not required <= set(topology["templates"]):
        raise RuntimeError(f"missing Sonic Boom templates: {topology}")
    OUTPUT.write_text(json.dumps({"schema": "sonic-boom-dense-evidence/v1", "setup": setup,
        "captureWindow": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"], "frameCount": len(rows)},
        "sourceWindow": {"startFrame": source[0]["frame"], "endFrame": source[-1]["frame"], "frameCount": len(source)},
        "sourceSymbols": {"Move_SONIC_BOOM": start, "Move_THUNDER_SHOCK": end},
        "templates": {key: names[key] for key in ("gSonicBoomSpriteTemplate", "gBasicHitSplatSpriteTemplate")},
        "songHeaders": {"SE_M_RAZOR_WIND2": names["se_m_razor_wind2"]},
        "topology": topology, "frames": source}, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: source {source[0]['frame']}..{source[-1]['frame']} ({len(source)} frames)")


main()
