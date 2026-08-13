#!/usr/bin/env python3
"""Capture a complete pointer-bounded Scene-ON MOVE_COSMIC_POWER window."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: cosmicPowerProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 322


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(parts[0], 16), parts[2]) for line in nm.splitlines() if len(parts := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in parts[0])]
    names = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}
    sy = oracle.symbols
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    active, pointer = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"]
    start, end = names["Move_COSMIC_POWER"], names["Move_BLAST_BURN"]
    tags, tile_tags, software = names["sSpritePaletteTags"], names["sSpriteTileRangeTags"], names["gMain"] + 0x38
    RGB.mkdir(parents=True, exist_ok=True)

    def u8(address: int) -> int: return oracle.read_u8(address)
    def u16(address: int) -> int: return u8(address) | u8(address + 1) << 8
    def u32(address: int) -> int: return u16(address) | u16(address + 2) << 16
    def s16(address: int) -> int:
        value = u16(address)
        return value - 0x10000 if value >= 0x8000 else value
    def s8(address: int) -> int:
        value = u8(address)
        return value - 0x100 if value >= 0x80 else value
    def raw(address: int, count: int) -> str: return bytes(u8(address + i) for i in range(count)).hex()
    def ident(address: int) -> dict[str, int | str | None]: return {"address": address, "symbol": by_address.get(address & ~1)}

    def sprite(slot: int) -> dict[str, object]:
        base = sprites + slot * 0x44
        matrix_num = (u16(base + 2) >> 9) & 31
        matrix = matrices + matrix_num * 8
        return {"slot":slot,"raw":raw(base,0x44),"template":ident(u32(base+0x14)),"callback":ident(u32(base+0x1c)),"attr":[u16(base+i) for i in (0,2,4)],"x":s16(base+0x20),"y":s16(base+0x22),"x2":s16(base+0x24),"y2":s16(base+0x26),"subpriority":u8(base+0x2b),"invisible":(u8(base+0x3e)>>2)&1,"matrixNum":matrix_num,"matrix":[s16(matrix+i) for i in (0,2,4,6)],"data":[s16(base+0x2e+i*2) for i in range(8)]}

    def mplay(name: str) -> dict[str, object]:
        info, track = sy[f"gMPlayInfo_{name}"], sy[f"gMPlayTrack_{name}"]
        return {"rawInfo":raw(info,0x40),"songHeader":u32(info),"status":u32(info+4),"tracks":[{"flags":u8(track+i*0x50),"pan":s8(track+i*0x50+0x14),"panX":s8(track+i*0x50+0x15),"raw":raw(track+i*0x50,0x50)} for i in range(3)]}

    regs = {"dispcnt":0x04000000,"bg0cnt":0x04000008,"bg1cnt":0x0400000A,"bg2cnt":0x0400000C,"bg3cnt":0x0400000E,"bg0hofs":0x04000010,"bg0vofs":0x04000012,"bg1hofs":0x04000014,"bg1vofs":0x04000016,"bg2hofs":0x04000018,"bg2vofs":0x0400001A,"bg3hofs":0x0400001C,"bg3vofs":0x0400001E,"bldcnt":0x04000050,"bldalpha":0x04000052,"bldy":0x04000054}

    def row(frame: int, snap: dict) -> dict[str, object]:
        rgb = oracle.screen_rgb(); (RGB / f"{frame:05d}.rgb").write_bytes(rgb)
        script = u32(pointer)
        live_tasks = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if u8(base + 4): live_tasks.append({"slot":slot,"raw":raw(base,0x28),"func":ident(u32(base)),"data":[s16(base+8+i*2) for i in range(16)]})
        return {"frame":frame,"sha256":hashlib.sha256(rgb).hexdigest(),"gAnimScriptActive":bool(u8(active)),"script":ident(script),"scriptOffset":script-start if start<=script<end else None,"visualTaskCount":u8(sy["gAnimVisualTaskCount"]),"soundTaskCount":u8(sy["gAnimSoundTaskCount"]),"tasks":live_tasks,"sprites":[sprite(slot) for slot in range(64) if u8(sprites+slot*0x44+0x3e)&1],"battlers":snap["battlers"],"parties":snap["parties"],"engine":snap["engine"],"immutableState":{key:snap[key] for key in ("battleOutcome","weather","weatherTurns","sideStatuses","sideConditions")},"animationRng":u32(names["gRng2Value"]),"softwareOam":[raw(software+i*8,8) for i in range(128)],"hardwareOam":[raw(0x07000000+i*8,8) for i in range(128)],"softwareMatrices":[[s16(matrices+i*8+j) for j in (0,2,4,6)] for i in range(32)],"hardwareMatrices":[[s16(0x07000006+i*0x20+j) for j in (0,8,16,24)] for i in range(32)],"fadedPalette":[u16(sy["gPlttBufferFaded"]+i*2) for i in range(512)],"unfadedPalette":[u16(sy["gPlttBufferUnfaded"]+i*2) for i in range(512)],"hardwarePalette":[u16(0x05000000+i*2) for i in range(512)],"paletteTags":[u16(tags+i*2) for i in range(16)],"tileTags":[u16(tile_tags+i*2) for i in range(128)],"registers":{name:u16(address) for name,address in regs.items()},"se1":mplay("SE1"),"se2":mplay("SE2")}

    rows, started, frame = [], False, 0
    def take() -> None:
        nonlocal started
        snap = lab.snapshot(); in_source = start <= u32(pointer) < end and bool(u8(active))
        if not started and snap["engine"]["currentMove"] == MOVE and in_source: started = True
        if started: rows.append(row(frame, snap))
    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; take()
            if started and rows[-1]["gAnimScriptActive"] is False: break
        if started and rows[-1]["gAnimScriptActive"] is False: break
    if not rows or rows[0]["scriptOffset"] is None: raise RuntimeError("Cosmic Power source pointer not observed")
    topology = {"tasks":sorted({task["func"]["symbol"] for item in rows for task in item["tasks"] if task["func"]["symbol"]}),"templates":sorted({sprite["template"]["symbol"] for item in rows for sprite in item["sprites"] if sprite["template"]["symbol"]}),"callbacks":sorted({sprite["callback"]["symbol"] for item in rows for sprite in item["sprites"] if sprite["callback"]["symbol"]})}
    result = {"schema":"cosmic-power-dense-evidence/v1","setup":setup,"sourceWindow":{"startFrame":rows[0]["frame"],"endFrame":rows[-1]["frame"],"frameCount":len(rows)},"sourceSymbols":{"Move_COSMIC_POWER":start,"Move_BLAST_BURN":end},"topology":topology,"frames":rows}
    OUTPUT.write_text(json.dumps(result,separators=(",",":"))+"\n")
    print(f"wrote {OUTPUT}: source {rows[0]['frame']}..{rows[-1]['frame']} ({len(rows)} frames)")


if __name__ == "__main__": main()
