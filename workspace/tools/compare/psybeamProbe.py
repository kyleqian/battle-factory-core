#!/usr/bin/env python3
"""Capture complete dense bilateral Scene-ON MOVE_PSYBEAM evidence.

Invoke only through tools/run-mgba-probe.py. The scenarios stage complete
legal parties and reach Psybeam through ordinary controller/stock-AI input.
"""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: psybeamProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 60

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on"); setup = lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    names = {n: a for a, n in pairs}; by_address = {a: n for a, n in pairs}; sy = oracle.symbols
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    active, pointer = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"]
    start, rings, end = names["Move_PSYBEAM"], names["PsybeamRings"], names["Move_HYPNOSIS"]
    palette_tags, tile_tags = names["sSpritePaletteTags"], names["sSpriteTileRangeTags"]
    software = names["gMain"] + 0x38; wait = names["sAnimFramesToWait"]
    RGB.mkdir(parents=True, exist_ok=True)
    u8 = lambda a: oracle.read_u8(a)
    u16 = lambda a: u8(a) | u8(a + 1) << 8
    u32 = lambda a: u16(a) | u16(a + 2) << 16
    def s16(a):
        v = u16(a); return v - 0x10000 if v >= 0x8000 else v
    def s8(a):
        v = u8(a); return v - 0x100 if v >= 0x80 else v
    def raw(a, n): return bytes(u8(a + i) for i in range(n)).hex()
    def ident(a): return {"address": a, "symbol": by_address.get(a & ~1)}
    def sprite(slot):
        base = sprites + slot * 0x44; mn = (u16(base + 2) >> 9) & 31; matrix = matrices + mn * 8
        return {"slot":slot,"raw":raw(base,0x44),"template":ident(u32(base+0x14)),"callback":ident(u32(base+0x1c)),"attr":[u16(base+i) for i in (0,2,4)],"x":s16(base+0x20),"y":s16(base+0x22),"x2":s16(base+0x24),"y2":s16(base+0x26),"animNum":u8(base+0x2a),"animCmdIndex":u8(base+0x2b),"animDelayCounter":u8(base+0x2c),"subpriority":u8(base+0x43),"invisible":(u8(base+0x3e)>>2)&1,"matrixNum":mn,"matrix":[s16(matrix+i) for i in (0,2,4,6)],"data":[s16(base+0x2e+i*2) for i in range(8)]}
    def mplay(name):
        info, track = sy[f"gMPlayInfo_{name}"], sy[f"gMPlayTrack_{name}"]; header = u32(info)
        return {"songHeader":header,"songHeaderIdentity":ident(header),"status":u32(info+4),"tracks":[{"flags":u8(track+i*0x50),"pan":s8(track+i*0x50+0x14),"panX":s8(track+i*0x50+0x15),"raw":raw(track+i*0x50,0x50)} for i in range(4)]}
    regs = {"dispcnt":0x04000000,"bg0cnt":0x04000008,"bg1cnt":0x0400000A,"bg2cnt":0x0400000C,"bg3cnt":0x0400000E,"bg0hofs":0x04000010,"bg0vofs":0x04000012,"bg1hofs":0x04000014,"bg1vofs":0x04000016,"bg2hofs":0x04000018,"bg2vofs":0x0400001A,"bg3hofs":0x0400001C,"bg3vofs":0x0400001E,"win0h":0x04000040,"win0v":0x04000044,"winin":0x04000048,"winout":0x0400004A,"mosaic":0x0400004C,"bldcnt":0x04000050,"bldalpha":0x04000052,"bldy":0x04000054}
    def row(frame, snap):
        rgb = oracle.screen_rgb(); (RGB / f"{frame:05d}.rgb").write_bytes(rgb); script = u32(pointer)
        live_tasks = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if u8(base + 4): live_tasks.append({"slot":slot,"raw":raw(base,0x28),"func":ident(u32(base)),"data":[s16(base+8+i*2) for i in range(16)]})
        attacker = u8(names["gBattleAnimAttacker"]); target = u8(names["gBattleAnimTarget"]); ids = [u8(names["gBattlerSpriteIds"]+i) for i in range(4)]
        owner = "PsybeamRings" if rings <= script < end else "Move_PSYBEAM" if start <= script < rings else None
        return {"frame":frame,"sha256":hashlib.sha256(rgb).hexdigest(),"animScriptActive":bool(u8(active)),"scriptPtr":script,"scriptOwner":owner,"scriptOffset":script-start if start <= script < end else None,"scriptWait":s8(wait),"animArgs":[s16(names["gBattleAnimArgs"]+i*2) for i in range(8)],"visualTaskCount":u8(sy["gAnimVisualTaskCount"]),"soundTaskCount":u8(sy["gAnimSoundTaskCount"]),"tasks":live_tasks,"sprites":[sprite(i) for i in range(64) if u8(sprites+i*0x44+0x3e)&1],"spriteOrder":[u8(names["sSpriteOrder"]+i) for i in range(64)],"animationBattlers":{"attacker":attacker,"target":target,"spriteIds":ids},"battlerSprites":{"attacker":sprite(ids[attacker]),"target":sprite(ids[target])},"battlers":snap["battlers"],"parties":snap["parties"],"engine":snap["engine"],"immutableState":{k:snap[k] for k in ("rngValue","battleOutcome","weather","weatherTurns","sideStatuses","sideConditions")},"animationRng":u32(names["gRng2Value"]),"softwareOam":[raw(software+i*8,8) for i in range(128)],"hardwareOam":[raw(0x07000000+i*8,8) for i in range(128)],"softwareMatrices":[[s16(matrices+i*8+j) for j in (0,2,4,6)] for i in range(32)],"hardwareMatrices":[[s16(0x07000006+i*0x20+j) for j in (0,8,16,24)] for i in range(32)],"fadedPalette":[u16(sy["gPlttBufferFaded"]+i*2) for i in range(512)],"unfadedPalette":[u16(sy["gPlttBufferUnfaded"]+i*2) for i in range(512)],"hardwarePalette":[u16(0x05000000+i*2) for i in range(512)],"paletteTags":[u16(palette_tags+i*2) for i in range(16)],"tileTags":[u16(tile_tags+i*2) for i in range(128)],"registers":{n:u16(a) for n,a in regs.items()},"audio":{"SE1":mplay("SE1"),"SE2":mplay("SE2")}}
    rows, started, frame, seen = [], False, 0, []
    def take():
        nonlocal started
        snap = lab.snapshot(); script = u32(pointer); in_source = start <= script < end and bool(u8(active))
        signature = [frame, bool(u8(active)), script, snap["engine"]["currentMove"]]
        if bool(u8(active)) and (not seen or seen[-1][2:] != signature[2:]): seen.append(signature)
        # The semantic snapshot's currentMove follows the player command while
        # the stock AI owns the opponent orientation; the authoritative script
        # pointer uniquely identifies Psybeam in both directions.
        if not started and in_source: started = True
        if started: rows.append(row(frame, snap))
    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; take()
            if started and rows[-1]["animScriptActive"] is False: break
        if started and rows[-1]["animScriptActive"] is False: break
    # The capture-free opponent staging receipt ends after move selection but
    # before the player's preceding Tackle text is acknowledged. Continue with
    # ordinary sparse A input until the stock engine dispatches the AI move;
    # once Psybeam starts, use presentation-only idle frames to cleanup.
    for tail_age in range(1200):
        if started and rows[-1]["animScriptActive"] is False: break
        oracle.advance(["A"] if not started and tail_age % 30 < 2 else [])
        frame += 1; take()
    if not rows:
        OUTPUT.write_text(json.dumps({"diagnostic": seen}, separators=(",", ":")) + "\n")
        print(f"wrote diagnostic {OUTPUT}: {len(seen)} pointer transitions")
        return
    if rows[0]["scriptOffset"] != 0 or rows[-1]["animScriptActive"] is not False:
        raise RuntimeError(f"complete Psybeam pointer window was not observed: rows={len(rows)}, first={rows[0] if rows else None}, lastFrame={rows[-1]['frame'] if rows else None}, lastPtr={rows[-1]['scriptPtr'] if rows else None}")
    topology = {"tasks":sorted({t["func"]["symbol"] for r in rows for t in r["tasks"] if t["func"]["symbol"]}),"templates":sorted({s["template"]["symbol"] for r in rows for s in r["sprites"] if s["template"]["symbol"]}),"callbacks":sorted({s["callback"]["symbol"] for r in rows for s in r["sprites"] if s["callback"]["symbol"]})}
    result = {"schema":"psybeam-dense-evidence/v1","profile":"battle-scene-on","setup":setup,"sourceWindow":{"startFrame":rows[0]["frame"],"endFrame":rows[-1]["frame"],"frameCount":len(rows)},"sourceSymbols":{n:names[n] for n in ("Move_PSYBEAM","PsybeamRings","Move_HYPNOSIS","gGoldRingSpriteTemplate","TranslateAnimSpriteToTargetMonLocation","AnimTask_SetPsychicBackground","SetPsychicBackground_Step","AnimTask_SwayMon","AnimTask_SwayMonStep","AnimTask_BlendColorCycle","AnimTask_BlendColorCycleLoop","SoundTask_LoopSEAdjustPanning","SoundTask_LoopSEAdjustPanning_Step")},"topology":topology,"frames":rows}
    OUTPUT.write_text(json.dumps(result,separators=(",",":"))+"\n")
    print(f"wrote {OUTPUT}: source {rows[0]['frame']}..{rows[-1]['frame']} ({len(rows)} frames)")

if __name__ == "__main__": main()
