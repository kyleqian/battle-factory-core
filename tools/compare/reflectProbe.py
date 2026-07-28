#!/usr/bin/env python3
"""Dense Scene-ON software/hardware evidence for a legal MOVE_REFLECT body."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path
if len(sys.argv) != 4: raise SystemExit("usage: reflectProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request
from emerald_core import EmeraldOracle
def main() -> None:
  req = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
  ref = ROOT / "reference" / "pokeemerald"; o = EmeraldOracle(ref/"pokeemerald.gba", ref/"pokeemerald.map", HARNESS/"oracle"/"bootstrap"/"factory.json")
  lab = BattleLab(o, "battle-scene-on"); setup = lab.prepare(req); S,T,M = o.symbols["gSprites"],o.symbols["gTasks"],o.symbols["gOamMatrices"]
  B,V,A,F,U = o.symbols["gBattlerSpriteIds"],o.symbols["gAnimVisualTaskCount"],o.symbols["gAnimSoundTaskCount"],o.symbols["gPlttBufferFaded"],o.symbols["gPlttBufferUnfaded"]
  nm=subprocess.run(["arm-none-eabi-nm",str(ref/"pokeemerald.elf")],check=True,capture_output=True,text=True).stdout; names={p[2]:int(p[0],16)|1 for x in nm.splitlines() if len(p:=x.split())==3}
  wall, sparkle = o.symbols["gReflectWallSpriteTemplate"], o.symbols["gReflectSparkleSpriteTemplate"]
  tags=names["sSpritePaletteTags"]&~1
  def u16(a): return o.read_u8(a)|(o.read_u8(a+1)<<8)
  def s16(a): v=u16(a); return v-65536 if v>=32768 else v
  def spr(i):
    b=S+i*0x44; m=((u16(b+2)>>9)&31)*8
    return {"slot":i,"template":o.read_u32(b+0x14),"x":s16(b+0x20),"y":s16(b+0x22),"x2":s16(b+0x24),"y2":s16(b+0x26),"attr":[u16(b),u16(b+2),u16(b+4)],"subpriority":o.read_u8(b+0x43),"data":[s16(b+0x2e+j*2) for j in range(8)],"matrix":[s16(M+m+j) for j in (0,2,4,6)]}
  RGB_DIR.mkdir(parents=True,exist_ok=True); rows=[]
  def cap(frame):
    if lab.snapshot()["engine"]["currentMove"] != 115: return
    active=[spr(i) for i in range(64) if o.read_u8(S+i*0x44+0x3e)&1]; rgb=o.screen_rgb(); (RGB_DIR/f"{frame:05d}.rgb").write_bytes(rgb)
    rows.append({"frame":frame,"sha256":hashlib.sha256(rgb).hexdigest(),"effectSprites":[x for x in active if x["template"] in (wall,sparkle)],"activeSpriteSlots":[x["slot"] for x in active],"activeTaskSlots":[i for i in range(16) if o.read_u8(T+i*0x28+4)],"visualTaskCount":o.read_u8(V),"soundTaskCount":o.read_u8(A),"battlers":[spr(o.read_u8(B+i)) for i in range(2)],"oam":[[u16(0x07000000+i*8+j) for j in (0,2,4)] for i in range(128)],"matrices":[[s16(0x07000006+i*0x20+j) for j in (0,8,16,24)] for i in range(32)],"registers":{"dispcnt":u16(0x04000000),"bldcnt":u16(0x04000050),"bldalpha":u16(0x04000052)},"fadedPalette":[u16(F+i*2) for i in range(512)],"unfadedPalette":[u16(U+i*2) for i in range(512)],"hardwarePalette":[u16(0x05000000+i*2) for i in range(512)],"paletteTags":[u16(tags+i*2) for i in range(16)]})
  frame=0; cap(frame)
  for seg in req["trace"]["segments"]:
    for _ in range(seg["frames"]): o.advance(seg.get("buttons",[])); frame+=1; cap(frame)
  if not rows or not any(x["effectSprites"] for x in rows): raise RuntimeError("MOVE_REFLECT body not reached")
  OUTPUT.write_text(json.dumps({"schema":"reflect-dense-evidence/v1","setup":setup,"templates":{"wall":wall,"sparkle":sparkle},"frames":rows})+"\n")
  print(f"wrote {OUTPUT} ({len(rows)} move frames; {rows[0]['frame']}..{rows[-1]['frame']})")
if __name__ == "__main__": main()
