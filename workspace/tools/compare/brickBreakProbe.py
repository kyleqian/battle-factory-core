#!/usr/bin/env python3
"""Dense, source-addressed Scene-ON receipts for both Brick Break bodies."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: brickBreakProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 280

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    names, by = {n: a for a, n in pairs}, {a: n for a, n in pairs}
    sy, S, T, M = oracle.symbols, oracle.symbols["gSprites"], oracle.symbols["gTasks"], oracle.symbols["gOamMatrices"]
    active, ptr = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"]
    start, end = names["Move_BRICK_BREAK"], names["Move_YAWN"]
    tags, tiles = names["sSpritePaletteTags"], names["sSpriteTileRangeTags"]
    RGB.mkdir(parents=True, exist_ok=True)
    def u16(a): return oracle.read_u8(a) | oracle.read_u8(a + 1) << 8
    def u32(a): return u16(a) | u16(a + 2) << 16
    def s16(a):
        v = u16(a); return v - 65536 if v >= 32768 else v
    def s8(a):
        v = oracle.read_u8(a); return v - 256 if v >= 128 else v
    def raw(a, n): return bytes(oracle.read_u8(a + i) for i in range(n)).hex()
    def ident(a): return {"address": a, "symbol": by.get(a & ~1)}
    def sprite(slot):
        b = S + slot * 0x44; m = (u16(b + 2) >> 9 & 31)
        return {"slot":slot,"template":ident(u32(b+0x14)),"callback":ident(u32(b+0x1c)),"attr":[u16(b),u16(b+2),u16(b+4)],"x":s16(b+0x20),"y":s16(b+0x22),"x2":s16(b+0x24),"y2":s16(b+0x26),"data":[s16(b+0x2e+i*2) for i in range(8)],"matrix":[s16(M+m*8+i) for i in (0,2,4,6)]}
    def tasks():
        return [{"slot":i,"func":ident(u32(T+i*0x28)),"data":[s16(T+i*0x28+8+j*2) for j in range(16)]} for i in range(16) if oracle.read_u8(T+i*0x28+4)]
    def se1():
        info, track = sy["gMPlayInfo_SE1"], sy["gMPlayTrack_SE1"]
        return {"songHeader":u32(info),"tracks":[{"flags":oracle.read_u8(track+i*0x50),"panX":s8(track+i*0x50+0x15)} for i in range(3)]}
    rows, frame = [], 0
    def capture():
        if lab.snapshot()["engine"]["currentMove"] != MOVE: return
        rgb = oracle.screen_rgb(); (RGB / f"{frame:05d}.rgb").write_bytes(rgb)
        script = u32(ptr); snap = lab.snapshot()
        rows.append({"frame":frame,"sha256":hashlib.sha256(rgb).hexdigest(),"active":oracle.read_u8(active),"script":ident(script),"scriptOffset":script-start if start <= script < end else None,"visualTaskCount":oracle.read_u8(sy["gAnimVisualTaskCount"]),"sprites":[sprite(i) for i in range(64) if oracle.read_u8(S+i*0x44+0x3e)&1],"tasks":tasks(),"paletteTags":[u16(tags+i*2) for i in range(16)],"tileTags":[u16(tiles+i*2) for i in range(128)],"softwareOam":[raw(names["gMain"]+0x38+i*8,8) for i in range(128)],"hardwareOam":[raw(0x07000000+i*8,8) for i in range(128)],"hardwareMatrices":[[s16(0x07000006+i*0x20+j) for j in (0,8,16,24)] for i in range(32)],"fadedPalette":[u16(sy["gPlttBufferFaded"]+i*2) for i in range(512)],"unfadedPalette":[u16(sy["gPlttBufferUnfaded"]+i*2) for i in range(512)],"hardwarePalette":[u16(0x05000000+i*2) for i in range(512)],"registers":{"bldcnt":u16(0x04000050),"bldalpha":u16(0x04000052),"bldy":u16(0x04000054)},"se1":se1(),"battlers":snap["battlers"]})
    capture()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]): oracle.advance(segment.get("buttons", [])); frame += 1; capture()
    first = next((i for i, r in enumerate(rows) if r["active"] and r["scriptOffset"] is not None), None)
    last = next((i for i in range(first + 1 if first is not None else 0, len(rows)) if not rows[i]["active"]), None)
    if first is None or last is None: raise RuntimeError("Brick Break source/cleanup not captured")
    source = rows[first:last+1]
    def starts(template):
        old, count = set(), 0
        for row in source:
            now = {x["slot"] for x in row["sprites"] if x["template"]["symbol"] == template}; count += len(now-old); old = now
        return count
    counts = {"wall":starts("gBrickBreakWallSpriteTemplate"),"shard":starts("gBrickBreakWallShardSpriteTemplate")}
    if counts not in ({"wall":1,"shard":4}, {"wall":0,"shard":0}):
        raise RuntimeError(f"unexpected Brick Break wall lifecycles: {counts}")
    OUTPUT.write_text(json.dumps({"schema":"brick-break-dense-evidence/v1","setup":setup,"sourceWindow":{"startFrame":source[0]["frame"],"endFrame":source[-1]["frame"],"frameCount":len(source)},"sourceSymbols":{"Move_BRICK_BREAK":start,"Move_YAWN":end},"lifecycleCounts":counts,"templates":{n:names[n] for n in ("gBrickBreakWallSpriteTemplate","gBrickBreakWallShardSpriteTemplate","gHorizontalLungeSpriteTemplate","gBasicHitSplatSpriteTemplate","gFistFootSpriteTemplate")},"taskSymbols":{n:names[n] for n in ("AnimTask_WindUpLunge","AnimTask_WindUpLunge_Step1","AnimTask_WindUpLunge_Step2")},"songHeaders":{"SE_M_VITAL_THROW":names["se_m_vital_throw"],"SE_M_VITAL_THROW2":names["se_m_vital_throw2"],"SE_M_BRICK_BREAK":names["se_m_brick_break"]},"frames":source},separators=(",",":")) + "\n")
    print(f"wrote {OUTPUT}: {source[0]['frame']}..{source[-1]['frame']} ({len(source)} frames)")
if __name__ == "__main__": main()
