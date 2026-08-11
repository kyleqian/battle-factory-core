#!/usr/bin/env python3
"""Dense Scene-ON evidence for the complete MOVE_GLARE source window."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: glareProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_GLARE = 137

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on"); setup = lab.prepare(request)
    sprites, matrices, tasks = oracle.symbols["gSprites"], oracle.symbols["gOamMatrices"], oracle.symbols["gTasks"]
    visual_count, sound_count = oracle.symbols["gAnimVisualTaskCount"], oracle.symbols["gAnimSoundTaskCount"]
    faded, unfaded = oracle.symbols["gPlttBufferFaded"], oracle.symbols["gPlttBufferUnfaded"]
    anim_attacker, anim_target = oracle.symbols["gBattleAnimAttacker"], oracle.symbols["gBattleAnimTarget"]
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    symbol_rows = [(int(parts[0], 16), parts[2]) for line in nm.splitlines() if len(parts := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in parts[0])]
    symbols = {name: address for address, name in symbol_rows}; names = {address: name for address, name in symbol_rows}
    palette_tags = symbols["sSpritePaletteTags"]
    script_active, script_ptr, frames_to_wait = symbols["gAnimScriptActive"], symbols["sBattleAnimScriptPtr"], symbols["sAnimFramesToWait"]
    move_script, move_script_end = symbols["Move_GLARE"], symbols["Move_BARRAGE"]
    move_script_cleanup = move_script_end - 1
    song_table = symbols["gSongTable"]
    def u16(address): return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8
    def s16(address):
        value = u16(address); return value - 0x10000 if value >= 0x8000 else value
    def s8(address):
        value = oracle.read_u8(address); return value - 0x100 if value >= 0x80 else value
    def raw(address, size): return "".join(f"{oracle.read_u8(address + i):02x}" for i in range(size))
    def identity(address): return {"address": address, "symbol": names.get(address & ~1)}
    def audio_player(name):
        info, tracks = oracle.symbols[f"gMPlayInfo_{name}"], oracle.symbols[f"gMPlayTrack_{name}"]
        return {"songHeader": oracle.read_u32(info), "status": oracle.read_u32(info + 4), "rawInfo": raw(info, 0x40), "tracks": [{"flags": oracle.read_u8(tracks + i * 0x50), "panX": s8(tracks + i * 0x50 + 0x15), "raw": raw(tracks + i * 0x50, 0x50)} for i in range(3)]}
    RGB_DIR.mkdir(parents=True, exist_ok=True); rows = []; frame = 0
    def snap():
        pointer = oracle.read_u32(script_ptr)
        if lab.snapshot()["engine"]["currentMove"] != MOVE_GLARE and not (move_script <= pointer < move_script_end): return
        active_sprites = []
        for slot in range(64):
            base = sprites + slot * 0x44
            if not oracle.read_u8(base + 0x3e) & 1: continue
            matrix_num = u16(base + 2) >> 9 & 31; matrix = matrices + matrix_num * 8
            active_sprites.append({"slot": slot, "raw": raw(base, 0x44), "template": identity(oracle.read_u32(base + 0x14)), "callback": identity(oracle.read_u32(base + 0x1c)), "attr0": u16(base), "attr1": u16(base + 2), "attr2": u16(base + 4), "x": s16(base + 0x20), "y": s16(base + 0x22), "x2": s16(base + 0x24), "y2": s16(base + 0x26), "subpriority": oracle.read_u8(base + 0x43), "matrixNum": matrix_num, "matrix": {"a": s16(matrix), "b": s16(matrix + 2), "c": s16(matrix + 4), "d": s16(matrix + 6)}, "data": [s16(base + 0x2e + i * 2) for i in range(8)]})
        active_tasks = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if not oracle.read_u8(base + 4): continue
            active_tasks.append({"slot": slot, "raw": raw(base, 0x28), "func": identity(oracle.read_u32(base)), "isActive": oracle.read_u8(base + 4), "prev": oracle.read_u8(base + 5), "next": oracle.read_u8(base + 6), "priority": oracle.read_u8(base + 7), "data": [s16(base + 8 + i * 2) for i in range(16)]})
        rgb = oracle.screen_rgb(); (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        battler_ids = oracle.symbols["gBattlerSpriteIds"]
        rows.append({"frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(), "currentMove": MOVE_GLARE, "gAnimScriptActive": oracle.read_u8(script_active), "gBattleAnimScriptPtr": identity(pointer), "battleAnimScriptOffset": pointer - move_script if move_script <= pointer < move_script_end else None, "gAnimFramesToWait": s8(frames_to_wait), "attacker": oracle.read_u8(anim_attacker), "target": oracle.read_u8(anim_target), "visualTaskCount": oracle.read_u8(visual_count), "soundTaskCount": oracle.read_u8(sound_count), "tasks": active_tasks, "sprites": active_sprites, "playerSprite": next(row for row in active_sprites if row["slot"] == oracle.read_u8(battler_ids)), "opponentSprite": next(row for row in active_sprites if row["slot"] == oracle.read_u8(battler_ids + 1)), "hardwareOam": [raw(0x07000000 + i * 8, 8) for i in range(128)], "hardwareMatrices": [{"a": s16(0x07000006 + i * 0x20), "b": s16(0x0700000e + i * 0x20), "c": s16(0x07000016 + i * 0x20), "d": s16(0x0700001e + i * 0x20)} for i in range(32)], "fadedPalette": [u16(faded + i * 2) for i in range(512)], "unfadedPalette": [u16(unfaded + i * 2) for i in range(512)], "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)], "paletteTags": [u16(palette_tags + i * 2) for i in range(16)], "registers": {"dispcnt": u16(0x04000000), "bg0cnt": u16(0x04000008), "bg1cnt": u16(0x0400000a), "bg2cnt": u16(0x0400000c), "bg3cnt": u16(0x0400000e), "bg0hofs": u16(0x04000010), "bg0vofs": u16(0x04000012), "bg1hofs": u16(0x04000014), "bg1vofs": u16(0x04000016), "bg2hofs": u16(0x04000018), "bg2vofs": u16(0x0400001a), "bg3hofs": u16(0x0400001c), "bg3vofs": u16(0x0400001e), "winin": u16(0x04000048), "winout": u16(0x0400004a), "mosaic": u16(0x0400004c), "bldcnt": u16(0x04000050), "bldalpha": u16(0x04000052), "bldy": u16(0x04000054)}, "softwareBg": {"bg1x": s16(oracle.symbols["gBattle_BG1_X"]), "bg1y": s16(oracle.symbols["gBattle_BG1_Y"]), "bg2x": s16(oracle.symbols["gBattle_BG2_X"]), "bg2y": s16(oracle.symbols["gBattle_BG2_Y"]), "bg3x": s16(oracle.symbols["gBattle_BG3_X"]), "bg3y": s16(oracle.symbols["gBattle_BG3_Y"])}, "se1": audio_player("SE1"), "se2": audio_player("SE2")})
    snap()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]): oracle.advance(segment.get("buttons", [])); frame += 1; snap()
    if not rows: raise RuntimeError("stock ROM did not reach MOVE_GLARE (137)")
    source_start = next((i for i, row in enumerate(rows) if row["gAnimScriptActive"] and row["battleAnimScriptOffset"] == 0), None)
    if source_start is None: raise RuntimeError(f"stock ROM did not expose active Move_GLARE script state; sampled pointers={[(row['frame'], row['gAnimScriptActive'], row['gBattleAnimScriptPtr']) for row in rows[:8]]}")
    cleanup = next((i for i, row in enumerate(rows[source_start + 1:], source_start + 1) if not row["gAnimScriptActive"] and row["battleAnimScriptOffset"] == move_script_cleanup - move_script), None)
    if cleanup is None: raise RuntimeError("stock ROM did not expose Move_GLARE script cleanup")
    active_rows = rows[source_start:cleanup]
    if not active_rows or not all(row["gAnimScriptActive"] and row["battleAnimScriptOffset"] is not None for row in active_rows): raise RuntimeError("Move_GLARE source-script interval is not contiguous")
    active_window = {"startFrame": active_rows[0]["frame"], "endFrame": active_rows[-1]["frame"], "frameCount": len(active_rows)}
    source_window = {"startFrame": active_rows[0]["frame"], "endFrame": rows[cleanup]["frame"], "frameCount": cleanup - source_start + 1}
    capture_window = {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"], "frameCount": len(rows)}
    OUTPUT.write_text(json.dumps({"schema": "glare-dense-evidence/v1", "setup": setup, "captureWindow": capture_window, "activeSourceScriptWindow": active_window, "sourceAnimationWindow": source_window, "songHeaders": {"SE_M_PSYBEAM2": oracle.read_u32(song_table + 200 * 8), "SE_M_LEER": oracle.read_u32(song_table + 192 * 8)}, "sourceSymbols": {"Move_GLARE": move_script, "Move_BARRAGE": move_script_end}, "templates": {"gGlareEyeDotSpriteTemplate": symbols["gGlareEyeDotSpriteTemplate"], "gEyeSparkleSpriteTemplate": symbols["gEyeSparkleSpriteTemplate"]}, "frames": rows}, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: capture {capture_window}, active script {active_window}, source animation incl. cleanup {source_window}")

main()
