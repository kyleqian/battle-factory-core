#!/usr/bin/env python3
"""Pointer-bounded Scene-ON RAM/RGB receipt for legal MOVE_SPITE staging."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: spiteProbe.py <scenario> <output.json> <rgb-dir>")
SCENARIO, OUTPUT, RGB_DIR = map(Path, sys.argv[1:])
ROOT = Path(__file__).resolve().parents[2]
HARNESS = next(p for p in (ROOT, *ROOT.parents) if (p / "oracle" / "emerald_core.py").is_file())
sys.path.insert(0, str(HARNESS / "oracle"))
from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402


def main() -> None:
    request = validate_request(json.loads(SCENARIO.read_text()), "battle-scene-on")
    ref = ROOT / "reference" / "pokeemerald"
    oracle = EmeraldOracle(ref / "pokeemerald.gba", ref / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    setup = BattleLab(oracle, "battle-scene-on").prepare(request)
    sy = oracle.symbols
    nm = subprocess.run(["arm-none-eabi-nm", "-a", str(ref / "pokeemerald.elf")], check=True, capture_output=True, text=True).stdout
    names = {p[2]: int(p[0], 16) for line in nm.splitlines() if len(p := line.split()) == 3 and all(c in "0123456789abcdefABCDEF" for c in p[0])}
    start, end = names["Move_SPITE"], names["Move_MACH_PUNCH"]
    sprites, tasks = sy["gSprites"], sy["gTasks"]
    ptr, active, visual = names["sBattleAnimScriptPtr"], names["gAnimScriptActive"], sy["gAnimVisualTaskCount"]
    RGB_DIR.mkdir(parents=True, exist_ok=True)

    def u16(a: int) -> int: return oracle.read_u8(a) | oracle.read_u8(a + 1) << 8
    def s16(a: int) -> int:
        v = u16(a)
        return v - 0x10000 if v >= 0x8000 else v
    def raw(a: int, n: int) -> str: return "".join(f"{oracle.read_u8(a+i):02x}" for i in range(n))
    def task(slot: int) -> dict:
        base = tasks + slot * 0x28
        return {"slot": slot, "func": oracle.read_u32(base), "raw": raw(base, 0x28), "data": [s16(base + 8 + i * 2) for i in range(16)]}
    def sprite(slot: int) -> dict:
        base = sprites + slot * 0x44
        return {"slot": slot, "raw": raw(base, 0x44), "attr": [u16(base), u16(base+2), u16(base+4)], "x": s16(base+0x20), "y": s16(base+0x22), "x2": s16(base+0x24), "y2": s16(base+0x26), "invisible": bool(oracle.read_u8(base+0x3e) & 4)}

    rows, seen_pointers, started, done = [], [], False, False
    def capture(frame: int) -> None:
        nonlocal started, done
        if done: return
        pointer = oracle.read_u32(ptr)
        seen_pointers.append(pointer)
        in_bounds = start <= pointer < end
        if in_bounds: started = True
        if not started: return
        rgb = oracle.screen_rgb()
        (RGB_DIR / f"{frame:05d}.rgb").write_bytes(rgb)
        live_tasks = [task(i) for i in range(16) if oracle.read_u8(tasks + i * 0x28 + 4)]
        rows.append({
            "frame": frame, "sha256": hashlib.sha256(rgb).hexdigest(),
            "script": {"active": bool(oracle.read_u8(active)), "pointer": pointer, "inBounds": in_bounds},
            "visualTaskCount": oracle.read_u8(visual), "tasks": live_tasks,
            "battlers": [sprite(oracle.read_u8(sy["gBattlerSpriteIds"] + i)) for i in range(2)],
            "registers": {"dispcnt": u16(0x04000000), "bg1hofs": u16(0x04000014), "bg1vofs": u16(0x04000016), "bg2hofs": u16(0x04000018), "bg2vofs": u16(0x0400001a), "bldcnt": u16(0x04000050), "bldalpha": u16(0x04000052)},
        })
        if len(rows) > 1 and not oracle.read_u8(active) and not oracle.read_u8(visual): done = True

    frame = 0
    capture(frame)
    for segment in request["trace"]["segments"]:
        for _ in range(segment["frames"]):
            oracle.advance(segment.get("buttons", [])); frame += 1; capture(frame)
    OUTPUT.write_text(json.dumps({"schema":"spite-dense-staging/v1", "setup":setup, "sourceBounds":{"start":start,"endExclusive":end}, "seenPointers":sorted(set(seen_pointers)), "frames":rows}) + "\n")
    print(f"wrote {OUTPUT} ({len(rows)} frames; {rows[0]['frame']}..{rows[-1]['frame']})")


main()
