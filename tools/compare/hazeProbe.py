#!/usr/bin/env python3
"""Pointer-bounded dense Scene-ON evidence for legal Move_HAZE."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: hazeProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    sy = oracle.symbols
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    symbol_rows = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    names = {name: address for address, name in symbol_rows}
    reverse = {address: name for address, name in symbol_rows}
    move_start, move_end = names["Move_HAZE"], names["Move_FIRE_PUNCH"]
    sprites, tasks, matrices = sy["gSprites"], sy["gTasks"], sy["gOamMatrices"]
    faded, unfaded = sy["gPlttBufferFaded"], sy["gPlttBufferUnfaded"]
    battler_ids = sy["gBattlerSpriteIds"]
    script_active, script_ptr = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"]
    frames_wait = names["sAnimFramesToWait"]
    visual_count, sound_count = sy["gAnimVisualTaskCount"], sy["gAnimSoundTaskCount"]
    bg1x, bg1y = sy["gBattle_BG1_X"], sy["gBattle_BG1_Y"]
    se1, songs = sy["gMPlayInfo_SE1"], sy["gSongTable"]

    def u16(a: int) -> int: return oracle.read_u8(a) | oracle.read_u8(a + 1) << 8
    def s16(a: int) -> int:
        v = u16(a); return v - 0x10000 if v >= 0x8000 else v
    def raw(a: int, n: int) -> str: return "".join(f"{oracle.read_u8(a+i):02x}" for i in range(n))
    def ident(a: int) -> dict: return {"address": a, "symbol": reverse.get(a & ~1)}
    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        matrix_num = u16(base + 2) >> 9 & 31
        matrix = matrices + matrix_num * 8
        return {"slot":slot,"raw":raw(base,0x44),"callback":ident(oracle.read_u32(base+0x1c)),"attr":[u16(base),u16(base+2),u16(base+4)],"x":s16(base+0x20),"y":s16(base+0x22),"x2":s16(base+0x24),"y2":s16(base+0x26),"invisible":bool(oracle.read_u8(base+0x3e)&4),"matrix":[s16(matrix+i) for i in (0,2,4,6)],"data":[s16(base+0x2e+i*2) for i in range(8)]}
    def task(slot: int) -> dict:
        base = tasks + slot * 0x28
        return {"slot":slot,"raw":raw(base,0x28),"function":ident(oracle.read_u32(base)),"data":[s16(base+8+i*2) for i in range(16)]}
    def audio() -> dict:
        return {"songHeader":oracle.read_u32(se1),"status":oracle.read_u32(se1+4)}

    RGB_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    started = False
    finished = False
    def capture(frame: int) -> None:
        nonlocal started, finished
        if finished: return
        ptr = oracle.read_u32(script_ptr)
        in_bounds = move_start <= ptr < move_end
        if in_bounds: started = True
        if not started: return
        active_tasks = [task(i) for i in range(16) if oracle.read_u8(tasks+i*0x28+4)]
        rgb = oracle.screen_rgb(); (RGB_DIR/f"{frame:05d}.rgb").write_bytes(rgb)
        snap = lab.snapshot()
        rows.append({"frame":frame,"sha256":hashlib.sha256(rgb).hexdigest(),"script":{"active":bool(oracle.read_u8(script_active)),"pointer":ptr,"pointerSymbol":reverse.get(ptr),"inBounds":in_bounds,"framesToWait":oracle.read_u8(frames_wait)},"activeTasks":active_tasks,"visualTaskCount":oracle.read_u8(visual_count),"soundTaskCount":oracle.read_u8(sound_count),"battlers":[sprite(oracle.read_u8(battler_ids+i)) for i in range(2)],"hardwareOam":[[u16(0x07000000+i*8+j) for j in (0,2,4)] for i in range(128)],"registers":{"dispcnt":u16(0x04000000),"bg1cnt":u16(0x0400000a),"bg1hofs":u16(0x04000014),"bg1vofs":u16(0x04000016),"bldcnt":u16(0x04000050),"bldalpha":u16(0x04000052)},"bg":{"x":s16(bg1x),"y":s16(bg1y),"charBlock1":hashlib.sha256(bytes(oracle.read_u8(0x06004000+i) for i in range(0x4000))).hexdigest(),"screenBlocks":hashlib.sha256(bytes(oracle.read_u8(0x0600c000+i) for i in range(0x4000))).hexdigest()},"fadedPalette":[u16(faded+i*2) for i in range(512)],"unfadedPalette":[u16(unfaded+i*2) for i in range(512)],"hardwarePalette":[u16(0x05000000+i*2) for i in range(512)],"se1":audio(),"battle":{"player":snap["battlers"]["player"],"opponent":snap["battlers"]["opponent"]}})
        if len(rows)>1 and not oracle.read_u8(script_active) and not oracle.read_u8(visual_count): finished=True

    frame=0; capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons",[])); frame+=1; capture(frame)
    haze_rows = [t for row in rows for t in row["activeTasks"] if t["function"]["symbol"] in ("AnimTask_HazeScrollingFog", "AnimTask_HazeScrollingFog_Step")]
    if not finished or not haze_rows: raise RuntimeError("complete HAZE body not reached")
    payload={"schema":"haze-dense-evidence/v1","setup":setup,"sourceBounds":{"start":move_start,"endExclusive":move_end},"tasks":{"init":names["AnimTask_HazeScrollingFog"],"step":names["AnimTask_HazeScrollingFog_Step"],"blend":names["AnimTask_BlendBattleAnimPal"]},"assets":{"tiles":names["gWeatherFogHorizontalTiles"],"tilemap":names["gBattleAnimFogTilemap"],"palette":names["gFogPalette"],"blendAmounts":names["sHazeBlendAmounts"]},"songHeader":oracle.read_u32(songs+246*8),"frames":rows}
    OUTPUT.write_text(json.dumps(payload)+"\n")
    print(f"wrote {OUTPUT} ({len(rows)} source frames; {rows[0]['frame']}..{rows[-1]['frame']})")


if __name__ == "__main__": main()
