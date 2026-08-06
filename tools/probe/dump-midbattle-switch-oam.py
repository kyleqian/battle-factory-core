#!/usr/bin/env python3
"""Mid-battle switch per-tick OAM ground truth (ISSUES #78 residuals 1a-1d;
extends `dump-midbattle-switch-fade-palette.py`).

Replays the committed mechanicLab OFF scenario (BattleLab.prepare +
verbatim segments) and records, per tick in [startTick, endTick] (the
recommended window is 1085-1235, covering the recall switch-out scale-up,
the recall ball-open particles, the send-in emerge, and the send-in
settle/healthbox slide):

  * every live sprite (all 64 `gSprites` slots): decoded OAM attrs
    (y/x/shape/size/tileNum/priority/paletteNum/affineMode/matrixNum),
    the sprite's own `x`/`y`/`x2`/`y2`, `centerToCornerVec` (the RSE
    "center-to-corner" anchor, `sprite.c:687-701`), anim/affine-anim
    cursors, `data[0..7]`, visibility flags, subpriority, and the
    template + callback pointers (so ball/particle/mon/healthbox sprites
    are attributable without name symbols -- the static arrays
    `gBallSpriteTemplates`/`sBallParticleSpriteTemplates` and the static
    particle callbacks are resolved from the ELF in the module constants);
  * the affine matrix `a/b/c/d` (`gOamMatrices[matrixNum]`) and the
    affine-anim state (animNum/animCmdIndex/delayCounter/xScale/yScale/
    rotation, `sAffineAnimStates`, `sprite.c:273`) for every affine
    sprite -- these are the exact `pa/pb/pc/pd` the task asks to bank;
  * the final composed `gMain.oamBuffer[128]` (post-`SortSprites`,
    `AddSpritesToOamBuffer`) for draw order / final render positions;
  * the player/opponent battler sprite ids + player healthbox sprite id.

The load-bearing facts for the four residual classes:
  (1a) switch-out affine scale-up (`AnimTask_SwitchOutShrinkMon`,
       battle_anim_throw.c:642-667): the `scale` ramp reads back directly
       as the sprite's matrix `a`/`d`; the feet-anchor adjustment
       `SetBattlerSpriteYOffsetFromYScale` (battle_anim_mons.c:1873-1883)
       reads back as the sprite's `y2` each tick -- the app's
       `drawMidBattleSwitchOutSprite` (`battleScene.ts:35264`) currently
       scales around the sprite center with y2=0, which is the divergence.
  (1b) recall ball-open particles (`AnimateBallOpenParticles`,
       battle_anim_throw.c:1577-1599 -> `PokeBallOpenParticleAnimation`,
       :1611-1652): the particle sprites carry the Step1/Step2 callbacks;
       their `data[1]` counts up the Sin/Cos lifetime and `x2`/`y2` carry
       the per-frame displacement, palette row 22 (0x160) on the recall.
  (1c/d) send-in emerge + settle: the mon sprite's `invisible` clear at
       the ball-release, the matrix `a` 862->256 ramp, the `y2` descent,
       and the idle-bounce x2/y2 after `BattleAnimateBackSprite` -- plus
       the healthbox sprite's `x2` 110->0 slide.

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \
        <mgba-python> tools/probe/dump-midbattle-switch-oam.py \
            <scenario.json> <output.json> <startTick> <endTick>

Two independent runs must be byte-identical on every common field before
banking (the §8 standard).
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

GSPRITES = 0x02020630
SPRITE_SIZE = 0x44
NUM_SPRITES = 64
GBATTLERSPRITEIDS = 0x020241E4
GHEALTHBOXSPRITEIDS = 0x03005D70
GOAMMATRICES = 0x02021BC0
SAFFINEANIMSTATES = 0x03000B70
AFFINE_STATE_SIZE = 10
GMAIN = 0x030022C0
OAM_BUFFER = GMAIN + 0x38
OAM_ENTRY_SIZE = 8
OAM_ENTRIES = 128

# Sprite field offsets (include/sprite.h).
SPRITE_OAM_OFF = 0x00          # struct OamData { attr0, attr1, attr2 } (u16 each)
SPRITE_TEMPLATE_OFF = 0x14
SPRITE_CALLBACK_OFF = 0x1C
SPRITE_X_OFF = 0x20
SPRITE_Y_OFF = 0x22
SPRITE_X2_OFF = 0x24
SPRITE_Y2_OFF = 0x26
SPRITE_CTC_VX_OFF = 0x28       # s8 centerToCornerVecX
SPRITE_CTC_VY_OFF = 0x29       # s8 centerToCornerVecY
SPRITE_ANIM_NUM_OFF = 0x2A
SPRITE_ANIM_CMD_INDEX_OFF = 0x2B
SPRITE_ANIM_DELAY_OFF = 0x2C   # low 6 bits = animDelayCounter; bits 6/7 paused flags
SPRITE_ANIM_LOOP_OFF = 0x2D
SPRITE_DATA_OFF = 0x2E         # s16 data[8]
SPRITE_FLAGS_OFF = 0x3E        # u16 inUse:1 coordOffsetEnabled:1 invisible:1 ...
SPRITE_FLAGS2_OFF = 0x3F       # u16 hFlip:1 vFlip:1 ... affineAnimEnded:1 ...
SPRITE_SUBPRIORITY_OFF = 0x43

# Static-symbol addresses resolved from reference/pokeemerald/pokeemerald.elf
# (arm-none-eabi-nm). The template/callback pointers identify sprites whose
# owning static arrays are otherwise nameless.
GBALL_TEMPLATE = 0x0832C588            # gBallSpriteTemplates[0] = BALL_POKE
SPARTICLE_TEMPLATE = 0x085E51F0        # sBallParticleSpriteTemplates[0] = BALL_POKE
SPARTICLE_STEP1 = 0x08171F68           # PokeBallOpenParticleAnimation_Step1
SPARTICLE_STEP2 = 0x08171F88           # PokeBallOpenParticleAnimation_Step2
SPRITECB_PLAYERMONFROMBALL = 0x08039E44
SPRITECB_OPPONENTMONFROMBALL = 0x08039B58
SPRITECB_HEALTHBOXSLIDEIN = 0x080769CC
SPRITECB_HEALTHBOXSLIDEIN_DELAYED = 0x080769A8
SPRITECB_PLAYERMON_SENDOUT_1 = 0x080761B4
SPRITECB_PLAYERMON_SENDOUT_2 = 0x08076204
SPRITECB_HANDLE_BALL_ANIM_END = 0x08075FD4


def main() -> None:
    request = validate_request(json.loads(SCENARIO_PATH.read_text()), "battle-scene-off")
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json")
    lab = BattleLab(oracle, request["profile"])
    lab.prepare(request)

    def u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def u16(addr: int) -> int:
        return u8(addr) | (u8(addr + 1) << 8)

    def s8(addr: int) -> int:
        v = u8(addr)
        return v - 0x100 if v >= 0x80 else v

    def s16(addr: int) -> int:
        v = u16(addr)
        return v - 0x10000 if v >= 0x8000 else v

    def u32(addr: int) -> int:
        b = [u8(addr + i) for i in range(4)]
        return b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)

    def decode_attr0(attr0: int) -> dict:
        return {
            "y": attr0 & 0xFF,
            "affineMode": (attr0 >> 8) & 0x3,
            "objMode": (attr0 >> 10) & 0x3,
            "mosaic": (attr0 >> 12) & 0x1,
            "bpp": (attr0 >> 13) & 0x1,
            "shape": (attr0 >> 14) & 0x3,
        }

    def decode_attr1(attr1: int) -> dict:
        return {
            "x": attr1 & 0x1FF,
            "matrixNum": (attr1 >> 9) & 0x1F,
            "size": (attr1 >> 14) & 0x3,
        }

    def decode_attr2(attr2: int) -> dict:
        return {
            "tileNum": attr2 & 0x3FF,
            "priority": (attr2 >> 10) & 0x3,
            "paletteNum": (attr2 >> 12) & 0xF,
        }

    def affine_state(matrix_num: int) -> dict:
        base = SAFFINEANIMSTATES + matrix_num * AFFINE_STATE_SIZE
        return {
            "matrixNum": matrix_num,
            "animNum": u8(base + 0),
            "animCmdIndex": u8(base + 1),
            "delayCounter": u8(base + 2),
            "loopCounter": u8(base + 3),
            "xScale": s16(base + 4),
            "yScale": s16(base + 6),
            "rotation": u16(base + 8),
        }

    def matrix(matrix_num: int) -> dict:
        base = GOAMMATRICES + matrix_num * 8
        return {"a": s16(base + 0), "b": s16(base + 2), "c": s16(base + 4), "d": s16(base + 6)}

    def record(tick: int) -> dict:
        attr0 = u16(GSPRITES + SPRITE_OAM_OFF)
        flags = u16(GSPRITES + SPRITE_FLAGS_OFF)

        battler_slots = [u8(GBATTLERSPRITEIDS + i) for i in range(4)]
        healthbox_slots = [u8(GHEALTHBOXSPRITEIDS + i) for i in range(4)]

        sprites = {}
        for slot in range(NUM_SPRITES):
            base = GSPRITES + slot * SPRITE_SIZE
            if not (u16(base + SPRITE_FLAGS_OFF) & 0x1):
                continue
            a0 = u16(base + SPRITE_OAM_OFF)
            a1 = u16(base + SPRITE_OAM_OFF + 2)
            a2 = u16(base + SPRITE_OAM_OFF + 4)
            template = u32(base + SPRITE_TEMPLATE_OFF)
            callback = u32(base + SPRITE_CALLBACK_OFF) & ~1
            kind = "other"
            if slot == battler_slots[0]:
                kind = "playerMon"
            elif slot == battler_slots[1]:
                kind = "opponentMon"
            elif template == GBALL_TEMPLATE:
                kind = "ball"
            elif template == SPARTICLE_TEMPLATE or callback in (SPARTICLE_STEP1, SPARTICLE_STEP2):
                kind = "particle"
            elif slot in healthbox_slots:
                kind = "healthbox"
            matrix_num = (a1 >> 9) & 0x1F
            entry = {
                "slot": slot,
                "kind": kind,
                "template": hex(template),
                "callback": hex(callback),
                **decode_attr0(a0),
                **decode_attr1(a1),
                **decode_attr2(a2),
                "attrRaw": [a0, a1, a2],
                "x": s16(base + SPRITE_X_OFF),
                "y": s16(base + SPRITE_Y_OFF),
                "x2": s16(base + SPRITE_X2_OFF),
                "y2": s16(base + SPRITE_Y2_OFF),
                "centerToCornerVecX": s8(base + SPRITE_CTC_VX_OFF),
                "centerToCornerVecY": s8(base + SPRITE_CTC_VY_OFF),
                "animNum": u8(base + SPRITE_ANIM_NUM_OFF),
                "animCmdIndex": u8(base + SPRITE_ANIM_CMD_INDEX_OFF),
                "animDelayCounter": u16(base + SPRITE_ANIM_DELAY_OFF) & 0x3F,
                "animLoopCounter": u8(base + SPRITE_ANIM_LOOP_OFF),
                "data": [s16(base + SPRITE_DATA_OFF + i * 2) for i in range(8)],
                "invisible": bool(u16(base + SPRITE_FLAGS_OFF) & 0x4),
                "affineAnimEnded": bool(u16(base + SPRITE_FLAGS2_OFF) & 0x20),
                "subpriority": u8(base + SPRITE_SUBPRIORITY_OFF),
            }
            if (a0 >> 8) & 0x3:  # affine mode (single or double) -> matrix + anim state
                entry["matrix"] = matrix(matrix_num)
                entry["affineAnim"] = affine_state(matrix_num)
            sprites[str(slot)] = entry

        oam_entries = []
        for i in range(OAM_ENTRIES):
            base = OAM_BUFFER + i * OAM_ENTRY_SIZE
            a0 = u16(base + 0)
            a1 = u16(base + 2)
            a2 = u16(base + 4)
            oam_entries.append({
                **decode_attr0(a0),
                **decode_attr1(a1),
                **decode_attr2(a2),
                "attrRaw": [a0, a1, a2],
            })

        return {
            "tick": tick,
            "battlerSlots": battler_slots,
            "healthboxSlots": healthbox_slots,
            "sprites": sprites,
            "oamBuffer": oam_entries,
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
            if tick < START_TICK:
                continue
            if tick > END_TICK:
                break
            rows.append(record(tick))
        if tick > END_TICK:
            break

    OUTPUT_PATH.write_text(json.dumps({"ticks": rows}, separators=(",", ":")))
    print(f"wrote {OUTPUT_PATH} ({len(rows)} ticks)")


main()
