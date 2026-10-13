#!/usr/bin/env python3
"""tmr136 (copy of prep48Probe.py; the only change: TAIL = 12 frames are written after each body instead of 3, so a General_StatsChange body's
window reaches rel 87 and the following message's first glyph). One Scene-ON battle-lab scenario in a fresh direct mGBA process (never the shared HTTP oracles).

usage: tmr136Probe.py <scenario.json> <output.json> <rgb-dir>
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
    raise SystemExit("usage: tmr136Probe.py <scenario> <output.json> <rgb-dir>")
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

    def light() -> dict:
        return {"registers": {k: u16(a) for k, a in REGS.items()}, "battleBg": {n: s16(names[n]) for n in bg_names},
                "scanline": {"dmaDest": u32(scan + 8), "dmaControl": u32(scan + 12), "srcBuffer": u8(scan + 20), "state": u8(scan + 21)},
                "matrixBitmap": u32(names["gOamMatrixAllocBitmap"])}

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
            "battlers": [{"species": u16(mons + b * 0x58), "hp": u16(mons + b * 0x58 + 0x28), "maxHP": u16(mons + b * 0x58 + 0x2C),
                          "personality": u32(mons + b * 0x58 + 0x48), "status1": u32(mons + b * 0x58 + 0x4C)} for b in range(2)],
        }

    frames: list[dict] = []
    bodies: list[dict] = []
    frame, was_active, tail, pre = 0, False, 0, light()

    def take() -> None:
        nonlocal was_active, tail, pre
        is_active = bool(u8(active))
        if is_active and not was_active:
            ptr = u32(pointer)
            bodies.append({"index": len(bodies), "startFrame": frame, "label": label_of(ptr),
                           "attacker": u8(names["gBattleAnimAttacker"]), "target": u8(names["gBattleAnimTarget"]),
                           "moveTurn": u8(names["gAnimMoveTurn"]) if "gAnimMoveTurn" in names else None, "pre": pre, "at": state()})
        if not is_active and was_active:
            bodies[-1]["endFrame"] = frame  # first inactive frame
            tail = 12
        if is_active or tail > 0:
            rgb = oracle.screen_rgb()
            (RGB / f"{frame:05d}.rgb").write_bytes(rgb)
            frames.append({"frame": frame, "sha256": hashlib.sha256(rgb).hexdigest()})
            if not is_active:
                tail -= 1
        was_active = is_active
        if not is_active:
            pre = light()

    take()
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", []))
            frame += 1
            take()
    OUTPUT.write_text(json.dumps({"schema": "tmr136-probe/v1", "scenario": SCENARIO.name, "frameCount": frame,
                                  "bodies": bodies, "frames": frames}, separators=(",", ":")))


main()
