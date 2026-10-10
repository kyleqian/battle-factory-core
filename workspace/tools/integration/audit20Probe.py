#!/usr/bin/env python3
"""audit20Probe.py = audit19Probe.py + per body `furyCutter` (gDisableStructs[attacker].furyCutterCounter, offset 16: the kernel's 7th
Fury Cutter MOVE_ANIMATION argument), `inUseAt` (the 64 gSprites inUse flags on the activation frame, a hex bitmap), `inUsePre` (the
same on the frame before) and `creates` ([age, slot] for every slot that becomes inUse during the body, age 0 = the activation frame,
ascending slots within a frame: CreateSprite takes the first free index), and in `pre` (the frame before activation) the inUse
bitmap, sSpritePaletteTags and the tile range tag / alloc bitmap digests: the ROM's allocator state and allocation sequence an
allocator consumer (liveMoveSpriteAllocator.ts wall + sparkles) is compared with.
audit19Probe.py = audit18Probe.py + per body `power` (RAM gAnimMovePower at activation: Magnitude's > 99 key, Ice Ball's power),
`rollout` (gDisableStructs[attacker].rolloutTimerStartValue - rolloutTimer: the Ice Ball counter 1..5), `endOrder` (sSpriteOrder on the
first inactive frame), `labelOffset` (script pointer - its label: a weather move's continues script is a later
offset of the move's label), `animArg1` (gBattleScripting.animArg1: the STATS_CHANGE argument), and `turns` (each gBattleResults.battleTurnCounter change: frame, the player's status2 = the orchestrator's
playerLocked input STATUS2_MULTIPLETURNS 0x1000 | STATUS2_RECHARGE 0x400000, sSpriteOrder)). audit18Probe.py = prep48Probe.py + `rng2` (RAM gRng2Value on the activation frame, the pinned presentation-RNG
value the Random2 consumers and the Dive words need: prep65Words.ts / liveAdapterFramebuffer.ts presentationRngActivation), `turnCounter` (gBattleResults.battleTurnCounter: the turn a body belongs to) and both battlers'
`status2` in `at`.
prep48: one Scene-ON battle-lab scenario in a fresh direct mGBA process (never the shared HTTP oracles).

usage: audit18Probe.py <scenario.json> <output.json> <rgb-dir>
Records every battle-animation body (gAnimScriptActive rising edge .. first inactive frame): its script label (the nearest preceding
Move_/General_/Status_/Special_ symbol of the script pointer at activation), attacker / target, and the LATER-BODY history state the
first-body gates protect, read from RAM on the frame before activation (`pre`: registers, BG scroll, scanline header, matrix bitmap) and in full on the
activation frame (`at`): the IO BG / window /
blend registers, gBattle_BG*_X/Y, gScanlineEffect + both 320-word gScanlineEffectRegBuffers banks, sSpriteOrder, gOamMatrixAllocBitmap,
the sprite palette / tile tags + tile bitmap, live task callbacks, BG map screenblock digests, both battler sprites' x / y / x2 / y2 / invisible, both battlers' HP /
personality.
Raw RGB888 frames (`%05d.rgb`) are written for every active frame plus 3 after each body (the dense windows), with their sha256 in
`frames` (the liveAdapterFramebuffer.ts probe contract). Frame 0 = after BattleLab.prepare, frame n = after n trace frames.
"""
from __future__ import annotations

