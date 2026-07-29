#!/usr/bin/env python3
"""Dense Scene-ON MOVE_FOCUS_ENERGY source, hardware, and audio receipts."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: focusEnergyProbe.py <scenario> <output.json> <rgb-dir>")

SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 116


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    names = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}
    sy = oracle.symbols
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    active, ptr, wait = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"], names["sAnimFramesToWait"]
    start, end = names["Move_FOCUS_ENERGY"], names["Move_BIDE"]
    tags, software = names["sSpritePaletteTags"], names["gMain"] + 0x38
    RGB.mkdir(parents=True, exist_ok=True)

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
        return "".join(f"{oracle.read_u8(address + i):02x}" for i in range(size))

    def ident(address: int) -> dict:
        return {"address": address, "symbol": by_address.get(address & ~1)}

    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 31
        matrix = matrices + matrix_num * 8
        return {"slot": slot, "raw": raw(base, 0x44), "template": ident(u32(base + 0x14)), "callback": ident(u32(base + 0x1C)), "attr": [u16(base + i) for i in (0, 2, 4)], "matrixNum": matrix_num, "matrix": [s16(matrix + i) for i in (0, 2, 4, 6)], "data": [s16(base + 0x2E + i * 2) for i in range(8)]}

    def player(name: str) -> dict:
        info, track = sy[f"gMPlayInfo_{name}"], sy[f"gMPlayTrack_{name}"]
        return {"rawInfo": raw(info, 0x40), "songHeader": u32(info), "status": u32(info + 4), "tracks": [{"flags": oracle.read_u8(track + i * 0x50), "panX": s8(track + i * 0x50 + 0x15), "raw": raw(track + i * 0x50, 0x50)} for i in range(3)]}

    registers = {"dispcnt": 0x04000000, "bg0cnt": 0x04000008, "bg1cnt": 0x0400000A, "bg2cnt": 0x0400000C, "bg3cnt": 0x0400000E, "bldcnt": 0x04000050, "bldalpha": 0x04000052, "bldy": 0x04000054}
    rows: list[dict] = []
    frame = 0

    def take() -> None:
        if lab.snapshot()["engine"]["currentMove"] != MOVE:
            return
        rgb = oracle.screen_rgb()
        (RGB / f"{frame:05d}.rgb").write_bytes(rgb)
        script = u32(ptr)
        live_sprites = [sprite(i) for i in range(64) if oracle.read_u8(sprites + i * 0x44 + 0x3E) & 1]
        live_tasks = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4):
                live_tasks.append({"slot": slot, "raw": raw(base, 0x28), "func": ident(u32(base)), "data": [s16(base + 8 + i * 2) for i in range(16)]})
        rows.append({"frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(), "gAnimScriptActive": oracle.read_u8(active), "script": ident(script), "scriptOffset": script - start if start <= script < end else None, "scriptWait": s8(wait), "visualTaskCount": oracle.read_u8(sy["gAnimVisualTaskCount"]), "soundTaskCount": oracle.read_u8(sy["gAnimSoundTaskCount"]), "tasks": live_tasks, "sprites": live_sprites, "battlers": lab.snapshot()["battlers"], "softwareOam": [raw(software + i * 8, 8) for i in range(128)], "hardwareOam": [raw(0x07000000 + i * 8, 8) for i in range(128)], "hardwareMatrices": [[s16(0x07000006 + i * 0x20 + j) for j in (0, 8, 16, 24)] for i in range(32)], "fadedPalette": [u16(sy["gPlttBufferFaded"] + i * 2) for i in range(512)], "unfadedPalette": [u16(sy["gPlttBufferUnfaded"] + i * 2) for i in range(512)], "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)], "paletteTags": [u16(tags + i * 2) for i in range(16)], "registers": {name: u16(address) for name, address in registers.items()}, "se1": player("SE1"), "se2": player("SE2")})

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            take()
    first = next((i for i, row in enumerate(rows) if row["gAnimScriptActive"] and row["scriptOffset"] is not None), None)
    if first is None:
        raise RuntimeError("Focus Energy source pointer not observed")
    last = next((i for i in range(first + 1, len(rows)) if not rows[i]["gAnimScriptActive"]), None)
    if last is None:
        raise RuntimeError("Focus Energy inactive cleanup not observed")
    source = rows[first:last + 1]
    topology = {"tasks": sorted({x["func"]["symbol"] for row in source for x in row["tasks"] if x["func"]["symbol"]}), "templates": sorted({x["template"]["symbol"] for row in source for x in row["sprites"] if x["template"]["symbol"]}), "callbacks": sorted({x["callback"]["symbol"] for row in source for x in row["sprites"] if x["callback"]["symbol"]})}

    def starts(template: str) -> int:
        count, previous = 0, set()
        for row in source:
            current = {x["slot"] for x in row["sprites"] if x["template"]["symbol"] == template}
            count += len(current - previous)
            previous = current
        return count

    lifecycle_counts = {"endureEnergy": starts("gEndureEnergySpriteTemplate")}
    # The source emits nine sprites; their 16x32 animation frees and reuses
    # OAM slots within each three-sprite wave, producing fifteen live-slot starts.
    if lifecycle_counts["endureEnergy"] != 15:
        raise RuntimeError(f"Focus Energy lifecycle count changed: {lifecycle_counts}")
    if "AnimEndureEnergy_Step" not in topology["callbacks"] or "AnimTask_ShakeMon2_Step" not in topology["tasks"]:
        raise RuntimeError(f"Focus Energy topology missing: {topology}")
    if source[-1]["gAnimScriptActive"] or source[-1]["visualTaskCount"]:
        raise RuntimeError("Focus Energy first cleanup retained animation")
    result = {"schema": "focus-energy-dense-evidence/v1", "setup": setup, "sourceWindow": {"startFrame": source[0]["frame"], "endFrame": source[-1]["frame"], "frameCount": len(source)}, "sourceSymbols": {"Move_FOCUS_ENERGY": start, "Move_BIDE": end}, "templates": {"gEndureEnergySpriteTemplate": names["gEndureEnergySpriteTemplate"]}, "taskSymbols": {"AnimTask_ShakeMon2": names["AnimTask_ShakeMon2"]}, "callbackSymbols": {"AnimEndureEnergy": names["AnimEndureEnergy"]}, "songHeaders": {"SE_M_DRAGON_RAGE": names["se_m_dragon_rage"]}, "topology": topology, "lifecycleCounts": lifecycle_counts, "frames": source}
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: source {source[0]['frame']}..{source[-1]['frame']} ({len(source)} frames)")


if __name__ == "__main__":
    main()
