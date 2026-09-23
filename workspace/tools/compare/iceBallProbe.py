#!/usr/bin/env python3
"""Capture the natural five-body Scene-ON MOVE_ICE_BALL lifecycle.

The MechanicLab request supplies complete legal parties only.  The ROM's
rollout counter, damage, animation RNG, script dispatch, and cleanup remain
the source of truth; this probe only observes them.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: iceBallProbe.py <scenario.json> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

MOVE = 301


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    setup = lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    names = {n: a for a, n in pairs}
    by_address = {a: n for a, n in pairs}
    sy = oracle.symbols
    sprites, matrices, tasks = sy["gSprites"], sy["gOamMatrices"], sy["gTasks"]
    active, pointer = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"]
    start, end = names["Move_ICE_BALL"], names["Move_WEATHER_BALL"]
    palette_tags, tile_tags = names["sSpritePaletteTags"], names["sSpriteTileRangeTags"]
    software, wait = names["gMain"] + 0x38, names["sAnimFramesToWait"]
    RGB.mkdir(parents=True, exist_ok=True)

    u8 = lambda a: oracle.read_u8(a)
    u16 = lambda a: u8(a) | u8(a + 1) << 8
    u32 = lambda a: u16(a) | u16(a + 2) << 16
    def s16(a):
        v = u16(a); return v - 0x10000 if v >= 0x8000 else v
    def s32(a):
        v = u32(a); return v - 0x100000000 if v >= 0x80000000 else v
    def s8(a):
        v = u8(a); return v - 0x100 if v >= 0x80 else v
    def raw(a, n): return bytes(u8(a + i) for i in range(n)).hex()
    def digest(a, n): return hashlib.sha256(bytes(u8(a + i) for i in range(n))).hexdigest()
    def ident(a): return {"address": a, "symbol": by_address.get(a & ~1)}

    def sprite(slot):
        base = sprites + slot * 0x44
        mn = (u16(base + 2) >> 9) & 31
        matrix = matrices + mn * 8
        return {
            "slot": slot, "raw": raw(base, 0x44),
            "template": ident(u32(base + 0x14)), "callback": ident(u32(base + 0x1c)),
            "attr": [u16(base + i) for i in (0, 2, 4)],
            "x": s16(base + 0x20), "y": s16(base + 0x22),
            "x2": s16(base + 0x24), "y2": s16(base + 0x26),
            "animNum": u8(base + 0x2a), "animCmdIndex": u8(base + 0x2b),
            "animDelayCounter": u8(base + 0x2c), "subpriority": u8(base + 0x43),
            "invisible": (u8(base + 0x3e) >> 2) & 1, "matrixNum": mn,
            "matrix": [s16(matrix + i) for i in (0, 2, 4, 6)],
            "data": [s16(base + 0x2e + i * 2) for i in range(8)],
        }

    def audio_player(name):
        info, track = sy[f"gMPlayInfo_{name}"], sy[f"gMPlayTrack_{name}"]
        return {"songHeader": u32(info), "songHeaderIdentity": ident(u32(info)), "status": u32(info + 4),
                "tracks": [{"flags": u8(track + i * 0x50), "pan": s8(track + i * 0x50 + 0x14),
                            "panX": s8(track + i * 0x50 + 0x15), "raw": raw(track + i * 0x50, 0x50)} for i in range(4)]}

    regs = {"dispcnt":0x04000000,"bg0cnt":0x04000008,"bg1cnt":0x0400000a,"bg2cnt":0x0400000c,"bg3cnt":0x0400000e,
            "bg0hofs":0x04000010,"bg0vofs":0x04000012,"bg1hofs":0x04000014,"bg1vofs":0x04000016,
            "bg2hofs":0x04000018,"bg2vofs":0x0400001a,"bg3hofs":0x0400001c,"bg3vofs":0x0400001e,
            "win0h":0x04000040,"win0v":0x04000044,"winin":0x04000048,"winout":0x0400004a,"mosaic":0x0400004c,
            "bldcnt":0x04000050,"bldalpha":0x04000052,"bldy":0x04000054}
    battle_bg_names = [name for name in ("gBattle_BG1_X", "gBattle_BG1_Y", "gBattle_BG2_X", "gBattle_BG2_Y", "gBattle_BG3_X", "gBattle_BG3_Y") if name in names]

    def live_tasks():
        result = []
        for slot in range(16):
            base = tasks + slot * 0x28
            if u8(base + 4):
                result.append({"slot": slot, "raw": raw(base, 0x28), "func": ident(u32(base)),
                               "function": by_address.get(u32(base) & ~1), "data": [s16(base + 8 + i * 2) for i in range(16)]})
        return result

    def allocators():
        return {"tileRanges": [[u16(names["sSpriteTileRanges"] + i * 4), u16(names["sSpriteTileRanges"] + i * 4 + 2)] for i in range(64)],
                "tileBitmap": raw(names["sSpriteTileAllocBitmap"], 128), "matrixBitmap": u32(names["gOamMatrixAllocBitmap"]),
                "reservedPaletteCount": u8(names["gReservedSpritePaletteCount"]), "reservedTileCount": u16(names["gReservedSpriteTileCount"])}

    bodies, frame, capturing = [], 0, False

    def take():
        nonlocal capturing
        snap = lab.snapshot()
        script = u32(pointer)
        active_now = bool(u8(active))
        in_source = start <= script < end
        if not capturing and active_now and in_source:
            bodies.append([]); capturing = True
        if not capturing:
            return
        body = len(bodies) - 1
        age = len(bodies[body])
        rgb = oracle.screen_rgb()
        rgb_name = f"body-{body + 1}-{age:03d}.rgb"
        (RGB / rgb_name).write_bytes(rgb)
        row = {
            "frame": frame, "body": body + 1, "age": age, "sha256": hashlib.sha256(rgb).hexdigest(),
            "rgbFile": rgb_name, "currentMove": snap["engine"].get("currentMove"),
            "animScriptActive": active_now, "scriptPtr": script, "scriptPtrParity": script & 1,
            "scriptOwner": "Move_ICE_BALL" if in_source else None, "scriptOffset": script - start if in_source else None,
            "scriptWait": s8(wait), "animArgs": [s16(names["gBattleAnimArgs"] + i * 2) for i in range(8)],
            "visualTaskCount": u8(sy["gAnimVisualTaskCount"]), "soundTaskCount": u8(sy["gAnimSoundTaskCount"]),
            "tasks": live_tasks(), "sprites": [sprite(i) for i in range(64) if u8(sprites + i * 0x44 + 0x3e) & 1],
            "spriteOrder": [u8(names["sSpriteOrder"] + i) for i in range(64)],
            "animationBattlers": {"attacker": u8(names["gBattleAnimAttacker"]), "target": u8(names["gBattleAnimTarget"]),
                                  "spriteIds": [u8(names["gBattlerSpriteIds"] + i) for i in range(4)]},
            "battlers": snap["battlers"], "parties": snap["parties"], "engine": snap["engine"],
            "immutableState": {k: snap[k] for k in ("rngValue", "battleOutcome", "weather", "weatherTurns", "sideStatuses", "sideConditions")},
            "battleScript": ident(u32(sy["gBattlescriptCurrInstr"])), "battleMoveDamage": s32(sy["gBattleMoveDamage"]),
            "dynamicBasePower": u16(sy["gDynamicBasePower"]), "lockedMoves": [u16(sy["gLockedMoves"] + i * 2) for i in range(4)],
            "animationRng": u32(names["gRng2Value"]), "softwareOam": [raw(software + i * 8, 8) for i in range(128)],
            "hardwareOam": [raw(0x07000000 + i * 8, 8) for i in range(128)],
            "softwareMatrices": [[s16(matrices + i * 8 + j) for j in (0, 2, 4, 6)] for i in range(32)],
            "hardwareMatrices": [[s16(0x07000006 + i * 0x20 + j) for j in (0, 8, 16, 24)] for i in range(32)],
            "fadedPalette": [u16(sy["gPlttBufferFaded"] + i * 2) for i in range(512)],
            "unfadedPalette": [u16(sy["gPlttBufferUnfaded"] + i * 2) for i in range(512)],
            "hardwarePalette": [u16(0x05000000 + i * 2) for i in range(512)],
            "paletteTags": [u16(palette_tags + i * 2) for i in range(16)], "tileTags": [u16(tile_tags + i * 2) for i in range(128)],
            "allocators": allocators(), "registers": {n: u16(a) for n, a in regs.items()},
            "battleBg": {n: s16(names[n]) for n in battle_bg_names}, "bgVramSha256": digest(0x06000000, 0x10000),
            "audio": {"SE1": audio_player("SE1"), "SE2": audio_player("SE2")},
        }
        bodies[body].append(row)
        if not active_now:
            capturing = False

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; take()
            if len(bodies) >= 5 and not capturing: break
        if len(bodies) >= 5 and not capturing: break
    for tail in range(12000):
        if len(bodies) >= 5 and not capturing: break
        oracle.advance(["A"] if tail % 30 < 2 else []); frame += 1; take()

    complete = len(bodies) == 5 and all(body and body[0]["scriptOffset"] == 0 and not body[-1]["animScriptActive"] for body in bodies)
    topology = {"tasks": sorted({t["function"] for b in bodies for row in b for t in row["tasks"] if t["function"]}),
                "templates": sorted({s["template"]["symbol"] for b in bodies for row in b for s in row["sprites"] if s["template"]["symbol"]}),
                "callbacks": sorted({s["callback"]["symbol"] for b in bodies for row in b for s in row["sprites"] if s["callback"]["symbol"]})}
    output = {"schema": "ice-ball-dense-evidence/v1", "oracleProfile": "battle-scene-on", "setup": setup,
              "completeFiveBodyLifecycle": complete,
              "sourceWindows": [{"body": i + 1, "startFrame": b[0]["frame"], "endFrame": b[-1]["frame"], "frameCount": len(b)} for i, b in enumerate(bodies)],
              "sourcePointerContract": {"symbol": "Move_ICE_BALL", "start": start, "endExclusive": end, "byteLength": end - start},
              "sourceSymbols": {n: names[n] for n in ("Move_ICE_BALL", "Move_WEATHER_BALL", "InitIceBallAnim", "AnimThrowIceBall", "InitIceBallParticle", "AnimIceBallParticle", "AnimTask_GetIceBallCounter", "gIceBallChunkSpriteTemplate", "gIceBallImpactShardSpriteTemplate", "AnimTask_ShakeTargetBasedOnMovePowerOrDmg")},
              "topology": topology, "bodies": bodies}
    OUTPUT.write_text(json.dumps(output, separators=(",", ":")) + "\n")
    print("wrote %s: %s" % (OUTPUT, ", ".join(f"body {i + 1} {b[0]['frame']}..{b[-1]['frame']} ({len(b)})" for i, b in enumerate(bodies))))
    if not complete:
        raise RuntimeError(f"complete natural five-body Ice Ball lifecycle was not observed (bodies={len(bodies)})")


if __name__ == "__main__":
    main()
