#!/usr/bin/env python3
"""RAM/OAM/VRAM evidence for ISSUES #37's post-SEND-OUT path.

Replay the canonical turn-15 trace and emit one compact row per requested
frame.  This intentionally scans all live sprites instead of assuming slots:
the player trainer, ball/open particles, MAGBY, and healthbox all reuse
allocation slots during this short window.  Each sprite row includes OAM
identity/position, callback, live OBJ-sheet hash and live OBJ-palette hash;
the healthbox tuple is resolved through gHealthboxSpriteIds[0].

Usage (the mGBA interpreter is required):
  .../mgba-venv/bin/python tools/probe/dump-turn15-sendout.py \
    tools/compare/traces-groundtruth/battle1-turn15-dense.json \
    /tmp/turn15-sendout.json 20245 20560
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <out.json> <startTick> <endTick>")

TRACE_PATH, OUTPUT_PATH = Path(sys.argv[1]), Path(sys.argv[2])
START_TICK, END_TICK = int(sys.argv[3]), int(sys.argv[4])
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent

def harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit("could not locate harness oracle")

HARNESS = harness_root(ROOT)
sys.path.insert(0, str(HARNESS / "oracle"))
from emerald_core import EmeraldOracle  # noqa: E402

REF = (ROOT / "reference" / "pokeemerald").resolve()
SPRITE_SIZE, TASK_SIZE = 0x44, 0x28
OBJ_VRAM, OBJ_PLTT = 0x06010000, 0x05000200
TILE_BYTES = 32

def main() -> None:
    trace = json.loads(TRACE_PATH.read_text())
    oracle = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    oracle.new_session()
    syms = oracle.symbols
    gs, gh, gbm, gt, gm = syms["gSprites"], syms["gHealthboxSpriteIds"], syms["gBattleMons"], syms["gTasks"], syms["gOamMatrices"]

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | oracle.read_u8(addr + 1) << 8
    def s16(addr: int) -> int:
        n = u16(addr)
        return n - 0x10000 if n & 0x8000 else n
    def u32(addr: int) -> int:
        return sum(oracle.read_u8(addr + i) << (8 * i) for i in range(4))
    def sprite(slot: int) -> dict:
        base = gs + slot * SPRITE_SIZE
        a0, a1, a2 = u16(base), u16(base + 2), u16(base + 4)
        flags, tile, pal = u16(base + 0x3e), a2 & 0x3ff, a2 >> 12
        # One 32x32 sheet is enough to identify all observed props/mons here;
        # healthbox components additionally expose their tile numbers below.
        sheet = bytes(oracle.read_u8(OBJ_VRAM + (tile + i) * TILE_BYTES + j) for i in range(16) for j in range(TILE_BYTES))
        palette = bytes(oracle.read_u8(OBJ_PLTT + pal * 32 + i) for i in range(32))
        matrix = (a1 >> 9) & 31
        return {"slot": slot, "callback": hex(u32(base + 0x1c)), "inUse": bool(flags & 1), "invisible": bool(flags & 4),
                "x": s16(base + 0x20), "y": s16(base + 0x22), "x2": s16(base + 0x24), "y2": s16(base + 0x26),
                "screen": [s16(base + 0x20) + s16(base + 0x24), s16(base + 0x22) + s16(base + 0x26)],
                "affine": (a0 >> 8) & 3, "objMode": (a0 >> 10) & 3, "matrix": matrix,
                "matrixValues": [s16(gm + matrix * 8 + off) for off in (0, 2, 4, 6)],
                "tile": tile, "palette": pal, "anim": oracle.read_u8(base + 0x2a), "animCmd": oracle.read_u8(base + 0x2b),
                "data": [s16(base + 0x2e + 2 * i) for i in range(8)],
                "vramSha12": hashlib.sha256(sheet).hexdigest()[:12], "paletteSha12": hashlib.sha256(palette).hexdigest()[:12]}
    def row(tick: int) -> dict:
        live = [sprite(i) for i in range(64) if u16(gs + i * SPRITE_SIZE + 0x3e) & 1]
        hb = oracle.read_u8(gh)
        hb_left = sprite(hb)
        # The left component's OAM affineParam field stores its paired right
        # component; data[5] stores the HP-bar component (battle_interface.c).
        right, bar = u16(gs + hb * SPRITE_SIZE + 6) & 0xff, hb_left["data"][5] & 0xff
        return {"tick": tick, "controllerExec": hex(u32(syms["gBattleControllerExecFlags"])),
                "battler0": {"species": u16(gbm), "hp": u16(gbm + 0x28), "maxHp": u16(gbm + 0x2c), "movePp": [oracle.read_u8(gbm + 0x24 + i) for i in range(4)]},
                "moveCursor": oracle.read_u8(syms["gMoveSelectionCursor"]), "healthbox": {"left": hb, "right": right, "bar": bar, "sprites": [hb_left, sprite(right), sprite(bar)]},
                "tasks": [{"slot": i, "func": hex(u32(gt + i * TASK_SIZE)), "active": oracle.read_u8(gt + i * TASK_SIZE + 4)} for i in range(16) if oracle.read_u8(gt + i * TASK_SIZE + 4)],
                "live": live}

    out, tick = [], 0
    for seg in trace["segments"]:
        for _ in range(seg["frames"]):
            oracle.advance(seg.get("buttons", [])); tick += 1
            if START_TICK <= tick <= END_TICK:
                out.append(row(tick))
            if tick >= END_TICK:
                OUTPUT_PATH.write_text(json.dumps({"trace": str(TRACE_PATH), "ticks": out}, indent=0))
                return
    OUTPUT_PATH.write_text(json.dumps({"trace": str(TRACE_PATH), "ticks": out}, indent=0))

main()
