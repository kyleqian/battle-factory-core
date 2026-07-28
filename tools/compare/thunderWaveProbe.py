#!/usr/bin/env python3
"""Dense local-mGBA source/task/OAM/palette/audio/RGB evidence for a move."""
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
    s, m, tasks = oracle.symbols["gSprites"], oracle.symbols["gOamMatrices"], oracle.symbols["gTasks"]
    vc, sc = oracle.symbols["gAnimVisualTaskCount"], oracle.symbols["gAnimSoundTaskCount"]
    fa, ua = oracle.symbols["gPlttBufferFaded"], oracle.symbols["gPlttBufferUnfaded"]
    ai, at = oracle.symbols["gBattleAnimAttacker"], oracle.symbols["gBattleAnimTarget"]
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    symbols = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    syms = {name: address for address, name in symbols}
    names = {address: name for address, name in symbols}
    pt = syms["sSpritePaletteTags"]
    script_active = syms["gAnimScriptActive"]
    script_ptr = syms["sBattleAnimScriptPtr"]
    frames_to_wait = syms["sAnimFramesToWait"]
    move_script = syms["Move_THUNDER_WAVE"]
    move_script_end = syms["Move_BEAT_UP"]
    move_script_cleanup = move_script_end - 1
    song_table = syms["gSongTable"]
    def u16(a): return oracle.read_u8(a) | oracle.read_u8(a+1) << 8
    def s16(a):
        v=u16(a); return v-0x10000 if v>=0x8000 else v
    def s8(a):
        v=oracle.read_u8(a); return v-0x100 if v>=0x80 else v
    def raw(a, size):
        return "".join(f"{oracle.read_u8(a+i):02x}" for i in range(size))
    def identity(address):
        return {"address": address, "symbol": names.get(address & ~1)}
    def player(name):
        info, tracks = oracle.symbols[f"gMPlayInfo_{name}"], oracle.symbols[f"gMPlayTrack_{name}"]
        return {
            "songHeader": oracle.read_u32(info),
            "status": oracle.read_u32(info+4),
            "rawInfo": raw(info, 0x40),
            "tracks": [
                {
                    "flags": oracle.read_u8(tracks+i*0x50),
                    "panX": s8(tracks+i*0x50+0x15),
                    "raw": raw(tracks+i*0x50, 0x50),
                }
                for i in range(3)
            ],
        }
    RGB_DIR.mkdir(parents=True, exist_ok=True); rows=[]; frame=0
    def snap():
        nonlocal rows
        if lab.snapshot()["engine"]["currentMove"] != MOVE_THUNDER_WAVE: return
        active=[]
        for slot in range(64):
            b=s+slot*0x44
            if not oracle.read_u8(b+0x3e)&1: continue
            mn=u16(b+2)>>9&31; mb=m+mn*8
            active.append({"slot":slot,"raw":raw(b,0x44),"template":identity(oracle.read_u32(b+0x14)),"callback":identity(oracle.read_u32(b+0x1c)),"attr0":u16(b),"attr1":u16(b+2),"attr2":u16(b+4),"x":s16(b+0x20),"y":s16(b+0x22),"x2":s16(b+0x24),"y2":s16(b+0x26),"subpriority":oracle.read_u8(b+0x43),"matrixNum":mn,"matrix":{"a":s16(mb),"b":s16(mb+2),"c":s16(mb+4),"d":s16(mb+6)},"data":[s16(b+0x2e+i*2) for i in range(8)]})
        active_tasks=[]
        for slot in range(16):
            b=tasks+slot*0x28
            if not oracle.read_u8(b+4): continue
            active_tasks.append({
                "slot": slot,
                "raw": raw(b, 0x28),
                "func": identity(oracle.read_u32(b)),
                "isActive": oracle.read_u8(b+4),
                "prev": oracle.read_u8(b+5),
                "next": oracle.read_u8(b+6),
                "priority": oracle.read_u8(b+7),
                "data": [s16(b+8+i*2) for i in range(16)],
            })
        rgb=oracle.screen_rgb(); (RGB_DIR/f"{frame:05d}.rgb").write_bytes(rgb)
        ptr=oracle.read_u32(script_ptr)
        rows.append({"frame":frame,"sha256":hashlib.sha256(rgb).hexdigest(),"currentMove":lab.snapshot()["engine"]["currentMove"],"gAnimScriptActive":oracle.read_u8(script_active),"gBattleAnimScriptPtr":identity(ptr),"battleAnimScriptOffset":ptr-move_script if move_script <= ptr < move_script_end else None,"gAnimFramesToWait":s8(frames_to_wait),"attacker":oracle.read_u8(ai),"target":oracle.read_u8(at),"visualTaskCount":oracle.read_u8(vc),"soundTaskCount":oracle.read_u8(sc),"tasks":active_tasks,"sprites":active,"hardwareOam":[raw(0x07000000+i*8,8) for i in range(128)],"hardwareMatrices":[{"a":s16(0x07000006+i*0x20),"b":s16(0x0700000e+i*0x20),"c":s16(0x07000016+i*0x20),"d":s16(0x0700001e+i*0x20)} for i in range(32)],"fadedPalette":[u16(fa+i*2) for i in range(512)],"unfadedPalette":[u16(ua+i*2) for i in range(512)],"hardwarePalette":[u16(0x05000000+i*2) for i in range(512)],"paletteTags":[u16(pt+i*2) for i in range(16)],"registers":{"dispcnt":u16(0x04000000),"bg0cnt":u16(0x04000008),"bg1cnt":u16(0x0400000a),"bg2cnt":u16(0x0400000c),"bg3cnt":u16(0x0400000e),"winin":u16(0x04000048),"winout":u16(0x0400004a),"mosaic":u16(0x0400004c),"bldcnt":u16(0x04000050),"bldalpha":u16(0x04000052),"bldy":u16(0x04000054)},"se1":player("SE1"),"se2":player("SE2")})
    snap()
    for seg in request["trace"]["segments"]:
        for _ in range(seg["frames"]): oracle.advance(seg.get("buttons", [])); frame+=1; snap()
    if not rows: raise RuntimeError("stock ROM did not reach MOVE_THUNDER_WAVE")
    source_start=next((i for i,row in enumerate(rows) if row["gAnimScriptActive"] and row["battleAnimScriptOffset"] == 0),None)
    if source_start is None:
        raise RuntimeError("stock ROM did not expose active Move_THUNDER_WAVE script state")
    cleanup=next((i for i,row in enumerate(rows[source_start+1:],source_start+1) if not row["gAnimScriptActive"] and row["battleAnimScriptOffset"] == move_script_cleanup-move_script),None)
    if cleanup is None:
        raise RuntimeError("stock ROM did not expose Move_THUNDER_WAVE script cleanup")
    active_rows=rows[source_start:cleanup]
    if not active_rows or not all(row["gAnimScriptActive"] and row["battleAnimScriptOffset"] is not None for row in active_rows):
        raise RuntimeError("Move_THUNDER_WAVE source-script interval is not contiguous")
    active_window={"startFrame":active_rows[0]["frame"],"endFrame":active_rows[-1]["frame"],"frameCount":len(active_rows)}
    source_window={"startFrame":active_rows[0]["frame"],"endFrame":rows[cleanup]["frame"],"frameCount":cleanup-source_start+1}
    capture_window={"startFrame":rows[0]["frame"],"endFrame":rows[-1]["frame"],"frameCount":len(rows)}
    OUTPUT.write_text(json.dumps({
        "schema":"thunder-wave-dense-evidence/v3",
        "setup":setup,
        "captureWindow":capture_window,
        "activeSourceScriptWindow":active_window,
        "sourceAnimationWindow":source_window,
        "songHeaders":{
            "SE_M_THUNDER_WAVE":oracle.read_u32(song_table+138*8),
            "SE_M_THUNDERBOLT2":oracle.read_u32(song_table+119*8),
        },
        "frames":rows,
    },separators=(",",":"))+"\n")
    print(f"wrote {OUTPUT}: capture {capture_window}, active script {active_window}, source animation incl. cleanup {source_window}")
main()
