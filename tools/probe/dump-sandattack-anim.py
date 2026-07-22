#!/usr/bin/env python3
"""Worktree-lane groundwork (docs/turn13-notes.md "Honest gaps"): per-tick
RAM dump for SAND_ATTACK's own anim window (`Move_SAND_ATTACK`,
reference/pokeemerald/data/battle_anim_scripts.s:5192-5218). Identifies the
6x `SandAttackDirt`-spawned dirt sprites (30 total, `gSandAttackDirtSpriteTemplate`,
callback `AnimDirtScatter`, battle_anim_ground.c) and the attacker's own
2 `SlideMon*` helper sprites (`gSlideMonToOffsetSpriteTemplate`/
`gSlideMonToOriginalPosSpriteTemplate`, battle_anim_mon_movement.c) by their
`template` pointer field (struct Sprite +0x14), same convention as
dump-rockslide-sprites.py's own header explains. Also reads the attacker's
own REAL mon sprite (via `gBattlerSpriteIds[gBattleAnimAttacker]`) for its
visible x2/y2 offset (the two `SlideMon*` sprites are themselves always
invisible scratch sprites - the real motion lands on the mon sprite they
drive), and `gAnimVisualTaskCount` (the `waitforvisualfinish`/`end` gate -
`Cmd_createsprite`/`Cmd_createvisualtask` increment it, `DestroyAnimSprite`/
`DestroyAnimVisualTask`-family decrement it, src/battle_anim.c).

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-sandattack-anim.py <trace.json> <output.json> <startTick> <endTick>
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

SPRITE_X_OFF = 0x20
SPRITE_Y_OFF = 0x22
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_TEMPLATE_OFF = 0x14
SPRITE_ANIMNUM_OFF = 0x2A
SPRITE_DATA_OFF = 0x2E  # s16 data[8]
SPRITE_FLAGS_OFF = 0x3E  # inUse bit0, invisible bit2

# From `bin/oracle symbols gSandAttackDirtSpriteTemplate
# gSlideMonToOffsetSpriteTemplate gSlideMonToOriginalPosSpriteTemplate`
# (data labels, no thumb-bit adjustment needed - see dump-rockslide-
# sprites.py's own header).
DIRT_TEMPLATE = 0x085971A8
SLIDE_OFFSET_TEMPLATE = 0x0857FE70
SLIDE_ORIGPOS_TEMPLATE = 0x0857FE58

GBATTLERSPRITEIDS = 0x020241E4
GBATTLEANIMATTACKER = 0x02038436
GBATTLEANIMTARGET = 0x02038437
GANIMVISUALTASKCOUNT = 0x020383FE

BLDCNT = 0x04000050
BLDALPHA = 0x04000052


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

    def sprite_entry(slot: int) -> dict:
        base = GSPRITES + slot * SPRITE_SIZE
        flags = oracle.read_u8(base + SPRITE_FLAGS_OFF)
        return {
            "slot": slot,
            "x": read_s16(base + SPRITE_X_OFF),
            "y": read_s16(base + SPRITE_Y_OFF),
            "x2": read_s16(base + SPRITE_X2_OFF),
            "y2": read_s16(base + SPRITE_Y2_OFF),
            "animNum": oracle.read_u8(base + SPRITE_ANIMNUM_OFF),
            "invisible": (flags >> 2) & 1,
            "data": [read_s16(base + SPRITE_DATA_OFF + 2 * j) for j in range(8)],
        }

    def record(tick: int) -> dict:
        dirts = []
        slideOffsets = []
        slideOrigPos = []
        for i in range(MAX_SPRITES):
            base = GSPRITES + i * SPRITE_SIZE
            flags = oracle.read_u8(base + SPRITE_FLAGS_OFF)
            if not (flags & 1):
                continue
            template = oracle.read_u32(base + SPRITE_TEMPLATE_OFF)
            if template == DIRT_TEMPLATE:
                dirts.append(sprite_entry(i))
            elif template == SLIDE_OFFSET_TEMPLATE:
                slideOffsets.append(sprite_entry(i))
            elif template == SLIDE_ORIGPOS_TEMPLATE:
                slideOrigPos.append(sprite_entry(i))

        attackerBattler = oracle.read_u8(GBATTLEANIMATTACKER)
        targetBattler = oracle.read_u8(GBATTLEANIMTARGET)
        attackerSlot = oracle.read_u8(GBATTLERSPRITEIDS + attackerBattler)
        targetSlot = oracle.read_u8(GBATTLERSPRITEIDS + targetBattler)

        return {
            "tick": tick,
            "animVisualTaskCount": oracle.read_u8(GANIMVISUALTASKCOUNT),
            "attackerBattler": attackerBattler,
            "targetBattler": targetBattler,
            "attacker": sprite_entry(attackerSlot),
            "target": sprite_entry(targetSlot),
            "dirts": dirts,
            "slideOffsets": slideOffsets,
            "slideOrigPos": slideOrigPos,
            "bldcnt": read_u16(BLDCNT),
            "bldalpha": read_u16(BLDALPHA),
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
    print(f"wrote {OUTPUT_PATH} ({len(rows)} ticks)")


main()
