#!/usr/bin/env python3
"""Dense Scene-ON evidence for Move_FAKE_OUT through first inactive cleanup."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: fakeOutProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_FAKE_OUT = 252

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on"); setup = lab.prepare(request)
    sy = oracle.symbols
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    faded, unfaded = sy["gPlttBufferFaded"], sy["gPlttBufferUnfaded"]
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    symbol_rows = [(int(parts[0], 16), parts[2]) for line in nm.splitlines() if len(parts := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in parts[0])]
    symbols = {name: address for address, name in symbol_rows}; names = {address: name for address, name in symbol_rows}
    move_start, move_end = symbols["Move_FAKE_OUT"], symbols["Move_SCARY_FACE"]
    script_active, script_ptr, frames_to_wait = symbols["gAnimScriptActive"], symbols["sBattleAnimScriptPtr"], symbols["sAnimFramesToWait"]
    palette_tags, song_table = symbols["sSpritePaletteTags"], symbols["gSongTable"]
    def u16(address): return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8
    def s16(address):
        value = u16(address); return value - 0x10000 if value >= 0x8000 else value
    def s8(address):
        value = oracle.read_u8(address); return value - 0x100 if value >= 0x80 else value
    def raw(address, size): return "".join(f"{oracle.read_u8(address + i):02x}" for i in range(size))
    def identity(address): return {"address": address, "symbol": names.get(address & ~1)}
    def sprite(slot):
        base = sprites + slot * 0x44; matrix_num = u16(base + 2) >> 9 & 31; matrix = matrices + matrix_num * 8
        return {"slot":slot,"raw":raw(base,0x44),"template":identity(oracle.read_u32(base+0x14)),"callback":identity(oracle.read_u32(base+0x1c)),"attr0":u16(base),"attr1":u16(base+2),"attr2":u16(base+4),"x":s16(base+0x20),"y":s16(base+0x22),"x2":s16(base+0x24),"y2":s16(base+0x26),"subpriority":oracle.read_u8(base+0x43),"matrixNum":matrix_num,"matrix":{"a":s16(matrix),"b":s16(matrix+2),"c":s16(matrix+4),"d":s16(matrix+6)},"data":[s16(base+0x2e+i*2) for i in range(8)]}
    def audio(name):
        info, tracks = sy[f"gMPlayInfo_{name}"], sy[f"gMPlayTrack_{name}"]
        return {"songHeader":oracle.read_u32(info),"status":oracle.read_u32(info+4),"rawInfo":raw(info,0x40),"tracks":[{"flags":oracle.read_u8(tracks+i*0x50),"panX":s8(tracks+i*0x50+0x15),"raw":raw(tracks+i*0x50,0x50)} for i in range(3)]}
    RGB_DIR.mkdir(parents=True, exist_ok=True); rows=[]; frame=0
    def snap():
        pointer = oracle.read_u32(script_ptr)
        if lab.snapshot()["engine"]["currentMove"] != MOVE_FAKE_OUT and not move_start <= pointer < move_end: return
        active_sprites=[sprite(slot) for slot in range(64) if oracle.read_u8(sprites+slot*0x44+0x3e)&1]
        active_tasks=[]
        for slot in range(16):
            base=tasks+slot*0x28
            if oracle.read_u8(base+4): active_tasks.append({"slot":slot,"raw":raw(base,0x28),"func":identity(oracle.read_u32(base)),"isActive":oracle.read_u8(base+4),"prev":oracle.read_u8(base+5),"next":oracle.read_u8(base+6),"priority":oracle.read_u8(base+7),"data":[s16(base+8+i*2) for i in range(16)]})
        rgb=oracle.screen_rgb(); (RGB_DIR/f"{frame:05d}.rgb").write_bytes(rgb)
        battler_ids=sy["gBattlerSpriteIds"]
        rows.append({"frame":frame,"sha256":hashlib.sha256(rgb).hexdigest(),"currentMove":MOVE_FAKE_OUT,"gAnimScriptActive":oracle.read_u8(script_active),"script":identity(pointer),"scriptOffset":pointer-move_start if move_start<=pointer<move_end else None,"gAnimFramesToWait":s8(frames_to_wait),"attacker":oracle.read_u8(sy["gBattleAnimAttacker"]),"target":oracle.read_u8(sy["gBattleAnimTarget"]),"visualTaskCount":oracle.read_u8(sy["gAnimVisualTaskCount"]),"soundTaskCount":oracle.read_u8(sy["gAnimSoundTaskCount"]),"tasks":active_tasks,"sprites":active_sprites,"playerSprite":sprite(oracle.read_u8(battler_ids)),"opponentSprite":sprite(oracle.read_u8(battler_ids+1)),"hardwareOam":[raw(0x07000000+i*8,8) for i in range(128)],"hardwareMatrices":[{"a":s16(0x07000006+i*0x20),"b":s16(0x0700000e+i*0x20),"c":s16(0x07000016+i*0x20),"d":s16(0x0700001e+i*0x20)} for i in range(32)],"fadedPalette":[u16(faded+i*2) for i in range(512)],"unfadedPalette":[u16(unfaded+i*2) for i in range(512)],"hardwarePalette":[u16(0x05000000+i*2) for i in range(512)],"paletteTags":[u16(palette_tags+i*2) for i in range(16)],"registers":{name:u16(address) for name,address in {"dispcnt":0x04000000,"win0h":0x04000040,"win1h":0x04000042,"win0v":0x04000044,"win1v":0x04000046,"winin":0x04000048,"winout":0x0400004a,"bldcnt":0x04000050,"bldalpha":0x04000052,"bldy":0x04000054}.items()},"softwareWindow":{"win0h":u16(sy["gBattle_WIN0H"]),"win0v":u16(sy["gBattle_WIN0V"])},"se1":audio("SE1"),"se2":audio("SE2")})
    snap()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]): oracle.advance(segment.get("buttons",[])); frame+=1; snap()
    if not rows: raise RuntimeError("stock ROM did not reach MOVE_FAKE_OUT")
    start=next((i for i,row in enumerate(rows) if row["gAnimScriptActive"] and row["scriptOffset"]==0),None)
    if start is None: raise RuntimeError("active Move_FAKE_OUT pointer was not observable")
    cleanup=next((i for i,row in enumerate(rows[start+1:],start+1) if not row["gAnimScriptActive"]),None)
    if cleanup is None: raise RuntimeError("first inactive cleanup was not captured")
    source=rows[start:cleanup+1]
    if any(row["frame"] != source[0]["frame"]+i for i,row in enumerate(source)): raise RuntimeError("source window is not dense")
    tracked=("AnimTask_FakeOut","AnimTask_FakeOut_Step1","AnimTask_FakeOut_Step2","AnimTask_ShakeMon2","AnimTask_ShakeMon2_Step","AnimTask_StretchTargetUp")
    observed={task["func"]["symbol"] for row in source for task in row["tasks"]}
    if not {"AnimTask_FakeOut_Step1","AnimTask_FakeOut_Step2","AnimTask_ShakeMon2_Step","AnimTask_StretchTargetUp"} <= observed: raise RuntimeError(f"missing task topology: {observed}")
    window={"startFrame":source[0]["frame"],"endFrame":source[-1]["frame"],"frameCount":len(source)}
    OUTPUT.write_text(json.dumps({"schema":"fake-out-dense-evidence/v1","setup":setup,"sourceBounds":{"start":move_start,"endExclusive":move_end},"sourceWindow":window,"sourceSymbols":{"Move_FAKE_OUT":move_start,"Move_SCARY_FACE":move_end,**{name:symbols[name]|1 for name in tracked}},"songHeaders":{"SE_M_FLATTER":oracle.read_u32(song_table+229*8),"SE_M_SKETCH":oracle.read_u32(song_table+205*8)},"frames":rows},separators=(",",":"))+"\n")
    print(f"wrote {OUTPUT}: source {window}")

main()
