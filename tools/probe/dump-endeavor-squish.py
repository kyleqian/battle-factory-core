#!/usr/bin/env python3
"""Dev-time per-tick RAM probe for ENDEAVOR's attacker squish sub-window
(docs/battle-menu-notes.md §15a's own recommendation - the second landing
attempt's blind pixel-fit found the Y axis exact but X axis off by a whole
silhouette, and BOTH remaining axis-mapping guesses failed to close it).
Rather than guess a third mapping, this reads the REAL hardware affine
matrix the squish task drives: `gSprites[attackerSlot].oam`'s own
`matrixNum` field, and `gOamMatrices[matrixNum]` (the a/b/c/d 8.8
fixed-point params `ObjAffineSet`/`RunAffineAnimFrame` actually write and
the PPU actually reads) - ground truth for what "X" and "Y" really are,
no inference needed.

The attacker sprite slot is resolved dynamically per tick rather than
hardcoded: `gBattleAnimAttacker` (u8, exported symbol) is the battler index
the running anim script's `ATTACKER` token refers to,
`gBattlerSpriteIds[gBattleAnimAttacker]` (u8[MAX_BATTLERS_COUNT], exported)
is that battler's own front sprite slot - both non-static globals, resolved
via `bin/oracle symbols` (no `nm` needed, unlike the rockslide/doubleteam
probes' file-static arrays).

`struct OamMatrix` (`include/sprite.h:244-250`) is 4x `s16` (a,b,c,d),
8 bytes/entry - `gOamMatrices[matrixNum]` is straight index arithmetic, no
deref. `oam.matrixNum` is bits 9-13 of the u16 at `Sprite+0x02` (GBA OAM
attr1: x:9, matrixNum:5, size:2 - standard packed-attribute layout, same
convention `dump-rockslide-sprites.py`'s own OAM-field offsets already
established for this run). `affineAnimBeginning`/`affineAnimEnded` (bits 3
and 5 of the flags byte at `Sprite+0x3F`) are read too, straight off the
struct (no `sAffineAnimStates` needed - that file-static array carries the
anim SCRIPT's own cmd-index/timer, not needed here since the matrix values
themselves are the ground truth being sought).

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-endeavor-squish.py <trace.json> <output.json> \
        <startTick> <endTick>

<trace.json> is any oracle trace file with a top-level "segments" array
(captureFrames is ignored).
"""

from __future__ import annotations

import json
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

# From `bin/oracle symbols gSprites gOamMatrices gBattlerSpriteIds
# gBattleAnimAttacker gBattleAnimTarget` - all exported, stable across builds.
GSPRITES = 0x02020630
SPRITE_SIZE = 0x44
GOAMMATRICES = 0x02021BC0
OAMMATRIX_SIZE = 0x08
GBATTLERSPRITEIDS = 0x020241E4
GBATTLEANIMATTACKER = 0x02038436
GBATTLEANIMTARGET = 0x02038437

SPRITE_X_OFF = 0x20
SPRITE_Y_OFF = 0x22
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_OAM_ATTR0_OFF = 0x00  # u16: y:8, affineMode:2, objMode:2, mosaic:1, bpp:1, shape:2
SPRITE_OAM_ATTR1_OFF = 0x02  # u16: x:9, matrixNum:5, size:2
SPRITE_FLAGS_HI_OFF = 0x3F  # hFlip,vFlip,animBeginning,affineAnimBeginning,animEnded,affineAnimEnded,usingSheet,anchored


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

    def record(tick: int) -> dict:
        attacker_battler = oracle.read_u8(GBATTLEANIMATTACKER)
        target_battler = oracle.read_u8(GBATTLEANIMTARGET)
        attacker_slot = oracle.read_u8(GBATTLERSPRITEIDS + attacker_battler)
        base = GSPRITES + attacker_slot * SPRITE_SIZE

        attr0 = read_u16(base + SPRITE_OAM_ATTR0_OFF)
        affine_mode = (attr0 >> 8) & 0x3
        shape = (attr0 >> 14) & 0x3

        attr1 = read_u16(base + SPRITE_OAM_ATTR1_OFF)
        matrix_num = (attr1 >> 9) & 0x1F
        size = (attr1 >> 14) & 0x3

        flags_hi = oracle.read_u8(base + SPRITE_FLAGS_HI_OFF)

        mbase = GOAMMATRICES + matrix_num * OAMMATRIX_SIZE

        return {
            "tick": tick,
            "attackerBattler": attacker_battler,
            "targetBattler": target_battler,
            "attackerSlot": attacker_slot,
            "x": read_s16(base + SPRITE_X_OFF),
            "y": read_s16(base + SPRITE_Y_OFF),
            "x2": read_s16(base + SPRITE_X2_OFF),
            "y2": read_s16(base + SPRITE_Y2_OFF),
            "matrixNum": matrix_num,
            "affineMode": affine_mode,
            "shape": shape,
            "size": size,
            "affineAnimBeginning": (flags_hi >> 3) & 1,
            "affineAnimEnded": (flags_hi >> 5) & 1,
            "matrixA": read_s16(mbase + 0),
            "matrixB": read_s16(mbase + 2),
            "matrixC": read_s16(mbase + 4),
            "matrixD": read_s16(mbase + 6),
        }

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


main()
