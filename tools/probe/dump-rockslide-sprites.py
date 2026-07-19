#!/usr/bin/env python3
"""Dev-time per-tick RAM probe for ROCK_SLIDE's falling-rock/shake sprites
plus the generic hit-flash (docs/battle-move-anim-notes.md §9 - the v5
rock-spawn-cadence/hit-flash gap §8's last paragraph flagged).

Identifies rock/shake sprites by their `template` pointer field
(`struct Sprite` +0x14, sizeof(struct Sprite)=0x44 - see
dump-task-and-sprite-callbacks.py's header) rather than by callback, since
both `AnimFallingRock`/`AnimFallingRock_Step` immediately hand off to the
shared `TranslateSpriteInEllipse` callback (src/battle_anim_rock.c:297-318) -
the callback pointer alone can't distinguish a rock from any other sprite
using the same generic ellipse-translation helper. `gFallingRockSpriteTemplate`
and `gShakeMonOrPlatformSpriteTemplate` are both non-static globals (`bin/
oracle symbols gFallingRockSpriteTemplate gShakeMonOrPlatformSpriteTemplate`),
so their addresses are stable across builds and don't need nm resolution.

The opponent-side generic hit-flash mon-blink (`DoHitAnimBlinkSpriteEffect`,
src/battle_controller_opponent.c:440-455) is installed into
`gBattlerControllerFuncs[battler]` (a global array, `bin/oracle symbols
gBattlerControllerFuncs`), not a sprite callback - read that pointer
directly for the target battler instead of a sprite scan. The healthbox
wobble half (`SpriteCB_HitAnimHealthoxEffect`, src/pokeball.c:1294) IS a
sprite callback and non-ambiguous (only one compiled instance, unlike
`DoHitAnimBlinkSpriteEffect` which is duplicated per battle-controller
file) - its address is hardcoded below from a one-time
`arm-none-eabi-nm -n --defined-only reference/pokeemerald/pokeemerald.elf`
dump (thumb bit added: nm reports the even function address, the runtime
pointer value has bit 0 set for Thumb code).

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-rockslide-sprites.py <trace.json> <output.json> \
        <startTick> <endTick> [targetBattler]

<trace.json> is any oracle trace file with a top-level "segments" array
(captureFrames is ignored). targetBattler defaults to 1 (Grovyle, the
opponent's active battler in battle1-turn1.json).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (5, 6):
    raise SystemExit(
        f"usage: {sys.argv[0]} <trace.json> <output.json> <startTick> <endTick> [targetBattler]"
    )
TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
START_TICK = int(sys.argv[3])
END_TICK = int(sys.argv[4])
TARGET_BATTLER = int(sys.argv[5]) if len(sys.argv) == 6 else 1

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
SPRITE_CALLBACK_OFF = 0x1C
SPRITE_ANIMNUM_OFF = 0x2A
SPRITE_DATA_OFF = 0x2E  # s16 data[8]
SPRITE_FLAGS_OFF = 0x3E  # inUse bit0, invisible bit2

# From `bin/oracle symbols gFallingRockSpriteTemplate gShakeMonOrPlatformSpriteTemplate`.
ROCK_TEMPLATE = 0x08596B04
SHAKE_TEMPLATE = 0x085972D8

GBATTLERCONTROLLERFUNCS = 0x03005D60

# From `bin/oracle symbols gBattlerSpriteIds` - u8[MAX_BATTLERS_COUNT], the
# target battler's own mon sprite slot (to read its `invisible` bit directly,
# a stronger signal than `gBattlerControllerFuncs` for the blink's actual
# per-tick toggle schedule).
GBATTLERSPRITEIDS = 0x020241E4

# From `bin/oracle symbols gHealthboxSpriteIds` - u8[MAX_BATTLERS_COUNT]. The
# scratch sprite `SpriteCB_HitAnimHealthoxEffect` runs on is itself always
# invisible with y2=0 (src/pokeball.c:1284-1306) - it writes the wobble onto
# `gSprites[gHealthboxSpriteIds[battler]].y2`, the REAL healthbox sprite, so
# read that one directly instead.
GHEALTHBOXSPRITEIDS = 0x03005D70

# `arm-none-eabi-nm -n --defined-only reference/pokeemerald/pokeemerald.elf`,
# thumb bit (+1) added - the one and only SpriteCB_HitAnimHealthoxEffect.
HEALTHBOX_WOBBLE_CB = 0x08076A38 + 1

# All 8 `DoHitAnimBlinkSpriteEffect` instances (one per battle-controller
# file - static, so nm can't tell which is battle_controller_opponent.c's;
# match against the whole set instead), thumb bit added.
BLINK_CB_CANDIDATES = {
    a + 1
    for a in (
        0x08059958, 0x0805FB94, 0x08064CE4, 0x0814B464,
        0x081689A4, 0x08186E28, 0x0818A238, 0x081BB8B0,
    )
}


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

    def record(tick: int) -> dict:
        rocks = []
        shakes = []
        for i in range(MAX_SPRITES):
            base = GSPRITES + i * SPRITE_SIZE
            flags = oracle.read_u8(base + SPRITE_FLAGS_OFF)
            in_use = flags & 1
            if not in_use:
                continue
            template = oracle.read_u32(base + SPRITE_TEMPLATE_OFF)
            if template not in (ROCK_TEMPLATE, SHAKE_TEMPLATE):
                continue
            entry = {
                "slot": i,
                "x": read_s16(base + SPRITE_X_OFF),
                "y": read_s16(base + SPRITE_Y_OFF),
                "x2": read_s16(base + SPRITE_X2_OFF),
                "y2": read_s16(base + SPRITE_Y2_OFF),
                "animNum": oracle.read_u8(base + SPRITE_ANIMNUM_OFF),
                "invisible": (flags >> 2) & 1,
                "callback": oracle.read_u32(base + SPRITE_CALLBACK_OFF),
                "data": [read_s16(base + SPRITE_DATA_OFF + 2 * j) for j in range(8)],
            }
            (rocks if template == ROCK_TEMPLATE else shakes).append(entry)

        blink_cb = oracle.read_u32(GBATTLERCONTROLLERFUNCS + TARGET_BATTLER * 4)
        healthbox_wobble_active = any(
            oracle.read_u32(GSPRITES + i * SPRITE_SIZE + SPRITE_CALLBACK_OFF) == HEALTHBOX_WOBBLE_CB
            and oracle.read_u8(GSPRITES + i * SPRITE_SIZE + SPRITE_FLAGS_OFF) & 1
            for i in range(MAX_SPRITES)
        )
        healthbox_sprite_id = oracle.read_u8(GHEALTHBOXSPRITEIDS + TARGET_BATTLER)
        healthbox_y2 = read_s16(GSPRITES + healthbox_sprite_id * SPRITE_SIZE + SPRITE_Y2_OFF)

        target_sprite_id = oracle.read_u8(GBATTLERSPRITEIDS + TARGET_BATTLER)
        target_base = GSPRITES + target_sprite_id * SPRITE_SIZE
        target_invisible = (oracle.read_u8(target_base + SPRITE_FLAGS_OFF) >> 2) & 1

        return {
            "tick": tick,
            "rocks": rocks,
            "shakes": shakes,
            "blinkActive": blink_cb in BLINK_CB_CANDIDATES,
            "healthboxWobbleActive": healthbox_wobble_active,
            "healthboxY2": healthbox_y2,
            "targetInvisible": target_invisible,
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

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, indent=0))


main()