import bisect
import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: audit20Probe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(path for path in (ROOT, *ROOT.parents) if (path / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

REGS = {"dispcnt": 0x04000000, "bg0cnt": 0x04000008, "bg1cnt": 0x0400000A, "bg2cnt": 0x0400000C, "bg3cnt": 0x0400000E,
        "bg1hofs": 0x04000014, "bg1vofs": 0x04000016, "bg2hofs": 0x04000018, "bg2vofs": 0x0400001A,
        "win0h": 0x04000040, "win0v": 0x04000044, "winin": 0x04000048, "winout": 0x0400004A,
        "bldcnt": 0x04000050, "bldalpha": 0x04000052, "bldy": 0x04000054}


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = (ROOT / "reference/pokeemerald").resolve()
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle/bootstrap/factory.json")
    lab = BattleLab(oracle, "battle-scene-on")
    lab.prepare(request)
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    pairs = [(int(p[0], 16), p[2]) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])]
    names = {name: address for address, name in pairs}
    by_address = {address: name for address, name in pairs}
    labels = sorted((a, n) for a, n in pairs if n.startswith(("Move_", "General_", "Status_", "Special_")))
    label_addr = [a for a, _ in labels]
    sy = oracle.symbols
    RGB.mkdir(parents=True, exist_ok=True)
    u8, u16, u32 = oracle.read_u8, oracle.read_u16, oracle.read_u32
    s16 = lambda a: (lambda v: v - 0x10000 if v >= 0x8000 else v)(u16(a))
    raw = lambda a, n: bytes(u8(a + i) for i in range(n))
    sha = lambda b: hashlib.sha256(b).hexdigest()[:16]
    active, pointer = names["gAnimScriptActive"], names["sBattleAnimScriptPtr"]
    scan, scanbuf = sy["gScanlineEffect"], sy["gScanlineEffectRegBuffers"]
    mons = sy["gBattleMons"]
    bg_names = [n for n in ("gBattle_BG1_X", "gBattle_BG1_Y", "gBattle_BG2_X", "gBattle_BG2_Y", "gBattle_BG3_X", "gBattle_BG3_Y") if n in names]

    def label_of(ptr: int) -> str | None:
        i = bisect.bisect_right(label_addr, ptr) - 1
        return labels[i][1] if i >= 0 else None

    sprites = sy["gSprites"]
    in_use = lambda: [u8(sprites + i * 0x44 + 0x3E) & 1 for i in range(64)]
    bits = lambda f: format(sum(v << i for i, v in enumerate(f)), "016x")

    def light() -> dict:
        return {"registers": {k: u16(a) for k, a in REGS.items()}, "battleBg": {n: s16(names[n]) for n in bg_names},
                "scanline": {"dmaDest": u32(scan + 8), "dmaControl": u32(scan + 12), "srcBuffer": u8(scan + 20), "state": u8(scan + 21)},
                "matrixBitmap": u32(names["gOamMatrixAllocBitmap"]),
                # audit 20: the ROM allocator state on the frame before activation (sprite slots, OAM matrices, palette tags, tiles)
                # (sSpriteTileRangeTags is 0x80 bytes; state()'s 256-byte digest also covers sSpriteTileRanges' stale start / count words)
                "inUse": bits(in_use()), "paletteTags": [u16(names["sSpritePaletteTags"] + i * 2) for i in range(16)],
                "tileTagsSha": sha(raw(names["sSpriteTileRangeTags"], 0x80)), "tileBitmapSha": sha(raw(names["sSpriteTileAllocBitmap"], 0x80))}

    def state() -> dict:
        tasks = names["gTasks"] if "gTasks" in names else sy["gTasks"]
        return {
            "registers": {k: u16(a) for k, a in REGS.items()},
            "battleBg": {n: s16(names[n]) for n in bg_names},
            "scanline": {"dmaDest": u32(scan + 8), "dmaControl": u32(scan + 12), "srcBuffer": u8(scan + 20), "state": u8(scan + 21),
                         "banks": [[s16(scanbuf + b * 0x780 + i * 2) for i in range(320)] for b in range(2)]},
            "spriteOrder": list(raw(names["sSpriteOrder"], 64)),
            "matrixBitmap": u32(names["gOamMatrixAllocBitmap"]),
            "paletteTags": [u16(names["sSpritePaletteTags"] + i * 2) for i in range(16)],
            "tileTagsSha": sha(raw(names["sSpriteTileRangeTags"], 256)), "tileBitmapSha": sha(raw(names["sSpriteTileAllocBitmap"], 128)),
            "tasks": [by_address.get(u32(tasks + s * 0x28) & ~1, hex(u32(tasks + s * 0x28))) for s in range(16) if u8(tasks + s * 0x28 + 4)],
            "bgMapSha": {str(sb): sha(raw(0x06000000 + sb * 0x800, 0x800)) for sb in (26, 27, 28, 29, 30, 31)},
            "battlerSprites": [{"slot": (sid := u8(names["gBattlerSpriteIds"] + b)), "x": s16(sy["gSprites"] + sid * 0x44 + 0x20),
                                "y": s16(sy["gSprites"] + sid * 0x44 + 0x22), "x2": s16(sy["gSprites"] + sid * 0x44 + 0x24),
                                "y2": s16(sy["gSprites"] + sid * 0x44 + 0x26), "invisible": bool(u8(sy["gSprites"] + sid * 0x44 + 0x3E) & 4)}
                               for b in range(2)],
            "rng2": u32(names["gRng2Value"]),
            "turnCounter": u8(names["gBattleResults"] + 0x13),  # gBattleResults.battleTurnCounter (BattleTurnPassed, after the end-turn effects)
            "status2": [u32(mons + b * 0x58 + 0x50) for b in range(2)],
            "battlers": [{"species": u16(mons + b * 0x58), "hp": u16(mons + b * 0x58 + 0x28), "maxHP": u16(mons + b * 0x58 + 0x2C),
                          "personality": u32(mons + b * 0x58 + 0x48), "status1": u32(mons + b * 0x58 + 0x4C)} for b in range(2)],
        }

    frames: list[dict] = []
    bodies: list[dict] = []
    turns: list[dict] = []
    frame, was_active, tail, pre = 0, False, 0, light()
    prev_use = in_use()

    def take() -> None:
        nonlocal was_active, tail, pre, prev_use
        is_active = bool(u8(active))
        use = in_use()
        if is_active and not was_active:
            ptr = u32(pointer)
            bodies.append({"index": len(bodies), "startFrame": frame, "label": label_of(ptr),
                           "attacker": u8(names["gBattleAnimAttacker"]), "target": u8(names["gBattleAnimTarget"]),
                           "moveTurn": u8(names["gAnimMoveTurn"]) if "gAnimMoveTurn" in names else None,
                           "power": u16(names["gAnimMovePower"]), "labelOffset": ptr - names[label_of(ptr)] if label_of(ptr) else None,
                           "animArg1": u8(sy["gBattleScripting"] + 16) if "gBattleScripting" in sy else u8(names["gBattleScripting"] + 16),
                           "rollout": (lambda r: (r >> 4) - (r & 15))(u8(names["gDisableStructs"] + u8(names["gBattleAnimAttacker"]) * 0x1C + 17)),
                           "furyCutter": u8(names["gDisableStructs"] + u8(names["gBattleAnimAttacker"]) * 0x1C + 16),
                           "inUsePre": bits(prev_use), "inUseAt": bits(use), "creates": [[0, i] for i in range(64) if use[i] and not prev_use[i]],
                           "pre": pre, "at": state()})
        if is_active and was_active:
            bodies[-1]["creates"] += [[frame - bodies[-1]["startFrame"], i] for i in range(64) if use[i] and not prev_use[i]]
        if not is_active and was_active:
            bodies[-1]["endFrame"] = frame  # first inactive frame
            bodies[-1]["endOrder"] = list(raw(names["sSpriteOrder"], 64))
            tail = 3
        if is_active or tail > 0:
            rgb = oracle.screen_rgb()
            (RGB / f"{frame:05d}.rgb").write_bytes(rgb)
            frames.append({"frame": frame, "sha256": hashlib.sha256(rgb).hexdigest()})
            if not is_active:
                tail -= 1
        was_active = is_active
        tc = u8(names["gBattleResults"] + 0x13)
        if not turns or turns[-1]["turnCounter"] != tc:
            turns.append({"frame": frame, "turnCounter": tc, "playerStatus2": u32(mons + 0x50), "spriteOrder": list(raw(names["sSpriteOrder"], 64))})
        if not is_active:
            pre = light()
        prev_use = use

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            take()
    OUTPUT.write_text(json.dumps({"schema": "audit20-probe/v1", "scenario": SCENARIO.name, "frameCount": frame,
                                  "bodies": bodies, "turns": turns, "frames": frames}, separators=(",", ":")))


main()
