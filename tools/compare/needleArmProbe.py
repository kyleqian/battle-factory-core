#!/usr/bin/env python3
"""Complete legal Scene-ON Needle Arm source/hardware/audio/RGB receipt."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4: raise SystemExit("usage: needleArmProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, "battle-scene-on"); setup = lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    names = {n:a for a,n in pairs}; by_address = {a:n for a,n in pairs}; sy = oracle.symbols
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    active, ptr, wait = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"], names["sAnimFramesToWait"]
    start, end = names["Move_NEEDLE_ARM"], names["Move_SLACK_OFF"]
    tags, tile_tags, software = names["sSpritePaletteTags"], names["sSpriteTileRangeTags"], names["gMain"] + 0x38
    battler_ids = sy["gBattlerSpriteIds"]; RGB.mkdir(parents=True, exist_ok=True)
    def u16(a): return oracle.read_u8(a) | oracle.read_u8(a+1) << 8
    def u32(a): return u16(a) | u16(a+2) << 16
    def s16(a):
        v=u16(a); return v-0x10000 if v >= 0x8000 else v
    def s8(a):
        v=oracle.read_u8(a); return v-0x100 if v >= 0x80 else v
    def raw(a,n): return "".join(f"{oracle.read_u8(a+i):02x}" for i in range(n))
    def ident(a): return {"address":a,"symbol":by_address.get(a & ~1)}
    def sprite(slot):
        b=sprites+slot*0x44; m=(u16(b+2)>>9)&31; ma=matrices+m*8
        return {"slot":slot,"raw":raw(b,0x44),"template":ident(u32(b+0x14)),"callback":ident(u32(b+0x1c)),
                "x":s16(b+0x20),"y":s16(b+0x22),"x2":s16(b+0x24),"y2":s16(b+0x26),
                "attr":[u16(b+i) for i in (0,2,4)],"matrixNum":m,
                "matrix":[s16(ma+i) for i in (0,2,4,6)],"data":[s16(b+0x2e+i*2) for i in range(8)]}
    def player(name):
        info,track=sy[f"gMPlayInfo_{name}"],sy[f"gMPlayTrack_{name}"]
        return {"rawInfo":raw(info,0x40),"songHeader":u32(info),"status":u32(info+4),
                "tracks":[{"flags":oracle.read_u8(track+i*0x50),"panX":s8(track+i*0x50+0x15),"raw":raw(track+i*0x50,0x50)} for i in range(3)]}
    regs={"dispcnt":0x04000000,"bg0cnt":0x04000008,"bg1cnt":0x0400000A,"bg2cnt":0x0400000C,"bg3cnt":0x0400000E,"bldcnt":0x04000050,"bldalpha":0x04000052,"bldy":0x04000054}
    rows=[]; frame=0; started=False; done=False
    def take():
        nonlocal started,done
        if done:return
        script=u32(ptr)
        if not started:
            if lab.snapshot()["engine"]["currentMove"] != 302 or not oracle.read_u8(active) or not(start<=script<end):return
            started=True
        elif not oracle.read_u8(active):done=True
        rgb=oracle.screen_rgb(); (RGB/f"{frame:05d}.rgb").write_bytes(rgb)
        live=[sprite(i) for i in range(64) if oracle.read_u8(sprites+i*0x44+0x3e)&1]
        live_tasks=[{"slot":i,"raw":raw(b,0x28),"func":ident(u32(b)),"data":[s16(b+8+j*2) for j in range(16)]} for i in range(16) if oracle.read_u8((b:=tasks+i*0x28)+4)]
        rows.append({"frame":frame,"sha256":hashlib.sha256(rgb).hexdigest(),"gAnimScriptActive":oracle.read_u8(active),
          "script":ident(script),"scriptOffset":script-start if start<=script<end else None,"scriptWait":s8(wait),
          "visualTaskCount":oracle.read_u8(sy["gAnimVisualTaskCount"]),"soundTaskCount":oracle.read_u8(sy["gAnimSoundTaskCount"]),
          "tasks":live_tasks,"sprites":live,"battlers":lab.snapshot()["battlers"],
          "playerSprite":sprite(oracle.read_u8(battler_ids)),"opponentSprite":sprite(oracle.read_u8(battler_ids+1)),
          "softwareOam":[raw(software+i*8,8) for i in range(128)],"hardwareOam":[raw(0x07000000+i*8,8) for i in range(128)],
          "hardwareMatrices":[[s16(0x07000006+i*0x20+j) for j in (0,8,16,24)] for i in range(32)],
          "fadedPalette":[u16(sy["gPlttBufferFaded"]+i*2) for i in range(512)],
          "unfadedPalette":[u16(sy["gPlttBufferUnfaded"]+i*2) for i in range(512)],
          "hardwarePalette":[u16(0x05000000+i*2) for i in range(512)],
          "paletteTags":[u16(tags+i*2) for i in range(16)],"tileTags":[u16(tile_tags+i*2) for i in range(128)],
          "registers":{n:u16(a) for n,a in regs.items()},"se1":player("SE1"),"se2":player("SE2")})
    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]): oracle.advance(segment.get("buttons",[]));frame+=1;take()
    if not rows or rows[-1]["gAnimScriptActive"]: raise RuntimeError("complete Needle Arm source window not observed")
    topology={"tasks":sorted({x["func"]["symbol"] for r in rows for x in r["tasks"] if x["func"]["symbol"]}),
              "templates":sorted({x["template"]["symbol"] for r in rows for x in r["sprites"] if x["template"]["symbol"]}),
              "callbacks":sorted({x["callback"]["symbol"] for r in rows for x in r["sprites"] if x["callback"]["symbol"]})}
    prior=set();starts=0
    for row in rows:
        current={x["slot"] for x in row["sprites"] if x["template"]["symbol"]=="gNeedleArmSpikeSpriteTemplate"}
        starts+=len(current-prior);prior=current
    if starts != 20: raise RuntimeError(f"Needle Arm lifecycle changed: {starts}")
    result={"schema":"needle-arm-dense-evidence/v1","setup":setup,
      "sourceWindow":{"startFrame":rows[0]["frame"],"endFrame":rows[-1]["frame"],"frameCount":len(rows)},
      "sourceSymbols":{"Move_NEEDLE_ARM":start,"Move_SLACK_OFF":end},
      "lifecycleCounts":{"gNeedleArmSpikeSpriteTemplate":starts},"topology":topology,"frames":rows}
    OUTPUT.write_text(json.dumps(result,separators=(",",":"))+"\n")
    print(f"wrote {OUTPUT}: source {rows[0]['frame']}..{rows[-1]['frame']} ({len(rows)} frames), spikes {starts}")
if __name__=="__main__":main()
