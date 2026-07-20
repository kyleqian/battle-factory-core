#!/usr/bin/env python3
"""Dev-time per-tick RAM probe for DRAGON_BREATH's animation mechanisms
(docs/dragon-breath-notes.md "Engine slice E2a" - priorities 3-5): the 8
fire-projectile sprites' per-tick x/y/x2/y2/affine-matrix state, the
target's red-fade palette blend (`AnimTask_BlendBattleAnimPal`), the
target's x2/y2 (`AnimTask_ShakeMon2`), and the hit-flash sprite
(`SpriteCB_HitAnimHealthoxEffect`) - S7 slice E2a-2.

Fire-projectile sprites are identified by `affineAnims` (`struct Sprite`
+0x10, a data pointer - no thumb bit) against `sAffineAnims_DragonBreathFire`'s
own real rodata address, same convention `dump-endeavor-hitsplat-shake.py`
already uses for hitsplat sprites (NOT `callback`, which reassigns itself
mid-lifetime: `AnimDragonFireToTarget` -> `StartAnimLinearTranslation` (one
tick) -> `AnimTranslateLinear_WithFollowup` for the rest of its life).

Hit-flash sprite is identified by `callback` (a code pointer - thumb bit
masked) against `SpriteCB_HitAnimHealthoxEffect`'s own real address, since
`pokeball.c`'s effect doesn't reassign its own callback (a single self-
looping function) and has no other stable identifying field checked here.

Target's OBJ palette read directly from `gPlttBufferFaded`/`Unfaded` (same
`PLTT_ID`/paletteNum indirection `dump-endeavor-squish-blend-ext.py` already
uses for the attacker) to solve `AnimTask_BlendBattleAnimPal`'s real
per-tick coeff from RAM instead of pixel-solving.

Addresses (`arm-none-eabi-nm -n --defined-only reference/pokeemerald/
pokeemerald.elf`, this run's pinned reference build):
  sAffineAnims_DragonBreathFire = 0x08596eec (rodata, no thumb bit)
  SpriteCB_HitAnimHealthoxEffect = 0x08076a38 (code, thumb bit set at runtime)

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-dragonbreath-anim.py <trace.json> \
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
GPLTTBUFFERFADED = 0x02037B14
GPLTTBUFFERUNFADED = 0x02037714

SPRITE_X_OFF = 0x20
SPRITE_Y_OFF = 0x22
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_AFFINE_ANIMS_OFF = 0x10
SPRITE_CALLBACK_OFF = 0x1C
SPRITE_ANIM_NUM_OFF = 0x2A
SPRITE_ANIM_CMD_INDEX_OFF = 0x2B
SPRITE_OAM_ATTR1_OFF = 0x02
SPRITE_OAM_ATTR2_OFF = 0x04
SPRITE_FLAGS_OFF = 0x3E  # inUse:1, coordOffsetEnabled:1, invisible:1, ...
SPRITE_SUBPRIORITY_OFF = 0x43

S_AFFINE_ANIMS_DRAGON_BREATH_FIRE = 0x08596EEC
SPRITECB_HIT_ANIM_HEALTHBOX_EFFECT = 0x08076A38


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

    def read_palette(pal_base: int) -> list[int]:
        return [read_u16(pal_base + 2 * i) for i in range(16)]

    def record(tick: int) -> dict:
        target_battler = oracle.read_u8(GBATTLEANIMTARGET)
        target_slot = oracle.read_u8(GBATTLERSPRITEIDS + target_battler)
        tbase = GSPRITES + target_slot * SPRITE_SIZE
        t_attr2 = read_u16(tbase + SPRITE_OAM_ATTR2_OFF)
        t_palette_num = (t_attr2 >> 12) & 0xF
        t_pal_faded = GPLTTBUFFERFADED + (0x100 + t_palette_num * 16) * 2
        t_pal_unfaded = GPLTTBUFFERUNFADED + (0x100 + t_palette_num * 16) * 2

        fire_sprites = []
        hitflash_sprites = []
        for i in range(MAX_SPRITES):
            base = GSPRITES + i * SPRITE_SIZE
            flags = oracle.read_u8(base + SPRITE_FLAGS_OFF)
            if not (flags & 1):
                continue
            affine_anims = oracle.read_u32(base + SPRITE_AFFINE_ANIMS_OFF)
            callback = oracle.read_u32(base + SPRITE_CALLBACK_OFF) & ~1
            attr1 = read_u16(base + SPRITE_OAM_ATTR1_OFF)
            matrix_num = (attr1 >> 9) & 0x1F
            mbase = GOAMMATRICES + matrix_num * OAMMATRIX_SIZE
            common = {
                "slot": i,
                "x": read_s16(base + SPRITE_X_OFF),
                "y": read_s16(base + SPRITE_Y_OFF),
                "x2": read_s16(base + SPRITE_X2_OFF),
                "y2": read_s16(base + SPRITE_Y2_OFF),
                "animNum": oracle.read_u8(base + SPRITE_ANIM_NUM_OFF),
                "animCmdIndex": oracle.read_u8(base + SPRITE_ANIM_CMD_INDEX_OFF),
                "matrixNum": matrix_num,
                "matrixA": read_s16(mbase + 0),
                "matrixB": read_s16(mbase + 2),
                "matrixC": read_s16(mbase + 4),
                "matrixD": read_s16(mbase + 6),
                "invisible": bool(flags & 4),
                "subpriority": oracle.read_u8(base + SPRITE_SUBPRIORITY_OFF),
            }
            if affine_anims == S_AFFINE_ANIMS_DRAGON_BREATH_FIRE:
                fire_sprites.append(common)
            if callback == SPRITECB_HIT_ANIM_HEALTHBOX_EFFECT:
                hitflash_sprites.append(common)

        return {
            "tick": tick,
            "targetSlot": target_slot,
            "targetX": read_s16(tbase + SPRITE_X_OFF),
            "targetY": read_s16(tbase + SPRITE_Y_OFF),
            "targetX2": read_s16(tbase + SPRITE_X2_OFF),
            "targetY2": read_s16(tbase + SPRITE_Y2_OFF),
            "targetPaletteNum": t_palette_num,
            "targetPaletteFaded": read_palette(t_pal_faded),
            "targetPaletteUnfaded": read_palette(t_pal_unfaded),
            "fireSprites": fire_sprites,
            "hitFlashSprites": hitflash_sprites,
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
