#!/usr/bin/env python3
"""Complete Scene-ON MOVE_BULK_UP source/hardware/audio/RGB receipt.

Move_BULK_UP is exactly Move_SWAGGER's prefix: ANIM_TAG_BREATH,
AnimTask_GrowAndShrink, playsewithpan SE_M_SWAGGER, wait, gBreathPuff
createsprite, loopsewithpan SE_M_SWAGGER 4,2, wait, end. No monbg, no anger
marks. Ages below are relative to GrowAndShrink's first displayed frame.
"""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path
if len(sys.argv) != 4: raise SystemExit("usage: bulkUpProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request # noqa: E402
from emerald_core import EmeraldOracle # noqa: E402
MOVE = 339

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on"); setup = lab.prepare(request)
    output = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0],16),p[2]) for line in output.splitlines() if len(p:=line.split())==3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    names={n:a for a,n in pairs}; by_address={a:n for a,n in pairs}; sy=oracle.symbols
    sprites,matrices,tasks=sy["gSprites"],sy["gOamMatrices"],sy["gTasks"]
    active,ptr,wait=names["gAnimScriptActive"],names["sBattleAnimScriptPtr"],names["sAnimFramesToWait"]
    start,end,tags,software=names["Move_BULK_UP"],names["Move_COVET"],names["sSpritePaletteTags"],names["gMain"]+0x38
    RGB.mkdir(parents=True,exist_ok=True)
    def u16(a): return oracle.read_u8(a)|oracle.read_u8(a+1)<<8
    def u32(a): return u16(a)|u16(a+2)<<16
    def s16(a):
        v=u16(a); return v-0x10000 if v>=0x8000 else v
    def s8(a):
        v=oracle.read_u8(a); return v-0x100 if v>=0x80 else v
    def raw(a,n): return "".join(f"{oracle.read_u8(a+i):02x}" for i in range(n))
    def ident(a): return {"address":a,"symbol":by_address.get(a&~1)}
    def sprite(slot):
        base=sprites+slot*0x44; mn=(u16(base+2)>>9)&31; matrix=matrices+mn*8
        return {"slot":slot,"raw":raw(base,0x44),"template":ident(u32(base+0x14)),"callback":ident(u32(base+0x1c)),"attr":[u16(base+i) for i in (0,2,4)],"x":s16(base+0x20),"y":s16(base+0x22),"x2":s16(base+0x24),"y2":s16(base+0x26),"matrixNum":mn,"matrix":[s16(matrix+i) for i in (0,2,4,6)],"data":[s16(base+0x2e+i*2) for i in range(8)]}
    def player(name):
        info,track=sy[f"gMPlayInfo_{name}"],sy[f"gMPlayTrack_{name}"]
        return {"rawInfo":raw(info,0x40),"songHeader":u32(info),"status":u32(info+4),"tracks":[{"flags":oracle.read_u8(track+i*0x50),"pan":s8(track+i*0x50+0x14),"panX":s8(track+i*0x50+0x15),"raw":raw(track+i*0x50,0x50)} for i in range(3)]}
    regs={"dispcnt":0x04000000,"bg0cnt":0x04000008,"bg1cnt":0x0400000A,"bg2cnt":0x0400000C,"bg3cnt":0x0400000E,"bg0hofs":0x04000010,"bg0vofs":0x04000012,"bg1hofs":0x04000014,"bg1vofs":0x04000016,"bg2hofs":0x04000018,"bg2vofs":0x0400001A,"bg3hofs":0x0400001C,"bg3vofs":0x0400001E,"bldcnt":0x04000050,"bldalpha":0x04000052,"bldy":0x04000054}
    rows=[]; seen=set(); frame=0
    def take():
        nonlocal frame
        snap=lab.snapshot(); current=snap["engine"]["currentMove"]; seen.add(current)
        if current != MOVE: return
        rgb=oracle.screen_rgb(); (RGB/f"{frame:05d}.rgb").write_bytes(rgb); script=u32(ptr)
        live=[sprite(i) for i in range(64) if oracle.read_u8(sprites+i*0x44+0x3e)&1]
        live_tasks=[{"slot":slot,"raw":raw(base,0x28),"func":ident(u32(base)),"data":[s16(base+8+i*2) for i in range(16)]} for slot in range(16) if oracle.read_u8((base:=tasks+slot*0x28)+4)]
        rows.append({"frame":frame,"sha256":hashlib.sha256(rgb).hexdigest(),"gAnimScriptActive":oracle.read_u8(active),"script":ident(script),"scriptOffset":script-start if start<=script<end else None,"scriptWait":s8(wait),"visualTaskCount":oracle.read_u8(sy["gAnimVisualTaskCount"]),"soundTaskCount":oracle.read_u8(sy["gAnimSoundTaskCount"]),"tasks":live_tasks,"sprites":live,"battlers":snap["battlers"],"softwareOam":[raw(software+i*8,8) for i in range(128)],"hardwareOam":[raw(0x07000000+i*8,8) for i in range(128)],"hardwareMatrices":[[s16(0x07000006+i*0x20+j) for j in (0,8,16,24)] for i in range(32)],"fadedPalette":[u16(sy["gPlttBufferFaded"]+i*2) for i in range(512)],"unfadedPalette":[u16(sy["gPlttBufferUnfaded"]+i*2) for i in range(512)],"hardwarePalette":[u16(0x05000000+i*2) for i in range(512)],"paletteTags":[u16(tags+i*2) for i in range(16)],"registers":{n:u16(a) for n,a in regs.items()},"se1":player("SE1"),"se2":player("SE2")})
    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]): oracle.advance(segment.get("buttons",[])); frame+=1; take()
    if not rows: raise RuntimeError(f"Bulk Up move {MOVE} not observed; saw {sorted(seen)}")
    def grown(r):
        for t in r["tasks"]:
            if t["func"]["symbol"]=="AnimTask_GrowAndShrink_Step":
                sid=t["data"][15]
                for s in r["sprites"]:
                    if s["slot"]==sid and (s["matrix"][0]!=256 or s["matrix"][3]!=256):
                        return True
        return False
    first=next((i for i,r in enumerate(rows) if grown(r)),None)
    if first is None: raise RuntimeError("Bulk Up grow display not observed")
    last=next((i for i in range(first+1,len(rows)) if not rows[i]["gAnimScriptActive"]),None)
    if last is None: raise RuntimeError("Bulk Up inactive cleanup not observed")
    source=rows[first:last+1]
    topology={"tasks":sorted({x["func"]["symbol"] for r in source for x in r["tasks"] if x["func"]["symbol"]}),"templates":sorted({x["template"]["symbol"] for r in source for x in r["sprites"] if x["template"]["symbol"]}),"callbacks":sorted({x["callback"]["symbol"] for r in source for x in r["sprites"] if x["callback"]["symbol"]})}
    required_tasks={"AnimTask_GrowAndShrink_Step"}
    required_templates={"gBreathPuffSpriteTemplate"}
    if not required_tasks<=set(topology["tasks"]): raise RuntimeError(f"Bulk Up task topology changed: {topology}")
    if not required_templates<=set(topology["templates"]): raise RuntimeError(f"Bulk Up sprite topology changed: {topology}")
    if source[-1]["gAnimScriptActive"] or source[-1]["visualTaskCount"]: raise RuntimeError("Bulk Up window missing first inactive cleanup")
    result={"schema":"bulk-up-dense-evidence/v1","setup":setup,"sourceWindow":{"startFrame":source[0]["frame"],"endFrame":source[-1]["frame"],"frameCount":len(source)},"sourceSymbols":{"Move_BULK_UP":start,"Move_COVET":end},"topology":topology,"frames":source}
    OUTPUT.write_text(json.dumps(result,separators=(",",":"))+"\n"); print(f"wrote {OUTPUT}: source {source[0]['frame']}..{source[-1]['frame']} ({len(source)} frames)")
if __name__ == "__main__": main()
