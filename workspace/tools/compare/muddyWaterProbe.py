#!/usr/bin/env python3
"""Dense local-mGBA evidence for the source-owned Surf-wave command's muddy sibling."""
from __future__ import annotations

import hashlib, json, subprocess, sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: muddyWaterProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE_MUDDY_WATER = 330

def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    reference = (ROOT / "reference" / "pokeemerald").resolve()
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map",
                           HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    symbols = oracle.symbols
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(reference / "pokeemerald.elf")],
                        check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines()
             if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    by_name, by_address = {n: a for a, n in pairs}, {a: n for a, n in pairs}
    sprites, matrices, tasks = symbols["gSprites"], symbols["gOamMatrices"], symbols["gTasks"]
    faded, unfaded = symbols["gPlttBufferFaded"], symbols["gPlttBufferUnfaded"]
    palette_tags = by_name["sSpritePaletteTags"]
    script_active, script_ptr, script_wait = (by_name[n] for n in
        ("gAnimScriptActive", "sBattleAnimScriptPtr", "sAnimFramesToWait"))
    move_start, move_end = by_name["Move_MUDDY_WATER"], by_name["Move_BULLET_SEED"]

    def u16(a: int) -> int: return oracle.read_u8(a) | oracle.read_u8(a + 1) << 8
    def u32(a: int) -> int: return u16(a) | u16(a + 2) << 16
    def s16(a: int) -> int:
        v = u16(a); return v - 0x10000 if v >= 0x8000 else v
    def s8(a: int) -> int:
        v = oracle.read_u8(a); return v - 0x100 if v >= 0x80 else v
    def raw(a: int, size: int) -> str:
        return "".join(f"{oracle.read_u8(a + i):02x}" for i in range(size))
    def identity(a: int) -> dict:
        return {"address": a, "symbol": by_address.get(a & ~1)}
    def digest(a: int, size: int) -> str:
        return hashlib.sha256(bytes(oracle.read_u8(a + i) for i in range(size))).hexdigest()
    def sound(name: str) -> dict:
        info, tracks = symbols[f"gMPlayInfo_{name}"], symbols[f"gMPlayTrack_{name}"]
        return {"songHeader": u32(info), "status": u32(info + 4), "rawInfo": raw(info, 0x40),
                "tracks": [{"flags": oracle.read_u8(tracks + i * 0x50),
                            "panX": s8(tracks + i * 0x50 + 0x15),
                            "raw": raw(tracks + i * 0x50, 0x50)} for i in range(3)]}
    def active_sprites() -> list[dict]:
        result = []
        for slot in range(64):
            b = sprites + slot * 0x44
            if not oracle.read_u8(b + 0x3e) & 1: continue
            matrix_num = u16(b + 2) >> 9 & 31; matrix = matrices + matrix_num * 8
            result.append({"slot": slot, "raw": raw(b, 0x44),
                "template": identity(u32(b + 0x14)), "callback": identity(u32(b + 0x1c)),
                "attr0": u16(b), "attr1": u16(b + 2), "attr2": u16(b + 4),
                "x": s16(b + 0x20), "y": s16(b + 0x22), "x2": s16(b + 0x24), "y2": s16(b + 0x26),
                "subpriority": oracle.read_u8(b + 0x43), "matrixNum": matrix_num,
                "matrix": {"a": s16(matrix), "b": s16(matrix + 2), "c": s16(matrix + 4), "d": s16(matrix + 6)},
                "data": [s16(b + 0x2e + i * 2) for i in range(8)]})
        return result
    def active_tasks() -> list[dict]:
        result = []
        for slot in range(16):
            b = tasks + slot * 0x28
            if not oracle.read_u8(b + 4): continue
            result.append({"slot": slot, "raw": raw(b, 0x28), "func": identity(u32(b)),
                "isActive": oracle.read_u8(b + 4), "prev": oracle.read_u8(b + 5),
                "next": oracle.read_u8(b + 6), "priority": oracle.read_u8(b + 7),
                "data": [s16(b + 8 + i * 2) for i in range(16)]})
        return result

    RGB_DIR.mkdir(parents=True, exist_ok=True)
    rows: list[dict] = []; frame = 0
    def snap() -> None:
        if lab.snapshot()["engine"]["currentMove"] != MOVE_MUDDY_WATER: return
        bg1cnt = u16(0x0400000A); char_base = (bg1cnt >> 2 & 3) * 0x4000
        screen_base = (bg1cnt >> 8 & 31) * 0x800
        rgb = oracle.screen_rgb(); (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        ptr = u32(script_ptr)
        rows.append({"frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(), "currentMove": MOVE_MUDDY_WATER,
            "battlers": lab.snapshot()["battlers"],
            "gAnimScriptActive": oracle.read_u8(script_active), "gBattleAnimScriptPtr": identity(ptr),
            "battleAnimScriptOffset": ptr - move_start if move_start <= ptr < move_end else None,
            "gAnimFramesToWait": s8(script_wait), "attacker": oracle.read_u8(symbols["gBattleAnimAttacker"]),
            "target": oracle.read_u8(symbols["gBattleAnimTarget"]),
            "visualTaskCount": oracle.read_u8(symbols["gAnimVisualTaskCount"]),
            "soundTaskCount": oracle.read_u8(symbols["gAnimSoundTaskCount"]),
            "tasks": active_tasks(), "sprites": active_sprites(),
            "hardwareOam": [raw(0x07000000 + i * 8, 8) for i in range(128)],
            "hardwareMatrices": [{"a": s16(0x07000006 + i * 0x20), "b": s16(0x0700000E + i * 0x20),
                                  "c": s16(0x07000016 + i * 0x20), "d": s16(0x0700001E + i * 0x20)} for i in range(32)],
            "fadedPalette": [u16(faded + i * 2) for i in range(512)],
            "unfadedPalette": [u16(unfaded + i * 2) for i in range(512)],
            "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)],
            "paletteTags": [u16(palette_tags + i * 2) for i in range(16)],
            "registers": {n: u16(a) for n, a in {"dispcnt":0x04000000,"bg0cnt":0x04000008,"bg1cnt":0x0400000A,"bg2cnt":0x0400000C,"bg3cnt":0x0400000E,"bg0hofs":0x04000010,"bg0vofs":0x04000012,"bg1hofs":0x04000014,"bg1vofs":0x04000016,"bg2hofs":0x04000018,"bg2vofs":0x0400001A,"bg3hofs":0x0400001C,"bg3vofs":0x0400001E,"bg2pa":0x04000020,"bg2pb":0x04000022,"bg2pc":0x04000024,"bg2pd":0x04000026,"bg3pa":0x04000030,"bg3pb":0x04000032,"bg3pc":0x04000034,"bg3pd":0x04000036,"winin":0x04000048,"winout":0x0400004A,"mosaic":0x0400004C,"bldcnt":0x04000050,"bldalpha":0x04000052,"bldy":0x04000054}.items()},
            "bg1Vram": {"charBase": char_base, "screenBase": screen_base,
                         "charBlock": raw(0x06000000 + char_base, 0x4000),
                         "screenBlock": raw(0x06000000 + screen_base, 0x800),
                         "charBlockSha256": digest(0x06000000 + char_base, 0x4000),
                         "screenBlockSha256": digest(0x06000000 + screen_base, 0x800)},
            "se1": sound("SE1"), "se2": sound("SE2")})
    snap()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; snap()
    if not rows: raise RuntimeError("stock ROM did not reach MOVE_MUDDY_WATER")
    start = next((i for i, r in enumerate(rows) if r["gAnimScriptActive"] and r["battleAnimScriptOffset"] == 0), None)
    if start is None: raise RuntimeError("stock ROM did not expose active Move_MUDDY_WATER script")
    cleanup = next((i for i, r in enumerate(rows[start + 1:], start + 1)
                    if not r["gAnimScriptActive"] and r["battleAnimScriptOffset"] is not None), None)
    if cleanup is None: raise RuntimeError("stock ROM did not expose Move_MUDDY_WATER cleanup")
    active = rows[start:cleanup]
    if not active or not all(r["gAnimScriptActive"] and r["battleAnimScriptOffset"] is not None for r in active):
        raise RuntimeError("Move_MUDDY_WATER active source interval is not contiguous")
    output = {"schema":"muddy-water-dense-evidence/v1", "setup": setup,
        "captureWindow":{"startFrame":rows[0]["frame"],"endFrame":rows[-1]["frame"],"frameCount":len(rows)},
        "activeSourceScriptWindow":{"startFrame":active[0]["frame"],"endFrame":active[-1]["frame"],"frameCount":len(active)},
        "sourceOwnedComponentWindow":{"startFrame":active[0]["frame"],"endFrame":rows[cleanup]["frame"],"frameCount":cleanup-start+1},
        "sourceSymbols":{"Move_MUDDY_WATER":move_start,"Move_BULLET_SEED":move_end,
                         "AnimTask_CreateSurfWave":by_name["AnimTask_CreateSurfWave"],
                         "AnimTask_CreateSurfWave_Step1":by_name["AnimTask_CreateSurfWave_Step1"],
                         "AnimTask_CreateSurfWave_Step2":by_name["AnimTask_CreateSurfWave_Step2"],
                         "AnimTask_SurfWaveScanlineEffect":by_name["AnimTask_SurfWaveScanlineEffect"]},
        "songHeaders":{"SE_M_WHIRLPOOL":u32(symbols["gSongTable"] + 165 * 8),
                       "SE_M_SURF":u32(symbols["gSongTable"] + 163 * 8)},
        "frames": rows}
    OUTPUT.write_text(json.dumps(output, separators=(",", ":")) + "\n")
    print(f"wrote {OUTPUT}: currentMove {output['captureWindow']}, source {output['sourceOwnedComponentWindow']}")

main()
