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
import base64
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
PLTT_RAM = 0x05000000
BG_VRAM = 0x06000000
OAM = 0x07000000
TILE_BYTES = 32

def main() -> None:
    trace = json.loads(TRACE_PATH.read_text())
    oracle = EmeraldOracle(REF / "pokeemerald.gba", REF / "pokeemerald.map", HARNESS / "oracle" / "bootstrap" / "factory.json")
    oracle.new_session()
    syms = oracle.symbols
    gs, gh, gbm, gt, gm = syms["gSprites"], syms["gHealthboxSpriteIds"], syms["gBattleMons"], syms["gTasks"], syms["gOamMatrices"]
    pltt_faded, pltt_unfaded = syms["gPlttBufferFaded"], syms["gPlttBufferUnfaded"]

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | oracle.read_u8(addr + 1) << 8
    def s16(addr: int) -> int:
        n = u16(addr)
        return n - 0x10000 if n & 0x8000 else n
    def u32(addr: int) -> int:
        return sum(oracle.read_u8(addr + i) << (8 * i) for i in range(4))
    def bytes_at(addr: int, count: int) -> bytes:
        return bytes(oracle.read_u8(addr + i) for i in range(count))
    def palette_banks(addr: int) -> list[list[int]]:
        return [[u16(addr + bank * 32 + color * 2) for color in range(16)] for bank in range(32)]
    def bg_display() -> dict:
        # The real display registers and their selected VRAM blocks are
        # sufficient to identify the field/window layers without screenshot
        # fitting.  A text BG's screen size determines its map byte length.
        controls = [u16(0x04000008 + bg * 2) for bg in range(4)]
        maps = []
        for bg, control in enumerate(controls):
            size = (control >> 14) & 3
            map_bytes = (0x800, 0x800, 0x1000, 0x2000)[size]
            char_base, screen_base = ((control >> 2) & 3), ((control >> 8) & 31)
            map_data = bytes_at(BG_VRAM + screen_base * 0x800, map_bytes)
            char_data = bytes_at(BG_VRAM + char_base * 0x4000, 0x4000)
            maps.append({"bg": bg, "control": hex(control), "charBase": char_base,
                         "screenBase": screen_base, "mapSha12": hashlib.sha256(bytes_at(BG_VRAM + screen_base * 0x800, map_bytes)).hexdigest()[:12],
                         "charSha12": hashlib.sha256(bytes_at(BG_VRAM + char_base * 0x4000, 0x4000)).hexdigest()[:12],
                         "hofs": u16(0x04000010 + bg * 4), "vofs": u16(0x04000012 + bg * 4),
                         # Raw blocks, not an image: enough to reproduce the
                         # mode-0 text layers selected by BGCNT exactly.
                         "mapB64": base64.b64encode(map_data).decode(),
                         "charB64": base64.b64encode(char_data).decode()})
        return {"dispcnt": hex(u16(0x04000000)), "bg": maps,
                "win0h": hex(u16(0x04000040)), "win1h": hex(u16(0x04000042)),
                "win0v": hex(u16(0x04000044)), "win1v": hex(u16(0x04000046)),
                "winin": hex(u16(0x04000048)), "winout": hex(u16(0x0400004a)),
                "bldcnt": hex(u16(0x04000050)), "bldalpha": hex(u16(0x04000052)), "bldy": hex(u16(0x04000054))}
    def hardware_oam() -> list[dict]:
        # gSprites is the game's future OAM model; this is the actual OAM
        # array seen by the PPU after the VBlank transfer.
        rows = []
        for index in range(128):
            a0, a1, a2 = u16(OAM + index * 8), u16(OAM + index * 8 + 2), u16(OAM + index * 8 + 4)
            if a0 & 0x0200:  # disabled affine-off sprite
                continue
            rows.append({"index": index, "a0": hex(a0), "a1": hex(a1), "a2": hex(a2),
                         "x": a1 & 0x1ff, "y": a0 & 0xff, "tile": a2 & 0x3ff,
                         "palette": a2 >> 12, "priority": (a2 >> 10) & 3})
        return rows
    def sprite(slot: int) -> dict:
        base = gs + slot * SPRITE_SIZE
        a0, a1, a2 = u16(base), u16(base + 2), u16(base + 4)
        flags, tile, pal = u16(base + 0x3e), a2 & 0x3ff, a2 >> 12
        # One 32x32 sheet is enough to identify all observed props/mons here;
        # healthbox components additionally expose their tile numbers below.
        sheet = bytes(oracle.read_u8(OBJ_VRAM + (tile + i) * TILE_BYTES + j) for i in range(16) for j in range(TILE_BYTES))
        tile0 = bytes_at(OBJ_VRAM + tile * TILE_BYTES, TILE_BYTES)
        palette = bytes(oracle.read_u8(OBJ_PLTT + pal * 32 + i) for i in range(32))
        matrix = (a1 >> 9) & 31
        return {"slot": slot, "callback": hex(u32(base + 0x1c)), "inUse": bool(flags & 1), "invisible": bool(flags & 4),
                "x": s16(base + 0x20), "y": s16(base + 0x22), "x2": s16(base + 0x24), "y2": s16(base + 0x26),
                "screen": [s16(base + 0x20) + s16(base + 0x24), s16(base + 0x22) + s16(base + 0x26)],
                "affine": (a0 >> 8) & 3, "objMode": (a0 >> 10) & 3, "matrix": matrix,
                "matrixValues": [s16(gm + matrix * 8 + off) for off in (0, 2, 4, 6)],
                "tile": tile, "palette": pal, "anim": oracle.read_u8(base + 0x2a), "animCmd": oracle.read_u8(base + 0x2b),
                # 4bpp indices of the first 8x8 tile: exact transparency
                # ownership for 8x8 status/held-item sprites (and a compact
                # identity lead for larger OAM).
                "tile0Indices": [nibble for byte in tile0 for nibble in (byte & 0xF, byte >> 4)],
                "sheetNonzeroTiles": [i for i in range(16) if any(sheet[i * TILE_BYTES:(i + 1) * TILE_BYTES])],
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
                # All 16 BG and all 16 OBJ palette banks, held as BGR555
                # words so the dump directly records hardware ownership.
                "palette": {"unfaded": palette_banks(pltt_unfaded), "faded": palette_banks(pltt_faded),
                            # Palette RAM is the PPU source.  The game-side
                            # buffers can be one transfer behind at a VBlank
                            # edge, so preserve both rather than conflating
                            # them with the displayed state.
                            "hardware": palette_banks(PLTT_RAM)},
                "display": bg_display(),
                "hardwareOam": hardware_oam(),
                # The PPU's 1D OBJ tile address space.  Storing the raw 32KiB
                # once per requested frame keeps this probe self-contained;
                # the extractor retains only OAM-referenced tiles.
                "objVramB64": base64.b64encode(bytes_at(OBJ_VRAM, 0x8000)).decode(),
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
