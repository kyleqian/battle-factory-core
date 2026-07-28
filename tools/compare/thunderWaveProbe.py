#!/usr/bin/env python3
"""Dense local-mGBA source/OAM/palette/audio/RGB evidence for Thunder Wave."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: thunderWaveProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_THUNDER_WAVE = 86
def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on"); setup = lab.prepare(request)
    s, m = oracle.symbols["gSprites"], oracle.symbols["gOamMatrices"]
    vc, sc = oracle.symbols["gAnimVisualTaskCount"], oracle.symbols["gAnimSoundTaskCount"]
    fa, ua = oracle.symbols["gPlttBufferFaded"], oracle.symbols["gPlttBufferUnfaded"]
    ai, at = oracle.symbols["gBattleAnimAttacker"], oracle.symbols["gBattleAnimTarget"]
    nm = subprocess.run(["arm-none-eabi-nm", str(reference / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    syms = {p[2]: int(p[0],16)|1 for line in nm.splitlines() if len(p := line.split()) == 3}
    pt = syms["sSpritePaletteTags"] & ~1
    def u16(a): return oracle.read_u8(a) | oracle.read_u8(a+1) << 8
    def s16(a):
        v=u16(a); return v-0x10000 if v>=0x8000 else v
    def s8(a):
        v=oracle.read_u8(a); return v-0x100 if v>=0x80 else v
    def player(name):
        info, tracks = oracle.symbols[f"gMPlayInfo_{name}"], oracle.symbols[f"gMPlayTrack_{name}"]
        return {"songHeader":oracle.read_u32(info),"status":oracle.read_u32(info+4),"tracks":[{"flags":oracle.read_u8(tracks+i*0x50),"panX":s8(tracks+i*0x50+0x15)} for i in range(3)]}
    RGB_DIR.mkdir(parents=True, exist_ok=True); rows=[]; frame=0
    def snap():
        nonlocal rows
        if lab.snapshot()["engine"]["currentMove"] != MOVE_THUNDER_WAVE: return
        active=[]
        for slot in range(64):
            b=s+slot*0x44
            if not oracle.read_u8(b+0x3e)&1: continue
            mn=u16(b+2)>>9&31; mb=m+mn*8
            active.append({"slot":slot,"template":oracle.read_u32(b+0x14),"callback":oracle.read_u32(b+0x1c),"attr0":u16(b),"attr1":u16(b+2),"attr2":u16(b+4),"x":s16(b+0x20),"y":s16(b+0x22),"x2":s16(b+0x24),"y2":s16(b+0x26),"subpriority":oracle.read_u8(b+0x43),"matrixNum":mn,"matrix":{"a":s16(mb),"b":s16(mb+2),"c":s16(mb+4),"d":s16(mb+6)},"data":[s16(b+0x2e+i*2) for i in range(8)]})
        rgb=oracle.screen_rgb(); (RGB_DIR/f"{frame:05d}.rgb").write_bytes(rgb)
        rows.append({"frame":frame,"sha256":hashlib.sha256(rgb).hexdigest(),"attacker":oracle.read_u8(ai),"target":oracle.read_u8(at),"visualTaskCount":oracle.read_u8(vc),"soundTaskCount":oracle.read_u8(sc),"sprites":active,"hardwareOam":[[u16(0x07000000+i*8+j) for j in (0,2,4)] for i in range(128)],"hardwareMatrices":[{"a":s16(0x07000006+i*0x20),"b":s16(0x0700000e+i*0x20),"c":s16(0x07000016+i*0x20),"d":s16(0x0700001e+i*0x20)} for i in range(32)],"fadedPalette":[u16(fa+i*2) for i in range(512)],"unfadedPalette":[u16(ua+i*2) for i in range(512)],"hardwarePalette":[u16(0x05000000+i*2) for i in range(512)],"paletteTags":[u16(pt+i*2) for i in range(16)],"registers":{"bldcnt":u16(0x04000050),"bldalpha":u16(0x04000052),"bldy":u16(0x04000054)},"se1":player("SE1"),"se2":player("SE2")})
    snap()
    for seg in request["trace"]["segments"]:
        for _ in range(seg["frames"]): oracle.advance(seg.get("buttons", [])); frame+=1; snap()
    if not rows: raise RuntimeError("stock ROM did not reach MOVE_THUNDER_WAVE")
    OUTPUT.write_text(json.dumps({"schema":"thunder-wave-dense-evidence/v1","setup":setup,"window":{"startFrame":rows[0]["frame"],"endFrame":rows[-1]["frame"],"frameCount":len(rows)},"frames":rows})+"\n")
    print(f"wrote {OUTPUT}: {rows[0]['frame']}..{rows[-1]['frame']} ({len(rows)} frames)")
main()
