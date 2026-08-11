#!/usr/bin/env python3
"""Open-fade Class B RAM probe (ISSUES #80): sample the player healthbox and
player back-sprite Sprite structs every frame across the party-menu OPEN fade
window of `mid-battle-switch-dense-a-off` (Battle Scene OFF).

Reads `struct Sprite` fields by SPRITE INDEX for, per tick in
[startTick, endTick] (probe ticks == oracle/compare frames: `BattleLab.prepare`
resets `oracle.frame` to 0 and the compare replays the same segments, so tick N
== frame N):

  * the player healthbox MAIN sprite   (gHealthboxSpriteIds[0], battler 0);
  * the player healthbox RIGHT sprite  (main.oam.affineParam);
  * the player healthbox HEALTHBAR     (main.data[5] == hMain_HealthBarSpriteId);
  * the player back sprite             (gBattlerSpriteIds[0]);
  * the opponent front sprite          (gBattlerSpriteIds[1], reference);
  * gPaletteFade.y / objPaletteToggle  (anchor: must match the pixel-derived
    y_bg schedule 766=(2), 768=(4), ..., 780=(16) from docs §6, proving the
    tick->frame mapping on pixel-verified frames).

Sprite layout (reference/pokeemerald/include/sprite.h):
    oam      = 0x00 (struct OamData; y:8 @0, x:9 @2 low bits, affineParam @6)
    callback = 0x1C (u32 func ptr, thumb-bit masked)
    x        = 0x20 (s16)
    y        = 0x22 (s16)
    x2       = 0x24 (s16)
    y2       = 0x26 (s16)
    animNum  = 0x2A (u8)
    animCmdIndex = 0x2B (u8)
    data     = 0x2E (s16[8]); data[5] = healthbar sprite id for the box
    flags    = 0x3E (u16; bit0 inUse, bit2 invisible)
    subpriority = 0x43 (u8)

Row coordinate spaces (both are the emulator's own `oracle.frame`): tick 0 is
the state right after prepare(); every subsequent tick is one `advance()`.

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \
        <mgba-python> tools/probe/dump-openfade-classb-sprites.py \
            <scenario.json> <output.json> <startTick> <endTick>
The scenario is tools/battle-lab/scratch-mid-battle-switch-dense-a-off.json.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(f"usage: {sys.argv[0]} <scenario.json> <out.json> <startTick> <endTick>")
SCENARIO_PATH = Path(sys.argv[1])
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

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

SPRITE_SIZE = 0x44
SPRITE_OAM_Y_OFF = 0x00
SPRITE_OAM_X_OFF = 0x02
SPRITE_OAM_ATTR1_OFF = 0x01
SPRITE_OAM_ATTR3_OFF = 0x04
SPRITE_OAM_AFFINEPARAM_OFF = 0x06
SPRITE_CALLBACK_OFF = 0x1C
SPRITE_X_OFF = 0x20
SPRITE_Y_OFF = 0x22
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_ANIM_NUM_OFF = 0x2A
SPRITE_ANIM_CMD_INDEX_OFF = 0x2B
SPRITE_DATA_OFF = 0x2E
SPRITE_FLAGS_OFF = 0x3E
SPRITE_SUBPRIORITY_OFF = 0x43

CALLBACK_SYMBOLS = {
    0x08007428: "SpriteCallbackDummy",
    0x080728B4: "SpriteCB_HealthBar",
    0x08072924: "SpriteCB_HealthBoxOther",
}


def main() -> None:
    request = validate_request(json.loads(SCENARIO_PATH.read_text()), "battle-scene-off")
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    lab = BattleLab(oracle, request["profile"])
    lab.prepare(request)

    syms = oracle.symbols
    g_sprites = syms["gSprites"]
    g_battler_sprite_ids = syms["gBattlerSpriteIds"]
    g_healthbox_sprite_ids = syms["gHealthboxSpriteIds"]
    g_palette_fade = syms["gPaletteFade"]
    g_sprite_coord_offset_y = syms["gSpriteCoordOffsetY"]

    def u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def u16(addr: int) -> int:
        return u8(addr) | (u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        v = u16(addr)
        return v - 0x10000 if v >= 0x8000 else v

    def u32(addr: int) -> int:
        return oracle.read_u32(addr)

    def sprite_fields(slot: int) -> dict | None:
        base = g_sprites + slot * SPRITE_SIZE
        if not (u16(base + SPRITE_FLAGS_OFF) & 0x1):
            return None
        callback = u32(base + SPRITE_CALLBACK_OFF) & ~1
        oam_y = u8(base + SPRITE_OAM_Y_OFF)
        oam_x = u16(base + SPRITE_OAM_X_OFF) & 0x1FF
        attr1 = u8(base + SPRITE_OAM_ATTR1_OFF)
        attr3 = u16(base + SPRITE_OAM_ATTR3_OFF)
        oam_u32_at2 = u32(base + SPRITE_OAM_X_OFF) & 0xFFFFFFFF
        return {
            "slot": slot,
            "y": s16(base + SPRITE_Y_OFF),
            "y2": s16(base + SPRITE_Y2_OFF),
            "x": s16(base + SPRITE_X_OFF),
            "x2": s16(base + SPRITE_X2_OFF),
            "oam.y": oam_y,
            "oam.x": oam_x,
            "shape": (attr1 >> 6) & 0x3,
            "size": (oam_u32_at2 >> 14) & 0x3,
            "tileNum": attr3 & 0x3FF,
            "subpriority": u8(base + SPRITE_SUBPRIORITY_OFF),
            "invisible": (u16(base + SPRITE_FLAGS_OFF) >> 2) & 1,
            "callback": hex(callback),
            "callbackSymbol": CALLBACK_SYMBOLS.get(callback, "?"),
            "animNum": u8(base + SPRITE_ANIM_NUM_OFF),
            "animCmdIndex": u8(base + SPRITE_ANIM_CMD_INDEX_OFF),
            "data": [s16(base + SPRITE_DATA_OFF + i * 2) for i in range(8)],
        }

    def record(tick: int) -> dict:
        hb_main_slot = u8(g_healthbox_sprite_ids + 0)
        hb_main = sprite_fields(hb_main_slot)
        hb_right = None
        hb_bar = None
        if hb_main is not None:
            right_slot = u16(
                g_sprites + hb_main_slot * SPRITE_SIZE + SPRITE_OAM_AFFINEPARAM_OFF
            )
            hb_right = sprite_fields(right_slot)
            bar_slot = hb_main["data"][5]
            hb_bar = sprite_fields(bar_slot)

        back_slot = u8(g_battler_sprite_ids + 0)
        opp_slot = u8(g_battler_sprite_ids + 1)

        # gPaletteFade.y (word1 bits 6..10) + objPaletteToggle (word2 bit 18)
        word1 = u32(g_palette_fade + 4)
        word2 = u32(g_palette_fade + 8)
        fade = {
            "y": (word1 >> 6) & 0x1F,
            "targetY": (word1 >> 11) & 0x1F,
            "active": (word1 >> 31) & 1,
            "objPaletteToggle": (word2 >> 18) & 1,
        }

        return {
            "tick": tick,
            "fade": fade,
            "coordOffsetY": s16(g_sprite_coord_offset_y),
            "healthboxMain": hb_main,
            "healthboxRight": hb_right,
            "healthboxBar": hb_bar,
            "backSprite": sprite_fields(back_slot),
            "opponentFront": sprite_fields(opp_slot),
        }

    rows = []
    tick = 0
    if START_TICK <= tick <= END_TICK:
        rows.append(record(tick))
    for segment in request["trace"]["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if START_TICK <= tick <= END_TICK:
                rows.append(record(tick))
            if tick > END_TICK:
                break
        if tick > END_TICK:
            break

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, separators=(",", ":")))
    print(f"wrote {OUTPUT_PATH} ({len(rows)} ticks {START_TICK}..{END_TICK})")


main()
