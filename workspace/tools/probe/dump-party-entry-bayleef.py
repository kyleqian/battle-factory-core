#!/usr/bin/env python3
"""Direct party-entry BAYLEEF OBJ probe for ISSUES #37.

Replays either committed party-select trace and records the live icon sprite
over a requested tick window.  The dump includes gSprites bookkeeping, its
actual OBJ-VRAM 32x32 sheet (not the source asset), and its live OBJ palette
bank.  BAYLEEF is found by its stable menu center `(104,42)`, so the result
does not assume a sprite-slot allocation.

Run with the harness mGBA interpreter:
  .../mgba-venv/bin/python tools/probe/dump-party-entry-bayleef.py \
    <trace.json> <out.json> <startTick> <endTick>
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <out.json> <startTick> <endTick>")

TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
START_TICK = int(sys.argv[3])
END_TICK = int(sys.argv[4])
HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit("could not find harness root")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
sys.path.insert(0, str(HARNESS_ROOT / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402

REF = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
OBJ_VRAM0 = 0x06010000
OBJ_PLTT = 0x05000200
SPRITE_SIZE = 0x44
TILE_BYTES = 32


def main() -> None:
    oracle = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS_ROOT / "oracle" / "bootstrap" / "factory.json")
    oracle.new_session()
    g_sprites = oracle.symbols["gSprites"]

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        v = u16(addr)
        return v - 0x10000 if v & 0x8000 else v

    def record(tick: int) -> dict:
        found = None
        for slot in range(64):
            base = g_sprites + slot * SPRITE_SIZE
            flags = u16(base + 0x3E)
            if not (flags & 1) or flags & 4:
                continue
            x, y, x2, y2 = (s16(base + off) for off in (0x20, 0x22, 0x24, 0x26))
            if (x + x2, y + y2) == (100, 42):  # BAYLEEF center plus its permanent x2=-4
                found = (slot, base, x, y, x2, y2)
                break
        if found is None:
            return {"tick": tick, "bayleef": None}
        slot, base, x, y, x2, y2 = found
        attr2 = u16(base + 4)
        tile_num = attr2 & 0x3FF
        palette_num = (attr2 >> 12) & 0xF
        vram = bytes(oracle.read_u8(OBJ_VRAM0 + tile_num * TILE_BYTES + i) for i in range(16 * TILE_BYTES))
        palette = [u16(OBJ_PLTT + palette_num * 32 + i * 2) for i in range(16)]
        return {"tick": tick, "bayleef": {
            "slot": slot, "x": x, "y": y, "x2": x2, "y2": y2,
            "animNum": oracle.read_u8(base + 0x2A),
            "animCmdIndex": oracle.read_u8(base + 0x2B),
            "animDelayCounter": oracle.read_u8(base + 0x2C) & 0x3F,
            "tileNum": tile_num, "paletteNum": palette_num,
            "vramSha256": hashlib.sha256(vram).hexdigest(),
            "vramBytes": list(vram), "paletteBgr555": palette,
        }}

    rows = []
    tick = 0
    if START_TICK == 0:
        rows.append(record(tick))
    for segment in json.loads(TRACE_PATH.read_text())["segments"]:
        for _ in range(int(segment["frames"])):
            oracle.advance(segment.get("buttons", []))
            tick += 1
            if START_TICK <= tick <= END_TICK:
                rows.append(record(tick))
            if tick >= END_TICK:
                OUTPUT_PATH.write_text(json.dumps({"trace": str(TRACE_PATH), "ticks": rows}, indent=2))
                return
    OUTPUT_PATH.write_text(json.dumps({"trace": str(TRACE_PATH), "ticks": rows}, indent=2))


main()
