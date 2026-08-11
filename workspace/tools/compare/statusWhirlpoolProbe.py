#!/usr/bin/env python3
"""Dense Status_Whirlpool source/hardware/audio receipts, Scene ON only."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: whirlpoolProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents)
               if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 250

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")],
                        check=True, capture_output=True, text=True).stdout
    pairs = [(int(parts[0], 16), parts[2]) for line in nm.splitlines()
             if len(parts := line.split()) == 3
             and all(c in "0123456789abcdefABCDEF" for c in parts[0])]
    names, by = {name: address for address, name in pairs}, {
        address: name for address, name in pairs}
    sy = oracle.symbols
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    active, ptr, wait = (names["gAnimScriptActive"], names["sBattleAnimScriptPtr"],
                         names["sAnimFramesToWait"])
    start, end = names["Status_Whirlpool"], names["Status_Clamp"]
    palette_tags, tile_tags = names["sSpritePaletteTags"], names["sSpriteTileRangeTags"]
    software_oam = names["gMain"] + 0x38
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
        return "".join(f"{oracle.read_u8(address + offset):02x}"
                       for offset in range(size))
    def ident(address: int) -> dict:
        return {"address": address, "symbol": by.get(address & ~1)}
    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = u16(base + 2) >> 9 & 31
        matrix = matrices + matrix_num * 8
        hardware_matrix = 0x07000006 + matrix_num * 0x20
        return {
            "slot": slot, "raw": raw(base, 0x44),
            "template": ident(u32(base + 0x14)), "callback": ident(u32(base + 0x1c)),
            "attr": [u16(base + offset) for offset in (0, 2, 4)],
            "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "subpriority": oracle.read_u8(base + 0x43), "matrixNum": matrix_num,
            "matrix": [s16(matrix + offset) for offset in (0, 2, 4, 6)],
            "hardwareMatrix": [s16(hardware_matrix + offset) for offset in (0, 8, 16, 24)],
            "data": [s16(base + 0x2e + index * 2) for index in range(8)],
        }
    def player(name: str) -> dict:
        info, track = sy[f"gMPlayInfo_{name}"], sy[f"gMPlayTrack_{name}"]
        return {"rawInfo": raw(info, 0x40), "songHeader": u32(info),
                "status": u32(info + 4),
                "tracks": [{"flags": oracle.read_u8(track + index * 0x50),
                            "panX": s8(track + index * 0x50 + 0x15),
                            "raw": raw(track + index * 0x50, 0x50)}
                           for index in range(3)]}
    registers = {"dispcnt": 0x04000000, "bg0cnt": 0x04000008,
                 "bg1cnt": 0x0400000A, "bg2cnt": 0x0400000C,
                 "bg3cnt": 0x0400000E, "bg0hofs": 0x04000010,
                 "bg0vofs": 0x04000012, "bg1hofs": 0x04000014,
                 "bg1vofs": 0x04000016, "bg2hofs": 0x04000018,
                 "bg2vofs": 0x0400001A, "bg3hofs": 0x0400001C,
                 "bg3vofs": 0x0400001E, "winin": 0x04000048,
                 "winout": 0x0400004A, "mosaic": 0x0400004C,
                 "bldcnt": 0x04000050, "bldalpha": 0x04000052,
                 "bldy": 0x04000054}
    rows, frame = [], 0
    collecting, pre_window, previous, prior_whirlpool_move = False, None, None, False
    def take() -> None:
        nonlocal frame, collecting, pre_window, previous, prior_whirlpool_move
        snapshot = lab.snapshot()
        if snapshot["engine"]["currentMove"] == MOVE:
            prior_whirlpool_move = True
        script_ptr = u32(ptr)
        in_status = oracle.read_u8(active) and start <= script_ptr < end
        if in_status and not collecting:
            collecting, pre_window = True, previous
        if not collecting:
            previous = {"battlers": snapshot["battlers"], "engine": snapshot["engine"]}
            return
        rgb = oracle.screen_rgb()
        (RGB / f"{frame:05d}.rgb").write_bytes(rgb)
        live = [sprite(slot) for slot in range(64)
                if oracle.read_u8(sprites + slot * 0x44 + 0x3e) & 1]
        live_tasks = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if oracle.read_u8(base + 4):
                live_tasks.append({"slot": slot, "raw": raw(base, 0x28),
                                   "func": ident(u32(base)),
                                   "data": [s16(base + 8 + index * 2)
                                            for index in range(16)]})
        rows.append({"frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
                     "gAnimScriptActive": oracle.read_u8(active),
                     "script": ident(script_ptr),
                     "scriptOffset": script_ptr - start if start <= script_ptr < end else None,
                     "scriptWait": s8(wait),
                     "visualTaskCount": oracle.read_u8(sy["gAnimVisualTaskCount"]),
                     "soundTaskCount": oracle.read_u8(sy["gAnimSoundTaskCount"]),
                     "tasks": live_tasks, "sprites": live, "battlers": snapshot["battlers"],
                     "engine": snapshot["engine"],
                     "softwareOam": [raw(software_oam + index * 8, 8) for index in range(128)],
                     "hardwareOam": [raw(0x07000000 + index * 8, 8) for index in range(128)],
                     "hardwareMatrices": [[s16(0x07000006 + index * 0x20 + offset)
                                           for offset in (0, 8, 16, 24)] for index in range(32)],
                     "fadedPalette": [u16(sy["gPlttBufferFaded"] + index * 2) for index in range(512)],
                     "unfadedPalette": [u16(sy["gPlttBufferUnfaded"] + index * 2) for index in range(512)],
                     "hardwarePalette": [u16(0x05000000 + index * 2) for index in range(512)],
                     "paletteTags": [u16(palette_tags + index * 2) for index in range(16)],
                     "tileTags": [u16(tile_tags + index * 2) for index in range(128)],
                     "registers": {name: u16(address) for name, address in registers.items()},
                     "se1": player("SE1"), "se2": player("SE2")})
        if not oracle.read_u8(active):
            collecting = False
    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; take()
    if pre_window is None or not rows:
        raise RuntimeError("Status_Whirlpool source pointer was not observable")
    source = rows
    topology = {"tasks": sorted({task["func"]["symbol"] for row in source for task in row["tasks"] if task["func"]["symbol"]}),
                "templates": sorted({item["template"]["symbol"] for row in source for item in row["sprites"] if item["template"]["symbol"]}),
                "callbacks": sorted({item["callback"]["symbol"] for row in source for item in row["sprites"] if item["callback"]["symbol"]})}
    def starts(template: str) -> int:
        count, previous = 0, set()
        for row in source:
            current = {item["slot"] for item in row["sprites"] if item["template"]["symbol"] == template}
            count += len(current - previous); previous = current
        return count
    counts = {"whirlpoolOrb": starts("gWhirlpoolSpriteTemplate")}
    if counts != {"whirlpoolOrb": 12}:
        raise RuntimeError(f"Status_Whirlpool lifecycle count changed: {counts}")
    if "AnimParticleInVortex_Step" not in topology["callbacks"]:
        raise RuntimeError(f"Status_Whirlpool vortex callback missing: {topology}")
    if source[-1]["gAnimScriptActive"] or source[-1]["visualTaskCount"]:
        raise RuntimeError("Status_Whirlpool first inactive cleanup retained a visual task")
    if not prior_whirlpool_move or not (pre_window["battlers"]["player"]["status2"] or pre_window["battlers"]["opponent"]["status2"]):
        raise RuntimeError("Status_Whirlpool lacks real pre-window trap provenance")
    OUTPUT.write_text(json.dumps({"schema": "status-whirlpool-dense-evidence/v1", "setup": setup,
        "sourceWindow": {"startFrame": source[0]["frame"], "endFrame": source[-1]["frame"], "frameCount": len(source)},
        "sourceSymbols": {"Status_Whirlpool": start, "Status_Clamp": end},
        "templates": {"gWhirlpoolSpriteTemplate": names["gWhirlpoolSpriteTemplate"]},
        "taskSymbols": {name: names[name] for name in ("AnimTask_ShakeMon", "AnimTask_ShakeMon_Step")},
        "callbackSymbols": {name: names[name] for name in ("AnimParticleInVortex", "AnimParticleInVortex_Step")},
        "songHeaders": {"SE_M_WHIRLPOOL": names["se_m_whirlpool"]},
        "topology": topology, "lifecycleCounts": counts, "preWindow": pre_window,
        "priorWhirlpoolMove": prior_whirlpool_move, "frames": source}, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: status source {source[0]['frame']}..{source[-1]['frame']} ({len(source)} frames)")

main()
