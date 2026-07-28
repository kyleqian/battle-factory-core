#!/usr/bin/env python3
"""Dense source-owned Scene-ON receipts for legal MOVE_SMOKESCREEN."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4: raise SystemExit("usage: smokescreenProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request # noqa: E402
from emerald_core import EmeraldOracle # noqa: E402
MOVE = 108

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on"); setup = lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    names, by_addr = {n:a for a,n in pairs}, {a:n for a,n in pairs}; sy = oracle.symbols
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    faded, unfaded = sy["gPlttBufferFaded"], sy["gPlttBufferUnfaded"]
    battler_ids, palette_tags = sy["gBattlerSpriteIds"], names["sSpritePaletteTags"]
    active, ptr, start, end = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"], names["Move_SMOKESCREEN"], names["Move_BUBBLE"]
    def u16(a): return oracle.read_u8(a) | oracle.read_u8(a + 1) << 8
    def u32(a): return u16(a) | u16(a + 2) << 16
    def s16(a):
        v = u16(a); return v - 0x10000 if v >= 0x8000 else v
    def s8(a):
        v = oracle.read_u8(a); return v - 0x100 if v >= 0x80 else v
    def raw(a, n): return ''.join(f'{oracle.read_u8(a+i):02x}' for i in range(n))
    def ident(a): return {"address":a,"symbol":by_addr.get(a & ~1)}
    def sprite(slot):
        b=sprites+slot*0x44; matrix_num=(u16(b+2)>>9)&31; m=matrices+matrix_num*8
        return {"slot":slot,"raw":raw(b,0x44),"template":ident(u32(b+0x14)),"callback":ident(u32(b+0x1c)),"x":s16(b+0x20),"y":s16(b+0x22),"x2":s16(b+0x24),"y2":s16(b+0x26),"attr":[u16(b+i) for i in (0,2,4)],"matrixNum":matrix_num,"matrix":[s16(m+i) for i in (0,2,4,6)],"data":[s16(b+0x2e+i*2) for i in range(8)]}
    def live_sprites(): return [sprite(i) for i in range(64) if oracle.read_u8(sprites+i*0x44+0x3e)&1]
    def live_tasks():
        return [{"slot":i,"raw":raw(b,0x28),"func":ident(u32(b)),"data":[s16(b+8+j*2) for j in range(16)]} for i in range(16) if oracle.read_u8((b:=tasks+i*0x28)+4)]
    def player(n):
        info, track=sy[f"gMPlayInfo_{n}"], sy[f"gMPlayTrack_{n}"]
        return {"rawInfo":raw(info,0x40),"songHeader":u32(info),"status":u32(info+4),"tracks":[{"flags":oracle.read_u8(track+i*0x50),"panX":s8(track+i*0x50+0x15),"raw":raw(track+i*0x50,0x50)} for i in range(3)]}
    RGB_DIR.mkdir(parents=True, exist_ok=True); rows=[]; frame=0
    def capture():
        if lab.snapshot()["engine"]["currentMove"] != MOVE: return
        rgb=oracle.screen_rgb(); (RGB_DIR/f"{frame:05d}.rgb").write_bytes(rgb); p=u32(ptr)
        rows.append({"frame":frame,"sha256":hashlib.sha256(rgb).hexdigest(),"gAnimScriptActive":oracle.read_u8(active),"script":ident(p),"scriptOffset":p-start if start<=p<end else None,"visualTaskCount":oracle.read_u8(sy["gAnimVisualTaskCount"]),"soundTaskCount":oracle.read_u8(sy["gAnimSoundTaskCount"]),"tasks":live_tasks(),"sprites":live_sprites(),"playerSprite":sprite(oracle.read_u8(battler_ids)),"opponentSprite":sprite(oracle.read_u8(battler_ids+1)),"hardwareOam":[raw(0x07000000+i*8,8) for i in range(128)],"hardwareMatrices":[[s16(0x07000006+i*0x20+j) for j in (0,8,16,24)] for i in range(32)],"fadedPalette":[u16(faded+i*2) for i in range(512)],"unfadedPalette":[u16(unfaded+i*2) for i in range(512)],"hardwarePalette":[u16(0x05000000+i*2) for i in range(512)],"paletteTags":[u16(palette_tags+i*2) for i in range(16)],"registers":{n:u16(a) for n,a in {"dispcnt":0x04000000,"bldcnt":0x04000050,"bldalpha":0x04000052,"bldy":0x04000054,"winin":0x04000048,"winout":0x0400004A}.items()},"se1":player("SE1"),"se2":player("SE2")})
    capture()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]): oracle.advance(segment.get("buttons",[])); frame+=1; capture()
    first=next((i for i,r in enumerate(rows) if r["gAnimScriptActive"] and r["scriptOffset"] is not None),None)
    if first is None: raise RuntimeError("Smokescreen source pointer was not observable")
    last=next((i for i in range(first+1,len(rows)) if not rows[i]["gAnimScriptActive"]),None)
    if last is None: raise RuntimeError("Smokescreen first inactive cleanup was not captured")
    source=rows[first:last+1]; topology={"tasks":sorted({x["func"]["symbol"] for r in source for x in r["tasks"] if x["func"]["symbol"]}),"templates":sorted({x["template"]["symbol"] for r in source for x in r["sprites"] if x["template"]["symbol"]}),"callbacks":sorted({x["callback"]["symbol"] for r in source for x in r["sprites"] if x["callback"]["symbol"]})}
    required={"gBlackBallSpriteTemplate","gBlackSmokeSpriteTemplate"}
    if not required <= set(topology["templates"]): raise RuntimeError(f"missing Smokescreen templates: {topology}")
    OUTPUT.write_text(json.dumps({"schema":"smokescreen-dense-evidence/v1","setup":setup,"captureWindow":{"startFrame":rows[0]["frame"],"endFrame":rows[-1]["frame"],"frameCount":len(rows)},"sourceWindow":{"startFrame":source[0]["frame"],"endFrame":source[-1]["frame"],"frameCount":len(source)},"sourceSymbols":{"Move_SMOKESCREEN":start,"Move_BUBBLE":end},"templates":{n:names[n] for n in ("gBlackBallSpriteTemplate","gBlackSmokeSpriteTemplate")},"songHeaders":{"SE_M_DOUBLE_TEAM":names["se_m_double_team"],"SE_M_SAND_ATTACK":names["se_m_sand_attack"]},"topology":topology,"frames":source},separators=(',',':'))+'\n')
    print(f"wrote {OUTPUT}: source {source[0]['frame']}..{source[-1]['frame']} ({len(source)} frames)")
main()
