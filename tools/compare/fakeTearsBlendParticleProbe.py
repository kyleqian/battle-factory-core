#!/usr/bin/env python3
"""Dense local-mGBA evidence for Fake Tears' initial BlendParticle task only."""
from __future__ import annotations
import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: fakeTearsBlendParticleProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_FAKE_TEARS = 313

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on"); setup = lab.prepare(request)
    sy = oracle.symbols
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    by_name, by_address = {n: a for a, n in pairs}, {a: n for a, n in pairs}
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    faded, unfaded, palette_tags = sy["gPlttBufferFaded"], sy["gPlttBufferUnfaded"], by_name["sSpritePaletteTags"]
    script_active, script_ptr, script_wait = (by_name[n] for n in ("gAnimScriptActive", "sBattleAnimScriptPtr", "sAnimFramesToWait"))
    move_start, move_end = by_name["Move_FAKE_TEARS"], by_name["Move_AIR_CUTTER"]
    def u16(a): return oracle.read_u8(a) | oracle.read_u8(a + 1) << 8
    def u32(a): return u16(a) | u16(a + 2) << 16
    def s16(a):
        v = u16(a); return v - 0x10000 if v >= 0x8000 else v
    def s8(a):
        v = oracle.read_u8(a); return v - 0x100 if v >= 0x80 else v
    def raw(a, size): return "".join(f"{oracle.read_u8(a + i):02x}" for i in range(size))
    def identity(a): return {"address": a, "symbol": by_address.get(a & ~1)}
    def player(name):
        info, tracks = sy[f"gMPlayInfo_{name}"], sy[f"gMPlayTrack_{name}"]
        return {"songHeader": u32(info), "status": u32(info + 4), "rawInfo": raw(info, 0x40), "tracks": [{"flags": oracle.read_u8(tracks + i * 0x50), "panX": s8(tracks + i * 0x50 + 0x15), "raw": raw(tracks + i * 0x50, 0x50)} for i in range(3)]}
    def active_sprites():
        rows = []
        for slot in range(64):
            b = sprites + slot * 0x44
            if not oracle.read_u8(b + 0x3e) & 1: continue
            mn = u16(b + 2) >> 9 & 31; matrix = matrices + mn * 8
            rows.append({"slot": slot, "raw": raw(b, 0x44), "template": identity(u32(b + 0x14)), "callback": identity(u32(b + 0x1c)), "attr0": u16(b), "attr1": u16(b + 2), "attr2": u16(b + 4), "x": s16(b + 0x20), "y": s16(b + 0x22), "x2": s16(b + 0x24), "y2": s16(b + 0x26), "subpriority": oracle.read_u8(b + 0x43), "matrixNum": mn, "matrix": {"a": s16(matrix), "b": s16(matrix + 2), "c": s16(matrix + 4), "d": s16(matrix + 6)}, "data": [s16(b + 0x2e + i * 2) for i in range(8)]})
        return rows
    def active_tasks():
        rows = []
        for slot in range(16):
            b = tasks + slot * 0x28
            if not oracle.read_u8(b + 4): continue
            rows.append({"slot": slot, "raw": raw(b, 0x28), "func": identity(u32(b)), "isActive": oracle.read_u8(b + 4), "prev": oracle.read_u8(b + 5), "next": oracle.read_u8(b + 6), "priority": oracle.read_u8(b + 7), "data": [s16(b + 8 + i * 2) for i in range(16)]})
        return rows
    RGB_DIR.mkdir(parents=True, exist_ok=True); rows = []; frame = 0
    def snap():
        if lab.snapshot()["engine"]["currentMove"] != MOVE_FAKE_TEARS: return
        rgb = oracle.screen_rgb(); (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        ptr = u32(script_ptr)
        rows.append({"frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(), "currentMove": MOVE_FAKE_TEARS, "gAnimScriptActive": oracle.read_u8(script_active), "gBattleAnimScriptPtr": identity(ptr), "battleAnimScriptOffset": ptr - move_start if move_start <= ptr < move_end else None, "gAnimFramesToWait": s8(script_wait), "attacker": oracle.read_u8(sy["gBattleAnimAttacker"]), "target": oracle.read_u8(sy["gBattleAnimTarget"]), "visualTaskCount": oracle.read_u8(sy["gAnimVisualTaskCount"]), "soundTaskCount": oracle.read_u8(sy["gAnimSoundTaskCount"]), "tasks": active_tasks(), "sprites": active_sprites(), "hardwareOam": [raw(0x07000000 + i * 8, 8) for i in range(128)], "hardwareMatrices": [{"a": s16(0x07000006 + i * 0x20), "b": s16(0x0700000E + i * 0x20), "c": s16(0x07000016 + i * 0x20), "d": s16(0x0700001E + i * 0x20)} for i in range(32)], "fadedPalette": [u16(faded + i * 2) for i in range(512)], "unfadedPalette": [u16(unfaded + i * 2) for i in range(512)], "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)], "paletteTags": [u16(palette_tags + i * 2) for i in range(16)], "registers": {n: u16(a) for n, a in {"dispcnt":0x04000000,"bg0cnt":0x04000008,"bg1cnt":0x0400000A,"bg2cnt":0x0400000C,"bg3cnt":0x0400000E,"bg0hofs":0x04000010,"bg0vofs":0x04000012,"bg1hofs":0x04000014,"bg1vofs":0x04000016,"bg2hofs":0x04000018,"bg2vofs":0x0400001A,"bg3hofs":0x0400001C,"bg3vofs":0x0400001E,"bg2pa":0x04000020,"bg2pb":0x04000022,"bg2pc":0x04000024,"bg2pd":0x04000026,"bg3pa":0x04000030,"bg3pb":0x04000032,"bg3pc":0x04000034,"bg3pd":0x04000036,"winin":0x04000048,"winout":0x0400004A,"mosaic":0x0400004C,"bldcnt":0x04000050,"bldalpha":0x04000052,"bldy":0x04000054}.items()}, "se1": player("SE1"), "se2": player("SE2")})
    snap()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]): oracle.advance(segment.get("buttons", [])); frame += 1; snap()
    if not rows: raise RuntimeError("stock ROM did not reach MOVE_FAKE_TEARS")
    # Cmd_createvisualtask calls this task immediately, before incrementing
    # gAnimVisualTaskCount.  With Fake Tears' (delay=0, initial=4, target=4)
    # arguments Step2 latches the palette then destroys itself in that same
    # command dispatch, so no active gTasks row survives the frame boundary.
    # The source-relative command pointer at offset 9 is the creation latch;
    # its next dense frame is the first observable inactive/display latch.
    start = next((i for i in range(len(rows) - 1) if rows[i]["gAnimScriptActive"]
                  and rows[i]["battleAnimScriptOffset"] == 9
                  and rows[i + 1]["battleAnimScriptOffset"] != 9), None)
    if start is None or start + 1 >= len(rows): raise RuntimeError("stock ROM did not expose Fake Tears BlendParticle creation/display latches")
    inactive = start + 1; active = rows[start:inactive]
    before, after = rows[start], rows[inactive]
    tag = 10000 + 155
    palette_index = next((i for i, value in enumerate(before["paletteTags"]) if value == tag), None)
    if palette_index is None or after["paletteTags"][palette_index] != tag: raise RuntimeError("SMALL_BUBBLES palette tag is not latched across BlendParticle")
    # Sprite palette slots address OBJ palette RAM, which begins at index 256.
    first, last = 256 + palette_index * 16, 256 + (palette_index + 1) * 16
    if before["fadedPalette"][first:last] == after["fadedPalette"][first:last]: raise RuntimeError("BlendParticle did not change SMALL_BUBBLES faded OBJ palette")
    output = {"schema": "fake-tears-blend-particle-dense-evidence/v1", "setup": setup, "captureWindow": {"startFrame": rows[0]["frame"], "endFrame": rows[-1]["frame"], "frameCount": len(rows)}, "blendParticleActiveWindow": {"startFrame": active[0]["frame"], "endFrame": active[-1]["frame"], "frameCount": len(active)}, "sourceOwnedComponentWindow": {"startFrame": active[0]["frame"], "endFrame": rows[inactive]["frame"], "frameCount": inactive - start + 1}, "latch": {"createScriptOffset": 9, "firstInactiveFrame": after["frame"], "paletteIndex": palette_index}, "sourceSymbols": {"Move_FAKE_TEARS": move_start, "Move_AIR_CUTTER": move_end, "AnimTask_BlendParticle": by_name["AnimTask_BlendParticle"], "AnimTask_BlendSpriteColor_Step2": by_name["AnimTask_BlendSpriteColor_Step2"]}, "smallBubblesTag": tag, "frames": rows}
    OUTPUT.write_text(json.dumps(output, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: capture {output['captureWindow']}, BlendParticle {output['sourceOwnedComponentWindow']}")

main()
