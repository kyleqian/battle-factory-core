#!/usr/bin/env python3
"""Complete Scene-ON MOVE_BUBBLE_BEAM source/hardware/audio receipts."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4: raise SystemExit("usage: bubbleBeamProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 61
def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on"); setup = lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    names, by = {name: address for address, name in pairs}, {address: name for address, name in pairs}
    sy = oracle.symbols; sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    active, ptr, wait = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"], names["sAnimFramesToWait"]
    start, end, tags, software = names["Move_BUBBLE_BEAM"], names["Move_ICY_WIND"], names["sSpritePaletteTags"], names["gMain"] + 0x38
    RGB.mkdir(parents=True, exist_ok=True)
    def u16(a): return oracle.read_u8(a) | oracle.read_u8(a + 1) << 8
    def u32(a): return u16(a) | u16(a + 2) << 16
    def s16(a):
        v = u16(a); return v - 0x10000 if v >= 0x8000 else v
    def s8(a):
        v = oracle.read_u8(a); return v - 0x100 if v >= 0x80 else v
    def raw(a, size): return "".join(f"{oracle.read_u8(a + i):02x}" for i in range(size))
    def ident(a): return {"address": a, "symbol": by.get(a & ~1)}
    def sprite(slot):
        base = sprites + slot * 0x44; matrix = matrices + ((u16(base + 2) >> 9) & 31) * 8
        return {"slot":slot,"raw":raw(base,0x44),"template":ident(u32(base+0x14)),"callback":ident(u32(base+0x1c)),"attr":[u16(base+i) for i in (0,2,4)],"matrixNum":(u16(base+2)>>9)&31,"matrix":[s16(matrix+i) for i in (0,2,4,6)],"data":[s16(base+0x2e+i*2) for i in range(8)]}
    def player(name):
        info, track = sy[f"gMPlayInfo_{name}"], sy[f"gMPlayTrack_{name}"]
        return {"rawInfo":raw(info,0x40),"songHeader":u32(info),"status":u32(info+4),"tracks":[{"flags":oracle.read_u8(track+i*0x50),"panX":s8(track+i*0x50+0x15),"raw":raw(track+i*0x50,0x50)} for i in range(3)]}
    regs = {"dispcnt":0x04000000,"bg0cnt":0x04000008,"bg1cnt":0x0400000A,"bg2cnt":0x0400000C,"bg3cnt":0x0400000E,"bg0hofs":0x04000010,"bg0vofs":0x04000012,"bg1hofs":0x04000014,"bg1vofs":0x04000016,"bg2hofs":0x04000018,"bg2vofs":0x0400001A,"bg3hofs":0x0400001C,"bg3vofs":0x0400001E,"winin":0x04000048,"winout":0x0400004A,"mosaic":0x0400004C,"bldcnt":0x04000050,"bldalpha":0x04000052,"bldy":0x04000054}
    rows=[]; frame=0
    def take():
        nonlocal frame
        if lab.snapshot()["engine"]["currentMove"] != MOVE: return
        rgb=oracle.screen_rgb(); (RGB/f"{frame:05d}.rgb").write_bytes(rgb)
        script=u32(ptr); live=[sprite(i) for i in range(64) if oracle.read_u8(sprites+i*0x44+0x3e)&1]
        live_tasks=[]
        for i in range(16):
            base=tasks+i*0x28
            if oracle.read_u8(base+4): live_tasks.append({"slot":i,"raw":raw(base,0x28),"func":ident(u32(base)),"data":[s16(base+8+j*2) for j in range(16)]})
        rows.append({"frame":frame,"sha256":hashlib.sha256(rgb).hexdigest(),"gAnimScriptActive":oracle.read_u8(active),"script":ident(script),"scriptOffset":script-start if start<=script<end else None,"scriptWait":s8(wait),"visualTaskCount":oracle.read_u8(sy["gAnimVisualTaskCount"]),"soundTaskCount":oracle.read_u8(sy["gAnimSoundTaskCount"]),"tasks":live_tasks,"sprites":live,"battlers":lab.snapshot()["battlers"],"softwareOam":[raw(software+i*8,8) for i in range(128)],"hardwareOam":[raw(0x07000000+i*8,8) for i in range(128)],"hardwareMatrices":[[s16(0x07000006+i*0x20+j) for j in (0,8,16,24)] for i in range(32)],"fadedPalette":[u16(sy["gPlttBufferFaded"]+i*2) for i in range(512)],"unfadedPalette":[u16(sy["gPlttBufferUnfaded"]+i*2) for i in range(512)],"hardwarePalette":[u16(0x05000000+i*2) for i in range(512)],"paletteTags":[u16(tags+i*2) for i in range(16)],"registers":{n:u16(a) for n,a in regs.items()},"se1":player("SE1"),"se2":player("SE2")})
    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]): oracle.advance(segment.get("buttons",[])); frame+=1; take()
    first=next((i for i,row in enumerate(rows) if row["gAnimScriptActive"] and row["scriptOffset"] is not None),None)
    if first is None: raise RuntimeError("Bubble Beam source pointer not observed")
    last=next((i for i in range(first+1,len(rows)) if not rows[i]["gAnimScriptActive"]),None)
    if last is None: raise RuntimeError("Bubble Beam inactive cleanup not observed")
    source=rows[first:last+1]
    topology={k:sorted({x[k[:-1]]["symbol"] for row in source for x in ([] if k=="tasks" else [])}) for k in []}
    topology={"tasks":sorted({x["func"]["symbol"] for row in source for x in row["tasks"] if x["func"]["symbol"]}),"templates":sorted({x["template"]["symbol"] for row in source for x in row["sprites"] if x["template"]["symbol"]}),"callbacks":sorted({x["callback"]["symbol"] for row in source for x in row["sprites"] if x["callback"]["symbol"]})}
    def starts(template):
        count=0; previous=set()
        for row in source:
            current={x["slot"] for x in row["sprites"] if x["template"]["symbol"]==template}; count+=len(current-previous); previous=current
        return count
    if starts("gWaterBubbleProjectileSpriteTemplate") != 18 or starts("gWaterBubbleSpriteTemplate") != 6: raise RuntimeError("Bubble Beam lifecycle count changed")
    if "AnimWaterBubbleProjectile_Step1" not in topology["callbacks"] or "AnimTask_SwayMonStep" not in topology["tasks"]: raise RuntimeError(f"Bubble Beam topology missing: {topology}")
    if source[-1]["gAnimScriptActive"] or source[-1]["visualTaskCount"]: raise RuntimeError("Bubble Beam first cleanup retained animation")
    OUTPUT.write_text(json.dumps({"schema":"bubble-beam-dense-evidence/v1","setup":setup,"sourceWindow":{"startFrame":source[0]["frame"],"endFrame":source[-1]["frame"],"frameCount":len(source)},"sourceSymbols":{"Move_BUBBLE_BEAM":start,"Move_ICY_WIND":end},"templates":{"gWaterBubbleProjectileSpriteTemplate":names["gWaterBubbleProjectileSpriteTemplate"],"gWaterBubbleSpriteTemplate":names["gWaterBubbleSpriteTemplate"]},"taskSymbols":{"AnimTask_SwayMon":names["AnimTask_SwayMon"]},"callbackSymbols":{"AnimWaterBubbleProjectile":names["AnimWaterBubbleProjectile"]},"songHeaders":{"SE_M_BUBBLE":names["se_m_bubble"],"SE_M_BUBBLE3":names["se_m_bubble3"]},"topology":topology,"lifecycleCounts":{"bubbleProjectile":18,"waterBubble":6},"frames":source},separators=(",",":"))+"\n")
    print(f"wrote {OUTPUT}: source {source[0]['frame']}..{source[-1]['frame']} ({len(source)} frames)")
main()
