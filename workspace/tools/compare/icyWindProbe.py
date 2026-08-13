#!/usr/bin/env python3
"""Capture a pointer-bounded, dense Scene-ON MOVE_ICY_WIND window.

Always invoke through tools/run-mgba-probe.py. The probe keeps the complete
source-owned RAM surface and raw RGB frames; it never supplies battle state.
"""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: icyWindProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 196

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
    start, end = names["Move_ICY_WIND"], names["Move_SMOKESCREEN"]
    spike_start, spike_end = names["IceSpikesEffectLong"], names["GrantingStarsEffect"]
    tags, tile_tags, software = names["sSpritePaletteTags"], names["sSpriteTileRangeTags"], names["gMain"] + 0x38
    RGB.mkdir(parents=True, exist_ok=True)
    u8 = lambda a: oracle.read_u8(a)
    u16 = lambda a: u8(a) | u8(a + 1) << 8
    u32 = lambda a: u16(a) | u16(a + 2) << 16
    def s16(a):
        v = u16(a); return v - 0x10000 if v >= 0x8000 else v
    def s8(a):
        v = u8(a); return v - 0x100 if v >= 0x80 else v
    def raw(a, n): return bytes(u8(a + i) for i in range(n)).hex()
    def digest(a, n): return hashlib.sha256(bytes(u8(a + i) for i in range(n))).hexdigest()
    def ident(a): return {"address": a, "symbol": by_address.get(a & ~1)}
    def sprite(slot):
        base = sprites + slot * 0x44; mn = (u16(base + 2) >> 9) & 31; matrix = matrices + mn * 8
        return {"slot": slot, "raw": raw(base, 0x44), "template": ident(u32(base + 0x14)), "callback": ident(u32(base + 0x1c)), "attr": [u16(base + i) for i in (0, 2, 4)], "x": s16(base + 0x20), "y": s16(base + 0x22), "x2": s16(base + 0x24), "y2": s16(base + 0x26), "subpriority": u8(base + 0x2b), "invisible": (u8(base + 0x3e) >> 2) & 1, "matrixNum": mn, "matrix": [s16(matrix + i) for i in (0, 2, 4, 6)], "data": [s16(base + 0x2e + i * 2) for i in range(8)]}
    def mplay(name):
        info, track = sy[f"gMPlayInfo_{name}"], sy[f"gMPlayTrack_{name}"]
        header = u32(info)
        return {"songHeader": header, "songHeaderIdentity": ident(header), "status": u32(info + 4), "tracks": [{"flags": u8(track + i * 0x50), "pan": s8(track + i * 0x50 + 0x14), "panX": s8(track + i * 0x50 + 0x15), "raw": raw(track + i * 0x50, 0x50)} for i in range(3)]}
    regs = {"dispcnt":0x04000000,"bg0cnt":0x04000008,"bg1cnt":0x0400000A,"bg2cnt":0x0400000C,"bg3cnt":0x0400000E,"bg0hofs":0x04000010,"bg0vofs":0x04000012,"bg1hofs":0x04000014,"bg1vofs":0x04000016,"bg2hofs":0x04000018,"bg2vofs":0x0400001A,"bg3hofs":0x0400001C,"bg3vofs":0x0400001E,"bldcnt":0x04000050,"bldalpha":0x04000052,"bldy":0x04000054}
    def row(frame, snap):
        rgb = oracle.screen_rgb(); (RGB / f"{frame:05d}.rgb").write_bytes(rgb); script = u32(pointer)
        live_tasks = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if u8(base + 4): live_tasks.append({"slot": slot, "raw": raw(base, 0x28), "func": ident(u32(base)), "data": [s16(base + 8 + i * 2) for i in range(16)]})
        attacker = u8(names["gBattleAnimAttacker"]); target = u8(names["gBattleAnimTarget"])
        battler_sprite_ids = [u8(names["gBattlerSpriteIds"] + i) for i in range(4)]
        bg1cnt = u16(0x0400000A); char_base = ((bg1cnt >> 2) & 3) * 0x4000; screen_base = ((bg1cnt >> 8) & 31) * 0x800
        owned_script = ({"block": "Move_ICY_WIND", "offset": script - start} if start <= script < end else ({"block": "IceSpikesEffectLong", "offset": script - spike_start} if spike_start <= script < spike_end else None))
        return {"frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(), "gAnimScriptActive": bool(u8(active)), "script": ident(script), "scriptOffset": script - start if start <= script < end else None, "ownedScript": owned_script, "visualTaskCount": u8(sy["gAnimVisualTaskCount"]), "soundTaskCount": u8(sy["gAnimSoundTaskCount"]), "tasks": live_tasks, "sprites": [sprite(i) for i in range(64) if u8(sprites + i * 0x44 + 0x3e) & 1], "animationBattlers": {"attacker": attacker, "target": target, "spriteIds": battler_sprite_ids}, "battlerSprites": {"attacker": sprite(battler_sprite_ids[attacker]), "target": sprite(battler_sprite_ids[target])}, "spriteOrder": [u8(names["sSpriteOrder"] + i) for i in range(64)], "battleBg3": {"x": s16(names["gBattle_BG3_X"]), "y": s16(names["gBattle_BG3_Y"])}, "battlers": snap["battlers"], "parties": snap["parties"], "engine": snap["engine"], "immutableState": {k: snap[k] for k in ("rngValue", "battleOutcome", "weather", "weatherTurns", "sideStatuses", "sideConditions")}, "animationRng": u32(names["gRng2Value"]), "softwareOam": [raw(software + i * 8, 8) for i in range(128)], "hardwareOam": [raw(0x07000000 + i * 8, 8) for i in range(128)], "softwareMatrices": [[s16(matrices + i * 8 + j) for j in (0,2,4,6)] for i in range(32)], "hardwareMatrices": [[s16(0x07000006 + i * 0x20 + j) for j in (0,8,16,24)] for i in range(32)], "fadedPalette": [u16(sy["gPlttBufferFaded"] + i * 2) for i in range(512)], "unfadedPalette": [u16(sy["gPlttBufferUnfaded"] + i * 2) for i in range(512)], "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)], "paletteTags": [u16(tags + i * 2) for i in range(16)], "tileTags": [u16(tile_tags + i * 2) for i in range(128)], "registers": {n: u16(a) for n,a in regs.items()}, "bg1Vram": {"charBase": char_base, "screenBase": screen_base, "charBlockSha256": digest(0x06000000 + char_base, 0x4000), "screenBlockSha256": digest(0x06000000 + screen_base, 0x800), "allBgSha256": digest(0x06000000, 0x10000)}, "se1": mplay("SE1"), "se2": mplay("SE2")}
    rows, started, frame = [], False, 0
    def take():
        nonlocal started
        snap = lab.snapshot(); in_source = start <= u32(pointer) < end and bool(u8(active))
        if not started and snap["engine"]["currentMove"] == MOVE and in_source: started = True
        if started: rows.append(row(frame, snap))
    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; take()
            if started and rows[-1]["gAnimScriptActive"] is False: break
        if started and rows[-1]["gAnimScriptActive"] is False: break
    if not rows or rows[0]["scriptOffset"] is None: raise RuntimeError("Icy Wind source pointer not observed")
    topology = {"tasks": sorted({t["func"]["symbol"] for r in rows for t in r["tasks"] if t["func"]["symbol"]}), "templates": sorted({s["template"]["symbol"] for r in rows for s in r["sprites"] if s["template"]["symbol"]}), "callbacks": sorted({s["callback"]["symbol"] for r in rows for s in r["sprites"] if s["callback"]["symbol"]})}
    result = {"schema":"icy-wind-dense-evidence/v1","setup":setup,"sourceWindow":{"startFrame":rows[0]["frame"],"endFrame":rows[-1]["frame"],"frameCount":len(rows)},"sourceSymbols":{"Move_ICY_WIND":start,"Move_SMOKESCREEN":end,"IceSpikesEffectLong":spike_start,"GrantingStarsEffect":spike_end,"gSwirlingSnowballSpriteTemplate":names["gSwirlingSnowballSpriteTemplate"],"gIceGroundSpikeSpriteTemplate":names["gIceGroundSpikeSpriteTemplate"],"AnimWaveFromCenterOfTarget":names["AnimWaveFromCenterOfTarget"],"AnimTask_BlendBattleAnimPal":names["AnimTask_BlendBattleAnimPal"],"se_m_icy_wind":names["se_m_icy_wind"]},"topology":topology,"frames":rows}
    OUTPUT.write_text(json.dumps(result, separators=(",",":")) + "\n")
    print(f"wrote {OUTPUT}: source {rows[0]['frame']}..{rows[-1]['frame']} ({len(rows)} frames)")

if __name__ == "__main__": main()
