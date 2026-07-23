#!/usr/bin/env python3
"""Turn 14 worktree probe: per-tick RAM dump for Murkrow's FLY charge-half
squash/stretch animation. Extends dump-aerialace-anim.py's own convention
(sprite slots 0-9, x/y/x2/y2/inUse/invisible/oam) with gOamMatrices (`struct
OamMatrix { s16 a,b,c,d }`, include/sprite.h) reads keyed by each active
sprite's own oam.matrixNum - the affine scale/rotate coefficients driving
the squash/stretch, per source-read `AnimFlyBallUp`/`AnimFlyBallUp_Step`
(battle_anim_flying.c): a NEW "round shadow" ball sprite
(gFlyBallUpSpriteTemplate) is created at the attacker's position and drives
the visible squash/stretch via `sAffineAnim_FlyBallUp`, while Murkrow's own
mon sprite is hidden immediately (`gSprites[...].invisible = TRUE`) the
same tick the ball sprite spawns - two different sprites, not one.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-fly-anim.py <trace.json> <output.json> <startTick> <endTick>
"""

from __future__ import annotations

import json
import hashlib
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> <startTick> <endTick>")
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
    raise SystemExit(f"could not find the harness root (oracle/emerald_core.py) above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory.json"

GSPRITES = 0x02020630
SPRITE_SIZE = 0x44
SLOTS = list(range(10))

GBATTLERSPRITEIDS = 0x020241E4
GOAMMATRICES = 0x02021BC0
OAMMATRIX_SIZE = 0x8
OBJ_VRAM0 = 0x06010000
OBJ_PLTT = 0x05000200
TILE_BYTES = 32
GSTATUSES3 = 0x020242AC
GBATTLEMONS = 0x02024084
BATTLEMON_STRIDE = 0x58
STATUS2_OFFSET = 0x50


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def s16(v: int) -> int:
        return v - 0x10000 if v & 0x8000 else v

    def read_s16(addr: int) -> int:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return s16(lo | (hi << 8))

    def read_u16(addr: int) -> int:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return lo | (hi << 8)

    def read_u32(addr: int) -> int:
        b = [oracle.read_u8(addr + i) for i in range(4)]
        return b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)

    def read_matrix(matrix_num: int) -> dict:
        base = GOAMMATRICES + matrix_num * OAMMATRIX_SIZE
        return {
            "a": read_s16(base + 0),
            "b": read_s16(base + 2),
            "c": read_s16(base + 4),
            "d": read_s16(base + 6),
        }

    def sha256_bytes(values: list[int]) -> str:
        return hashlib.sha256(bytes(values)).hexdigest()

    def sha256_words(values: list[int]) -> str:
        raw = []
        for value in values:
            raw.extend((value & 0xFF, value >> 8))
        return sha256_bytes(raw)

    def sprite_obj_transfer(attr2: int) -> dict:
        # The Fly ball is a 32x32 4bpp OBJ (16 tiles).  Capturing the
        # hardware-visible transfer separately from its affine matrix makes
        # a phase/table defect distinguishable from a graphics/palette DMA
        # defect without preserving emulator pixels.
        tile_num = attr2 & 0x3FF
        palette_num = (attr2 >> 12) & 0xF
        vram = [
            oracle.read_u8(OBJ_VRAM0 + tile_num * TILE_BYTES + i)
            for i in range(16 * TILE_BYTES)
        ]
        palette = [read_u16(OBJ_PLTT + palette_num * 32 + 2 * i) for i in range(16)]
        return {
            "vramSha256": sha256_bytes(vram),
            "paletteSha256": sha256_words(palette),
            "paletteBgr555": palette,
        }

    def record(tick: int) -> dict:
        b0 = oracle.read_u8(GBATTLERSPRITEIDS + 0)
        b1 = oracle.read_u8(GBATTLERSPRITEIDS + 1)
        row = {
            "tick": tick,
            "battler0slot": b0,
            "battler1slot": b1,
            "status3_1": read_u32(GSTATUSES3 + 4 * 1),
            "status2_1": read_u32(GBATTLEMONS + 1 * BATTLEMON_STRIDE + STATUS2_OFFSET),
        }
        for slot in SLOTS:
            base = GSPRITES + slot * SPRITE_SIZE
            attr0 = read_u16(base + 0x00)
            attr1 = read_u16(base + 0x02)
            attr2 = read_u16(base + 0x04)
            flags = read_u16(base + 0x3E)
            in_use = bool(flags & 0x1)
            matrix_num = (attr1 >> 9) & 0x1F
            entry = {
                "inUse": in_use,
                "invisible": bool(flags & 0x4),
                "x": read_s16(base + 0x20),
                "y": read_s16(base + 0x22),
                "x2": read_s16(base + 0x24),
                "y2": read_s16(base + 0x26),
                "objMode": (attr0 >> 10) & 0x3,
                "affineMode": (attr0 >> 8) & 0x3,
                "matrixNum": matrix_num,
                "tileNum": attr2 & 0x3FF,
                "paletteNum": (attr2 >> 12) & 0xF,
            }
            if in_use and (attr0 >> 8) & 0x1:  # affine (normal or double)
                entry["matrix"] = read_matrix(matrix_num)
            # Slot 3 is dynamically the Fly ball throughout this probe's
            # bounded window (the only affine double-size 32x32 OBJ).  Keep
            # its real OBJ-VRAM and palette evidence next to the OAM fields.
            if slot == 3 and in_use:
                entry["objTransfer"] = sprite_obj_transfer(attr2)
            row[f"s{slot}"] = entry
        return row

    rows = []
    tick = 0
    if START_TICK <= tick <= END_TICK:
        rows.append(record(tick))
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick < START_TICK:
                continue
            if tick > END_TICK:
                continue
            rows.append(record(tick))
            if tick >= END_TICK:
                break
        else:
            continue
        break

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, indent=0))
    print(f"wrote {OUTPUT_PATH} ({len(rows)} ticks)")


main()
