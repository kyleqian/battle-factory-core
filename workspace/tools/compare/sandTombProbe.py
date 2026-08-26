#!/usr/bin/env python3
"""Capture complete dense bilateral Scene-ON MOVE_SAND_TOMB evidence.

This is an evidence-only probe. It observes the ordinary legal mechanicLab
route and retains the source-pointer window through the first inactive row;
it does not inject animation, damage, palette, or gameplay state.
"""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: sandTombProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 328

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
    start, subroutine, end = names["Move_SAND_TOMB"], names["SandTombSwirlingDirt"], names["Move_SHEER_COLD"]
    palette_tags, tile_tags = names["sSpritePaletteTags"], names["sSpriteTileRangeTags"]
    tile_ranges, tile_bitmap = names["sSpriteTileRanges"], names["sSpriteTileAllocBitmap"]
    software, wait = names["gMain"] + 0x38, names["sAnimFramesToWait"]
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
        return {"slot": slot, "raw": raw(base, 0x44), "template": ident(u32(base + 0x14)), "callback": ident(u32(base + 0x1c)), "attr": [u16(base + i) for i in (0, 2, 4)], "x": s16(base + 0x20), "y": s16(base + 0x22), "x2": s16(base + 0x24), "y2": s16(base + 0x26), "animNum": u8(base + 0x2a), "animCmdIndex": u8(base + 0x2b), "animDelayCounter": u8(base + 0x2c), "affineAnimCmdIndex": u8(base + 0x2d), "subpriority": u8(base + 0x43), "invisible": (u8(base + 0x3e) >> 2) & 1, "matrixNum": mn, "matrix": [s16(matrix + i) for i in (0, 2, 4, 6)], "data": [s16(base + 0x2e + i * 2) for i in range(8)]}
    def mplay(name):
        info, track = sy[f"gMPlayInfo_{name}"], sy[f"gMPlayTrack_{name}"]; header = u32(info)
        return {"songHeader": header, "songHeaderIdentity": ident(header), "status": u32(info + 4), "tracks": [{"flags": u8(track + i * 0x50), "pan": s8(track + i * 0x50 + 0x14), "panX": s8(track + i * 0x50 + 0x15), "raw": raw(track + i * 0x50, 0x50)} for i in range(4)]}
    regs = {"dispcnt": 0x04000000, "bg0cnt": 0x04000008, "bg1cnt": 0x0400000A, "bg2cnt": 0x0400000C, "bg3cnt": 0x0400000E, "bg0hofs": 0x04000010, "bg0vofs": 0x04000012, "bg1hofs": 0x04000014, "bg1vofs": 0x04000016, "bg2hofs": 0x04000018, "bg2vofs": 0x0400001A, "bg3hofs": 0x0400001C, "bg3vofs": 0x0400001E, "win0h": 0x04000040, "win1h": 0x04000042, "win0v": 0x04000044, "win1v": 0x04000046, "winin": 0x04000048, "winout": 0x0400004A, "mosaic": 0x0400004C, "bldcnt": 0x04000050, "bldalpha": 0x04000052, "bldy": 0x04000054}
    battle_bg_names = ("gBattle_BG0_X", "gBattle_BG0_Y", "gBattle_BG1_X", "gBattle_BG1_Y", "gBattle_BG2_X", "gBattle_BG2_Y", "gBattle_BG3_X", "gBattle_BG3_Y", "gBattle_WIN0H", "gBattle_WIN0V", "gBattle_WIN1H", "gBattle_WIN1V")
    def row(frame, snap):
        rgb = oracle.screen_rgb(); (RGB / f"{frame:05d}.rgb").write_bytes(rgb); script = u32(pointer)
        live_tasks = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if u8(base + 4): live_tasks.append({"slot": slot, "raw": raw(base, 0x28), "func": ident(u32(base)), "priority": u8(base + 5), "data": [s16(base + 8 + i * 2) for i in range(16)]})
        attacker, target = u8(names["gBattleAnimAttacker"]), u8(names["gBattleAnimTarget"])
        ids = [u8(names["gBattlerSpriteIds"] + i) for i in range(4)]
        healthboxes = [u8(names["gHealthboxSpriteIds"] + i) for i in range(4)]
        owner = "Move_SAND_TOMB" if start <= script < subroutine else "SandTombSwirlingDirt" if subroutine <= script < end else None
        return {"frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(), "animScriptActive": bool(u8(active)), "scriptPtr": script, "scriptIdentity": ident(script), "scriptOwner": owner, "scriptOffset": script - start if start <= script < end else None, "scriptPtrParity": script & 1, "scriptWait": s8(wait), "animArgs": [s16(names["gBattleAnimArgs"] + i * 2) for i in range(8)], "visualTaskCount": u8(sy["gAnimVisualTaskCount"]), "soundTaskCount": u8(sy["gAnimSoundTaskCount"]), "tasks": live_tasks, "sprites": [sprite(i) for i in range(64) if u8(sprites + i * 0x44 + 0x3e) & 1], "spriteOrder": [u8(names["sSpriteOrder"] + i) for i in range(64)], "animationBattlers": {"attacker": attacker, "target": target, "spriteIds": ids}, "battlerSprites": {"attacker": sprite(ids[attacker]), "target": sprite(ids[target])}, "chrome": {"healthboxSpriteIds": healthboxes, "healthboxSprites": [sprite(slot) for slot in healthboxes]}, "battlers": snap["battlers"], "parties": snap["parties"], "engine": snap["engine"], "semanticState": {k: snap[k] for k in ("battleOutcome", "weather", "weatherTurns", "sideStatuses", "sideConditions")}, "immutableState": {k: snap[k] for k in ("rngValue", "battleOutcome", "weather", "weatherTurns", "sideStatuses", "sideConditions")}, "gameplayRng": snap["rngValue"], "animationRng": u32(names["gRng2Value"]), "softwareOam": [raw(software + i * 8, 8) for i in range(128)], "hardwareOam": [raw(0x07000000 + i * 8, 8) for i in range(128)], "softwareMatrices": [[s16(matrices + i * 8 + j) for j in (0, 2, 4, 6)] for i in range(32)], "hardwareMatrices": [[s16(0x07000006 + i * 0x20 + j) for j in (0, 8, 16, 24)] for i in range(32)], "fadedPalette": [u16(sy["gPlttBufferFaded"] + i * 2) for i in range(512)], "unfadedPalette": [u16(sy["gPlttBufferUnfaded"] + i * 2) for i in range(512)], "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)], "allocators": {"paletteTags": [u16(palette_tags + i * 2) for i in range(16)], "tileTags": [u16(tile_tags + i * 2) for i in range(64)], "tileRanges": [[u16(tile_ranges + i * 4), u16(tile_ranges + i * 4 + 2)] for i in range(64)], "tileBitmap": raw(tile_bitmap, 128), "matrixBitmap": u32(names["gOamMatrixAllocBitmap"]), "reservedPaletteCount": u8(names["gReservedSpritePaletteCount"]), "reservedTileCount": u16(names["gReservedSpriteTileCount"])}, "battleBg": {n: s16(names[n]) for n in battle_bg_names}, "bgVramSha256": digest(0x06000000, 0x10000), "registers": {n: u16(a) for n, a in regs.items()}, "audio": {"SE1": mplay("SE1"), "SE2": mplay("SE2")}}
    rows, started, frame = [], False, 0
    def take():
        nonlocal started
        snap = lab.snapshot(); script = u32(pointer)
        if not started and snap["engine"]["currentMove"] == MOVE and start <= script < end and bool(u8(active)): started = True
        if started: rows.append(row(frame, snap))
    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; take()
            if started and rows[-1]["animScriptActive"] is False: break
        if started and rows[-1]["animScriptActive"] is False: break
    if not rows or rows[0]["scriptOwner"] != "Move_SAND_TOMB" or rows[0]["scriptOffset"] != 0 or rows[-1]["animScriptActive"] is not False: raise RuntimeError("complete Sand Tomb pointer window was not observed")
    topology = {"tasks": sorted({t["func"]["symbol"] for r in rows for t in r["tasks"] if t["func"]["symbol"]}), "templates": sorted({s["template"]["symbol"] for r in rows for s in r["sprites"] if s["template"]["symbol"]}), "callbacks": sorted({s["callback"]["symbol"] for r in rows for s in r["sprites"] if s["callback"]["symbol"]})}
    symbols = ("Move_SAND_TOMB", "SandTombSwirlingDirt", "Move_SHEER_COLD", "gSwirlingDirtSpriteTemplate", "AnimParticleInVortex", "AnimParticleInVortex_Step", "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step", "gSimplePaletteBlendSpriteTemplate", "AnimSimplePaletteBlend", "AnimSimplePaletteBlend_Step", "se_m_sand_tomb")
    result = {"schema": "sand-tomb-dense-evidence/v1", "profile": "battle-scene-on", "move": MOVE, "setup": setup, "sourceWindow": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"], "frameCount": len(rows), "sourceFrameCount": sum(r["scriptOwner"] in ("Move_SAND_TOMB", "SandTombSwirlingDirt") for r in rows)}, "sourcePointerContract": {"start": start, "subroutine": subroutine, "endExclusive": end, "observedAddresses": sorted({r["scriptPtr"] for r in rows}), "observedParities": sorted({r["scriptPtrParity"] for r in rows if r["scriptOwner"] is not None})}, "sourceSymbols": {n: names[n] for n in symbols}, "topology": topology, "frames": rows}
    OUTPUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: source {rows[0]['frame']}..{rows[-1]['frame']} ({len(rows)} frames)")

if __name__ == "__main__": main()
