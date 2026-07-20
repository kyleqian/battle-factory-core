#!/usr/bin/env python3
"""Dev-time per-tick RAM probe for ENDEAVOR's last two unmodeled
sub-mechanisms (`docs/battle-menu-notes.md` §15/§15d): the two
`AnimHitSplatBasic` sprites (`ANIM_TAG_IMPACT`, affine "pop" anim index 2)
and the two `AnimTask_ShakeTargetBasedOnMovePowerOrDmg` task instances (target
x2 offset) - S7 slice E1 hitsplat/shake increment.

Hitsplat sprites are identified by their `affineAnims` field (`struct
Sprite` +0x10) against `sAffineAnims_HitSplat`'s own real (rodata, no thumb
bit) address - NOT by `callback` (+0x1C): `AnimHitSplatBasic` reassigns
`sprite->callback = RunStoredCallbackWhenAffineAnimEnds` on its own very
first invocation (`battle_anim_normal.c:1006-1017`), so by the first tick
this probe could ever observe the sprite, the callback has already moved on
- confirmed empirically this session (a first attempt filtering on
`AnimHitSplatBasic`'s own address, like `dump-endeavor-droplets.py` filters
on `AnimFacadeSweatDrop`, found zero sprites across the whole window).
`affineAnims` is stable for the sprite's entire lifetime, unlike `callback`.

Target shake reads the target battler's OWN sprite x2/y2 directly (same
`GBATTLERSPRITEIDS`-indirection `dump-endeavor-squish-blend-ext.py` already
uses for the attacker), plus `gAnimMovePower` (RAM-exported, `bin/oracle
symbols gAnimMovePower`) every tick to settle whether ENDEAVOR's own value is
0 or a nonzero placeholder.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-endeavor-hitsplat-shake.py <trace.json> \
        <output.json> <startTick> <endTick>
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

GSPRITES = 0x02020630
SPRITE_SIZE = 0x44
MAX_SPRITES = 64
GOAMMATRICES = 0x02021BC0
OAMMATRIX_SIZE = 0x08
GBATTLERSPRITEIDS = 0x020241E4
GBATTLEANIMTARGET = 0x02038437
GANIMMOVEPOWER = 0x02038408

SPRITE_X_OFF = 0x20
SPRITE_Y_OFF = 0x22
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_AFFINE_ANIMS_OFF = 0x10
SPRITE_OAM_ATTR1_OFF = 0x02
SPRITE_FLAGS_OFF = 0x3E  # inUse bit0

# `arm-none-eabi-nm -n --defined-only reference/pokeemerald/pokeemerald.elf` -
# rodata, no thumb bit.
S_AFFINE_ANIMS_HIT_SPLAT = 0x08597348


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
        target_battler = oracle.read_u8(GBATTLEANIMTARGET)
        target_slot = oracle.read_u8(GBATTLERSPRITEIDS + target_battler)
        tbase = GSPRITES + target_slot * SPRITE_SIZE

        hitsplats = []
        for i in range(MAX_SPRITES):
            base = GSPRITES + i * SPRITE_SIZE
            flags = oracle.read_u8(base + SPRITE_FLAGS_OFF)
            if not (flags & 1):
                continue
            affine_anims = oracle.read_u32(base + SPRITE_AFFINE_ANIMS_OFF)
            if affine_anims != S_AFFINE_ANIMS_HIT_SPLAT:
                continue
            attr1 = read_u16(base + SPRITE_OAM_ATTR1_OFF)
            matrix_num = (attr1 >> 9) & 0x1F
            mbase = GOAMMATRICES + matrix_num * OAMMATRIX_SIZE
            hitsplats.append(
                {
                    "slot": i,
                    "x": read_s16(base + SPRITE_X_OFF),
                    "y": read_s16(base + SPRITE_Y_OFF),
                    "x2": read_s16(base + SPRITE_X2_OFF),
                    "y2": read_s16(base + SPRITE_Y2_OFF),
                    "matrixNum": matrix_num,
                    "matrixA": read_s16(mbase + 0),
                    "matrixD": read_s16(mbase + 6),
                }
            )

        return {
            "tick": tick,
            "animMovePower": read_u16(GANIMMOVEPOWER),
            "targetSlot": target_slot,
            "targetX2": read_s16(tbase + SPRITE_X2_OFF),
            "targetY2": read_s16(tbase + SPRITE_Y2_OFF),
            "hitsplats": hitsplats,
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
