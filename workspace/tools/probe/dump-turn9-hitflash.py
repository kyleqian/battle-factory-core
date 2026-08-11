#!/usr/bin/env python3
"""S7 slice R rung (c3)/(c4) follow-up probe (docs/turn9-shake-notes.md §41's
own "genuine NEW discovery" of a 4-tick whole-sprite hit-flash, render
10983-10986, sitting between ep2's own end (10979) and the HP-drain sentinel
(10992)): a direct RAM read of Onix's own battler sprite (`invisible`,
`data[]`), `gDoingBattleAnim`, the healthbox hit-effect helper sprite
(`SpriteCB_HitAnimHealthoxEffect`), and `gPlttBufferFaded`'s OBJ palette bank
for Onix's own sprite - to settle whether the flash is a palette-bank
rewrite, the sprite-blink task's own tail (`DoHitAnimBlinkSpriteEffect`,
`battle_controller_player.c:1401`), or something else entirely.

`DoHitAnimBlinkSpriteEffect` (reference/pokeemerald/src/battle_controller_
player.c) toggles `gSprites[spriteId].invisible` every 4 ticks of its own
`data[1]` counter for 32 ticks total (4 on/off blocks of 4, not 3 - a
prediction this probe checks directly against ep2's own already-landed
"three 4-tick on blocks" finding), then forces `invisible=FALSE` and
completes at `data[1]==32`. If the flash coincides with a 4th on-block that
ISN'T a plain erasure, the palette read here will show why.

Identifies the healthbox-effect sprite by its `callback` field (struct
Sprite +0x1C) against `SpriteCB_HitAnimHealthoxEffect`'s own real (thumb-bit-
adjusted) address - same "search by a stable identifying field, not slot
number" convention `dump-endeavor-droplets.py`/`dump-quickattack-anim.py`
already use.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-turn9-hitflash.py <trace.json> <output.json> <startTick> <endTick>
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

GBATTLERSPRITEIDS = 0x020241E4
GHEALTHBOXSPRITEIDS = 0x03005D70
GDOINGBATTLEANIM = 0x020244B9
GPLTTBUFFERFADED = 0x02037B14

SPRITE_X_OFF = 0x20
SPRITE_Y_OFF = 0x22
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_DATA_OFF = 0x2E  # s16 data[8]
SPRITE_FLAGS_OFF = 0x3E  # inUse bit0, invisible bit2
SPRITE_CALLBACK_OFF = 0x1C
SPRITE_OAM_ATTR2_OFF = 0x04

# `nm reference/pokeemerald/pokeemerald.elf` - thumb bit (+1) added, same
# convention `dump-endeavor-droplets.py` already establishes.
SPRITE_CB_HIT_ANIM_HEALTHBOX_EFFECT = 0x08076A38 + 1

OBJ_PLTT_BYTE_OFFSET = 0x200  # OBJ_PLTT_OFFSET(0x100 u16 entries) * 2 bytes


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
        return read_u16(addr) | (read_u16(addr + 2) << 16)

    def bgr555_to_rgb8(v: int) -> list:
        r5 = v & 0x1F
        g5 = (v >> 5) & 0x1F
        b5 = (v >> 10) & 0x1F
        return [(r5 << 3) | (r5 >> 2), (g5 << 3) | (g5 >> 2), (b5 << 3) | (b5 >> 2)]

    def record(tick: int) -> dict:
        onix_slot = oracle.read_u8(GBATTLERSPRITEIDS + 0)
        onix_base = GSPRITES + onix_slot * SPRITE_SIZE
        onix_flags = read_u16(onix_base + SPRITE_FLAGS_OFF)
        onix_attr2 = read_u16(onix_base + SPRITE_OAM_ATTR2_OFF)
        onix_palette_num = (onix_attr2 >> 12) & 0xF

        healthbox_slot = oracle.read_u8(GHEALTHBOXSPRITEIDS + 0)

        hit_effect = None
        for i in range(MAX_SPRITES):
            base = GSPRITES + i * SPRITE_SIZE
            flags = oracle.read_u8(base + SPRITE_FLAGS_OFF)
            if not (flags & 1):
                continue
            cb = read_u32(base + SPRITE_CALLBACK_OFF)
            if cb != SPRITE_CB_HIT_ANIM_HEALTHBOX_EFFECT:
                continue
            hit_effect = {
                "slot": i,
                "data0": read_s16(base + SPRITE_DATA_OFF + 0),
                "data1": read_s16(base + SPRITE_DATA_OFF + 2),
                "data2": read_s16(base + SPRITE_DATA_OFF + 4),
            }
            break

        obj_pal_base = GPLTTBUFFERFADED + OBJ_PLTT_BYTE_OFFSET + onix_palette_num * 32
        obj_palette = []
        for i in range(16):
            raw = read_u16(obj_pal_base + i * 2)
            obj_palette.append({"raw": raw, "rgb": bgr555_to_rgb8(raw)})

        return {
            "tick": tick,
            "onixSlot": onix_slot,
            "onixInvisible": bool(onix_flags & 0x4),
            "onixX2": read_s16(onix_base + SPRITE_X2_OFF),
            "onixY2": read_s16(onix_base + SPRITE_Y2_OFF),
            "onixData": [read_s16(onix_base + SPRITE_DATA_OFF + 2 * i) for i in range(4)],
            "onixPaletteNum": onix_palette_num,
            "healthboxSlot": healthbox_slot,
            "doingBattleAnim": bool(oracle.read_u8(GDOINGBATTLEANIM)),
            "hitEffectSprite": hit_effect,
            "objPalette": obj_palette,
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
