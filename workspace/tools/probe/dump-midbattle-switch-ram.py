#!/usr/bin/env python3
"""Mid-battle voluntary-switch sprite-state ground truth (ISSUES #78).

Stages the committed mechanicLab OFF scenario via BattleLab.prepare, then
replays the trace's segments tick-by-tick and records, per tick in the
requested window, the player battler's sprite state (visibility, callback,
affine matrix, position), the healthbox ball-anim state, the presence of a
ball-throw sprite (template within gBallSpriteTemplates), and the
party-index/species of the active battler.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    <mgba-venv>/bin/python tools/probe/dump-midbattle-switch-ram.py \
        tools/battle-lab/scratch-mid-battle-switch-dense-a-off.json \
        <output.json> <startTick> <endTick>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(
        f"usage: {sys.argv[0]} <scenario.json> <out.json> <startTick> <endTick>"
    )
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
    raise SystemExit(f"could not find the harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402
from battle_lab import BattleLab, validate_request  # noqa: E402

REFERENCE_POKEEMERALD = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE_POKEEMERALD / "pokeemerald.gba"
MAP_PATH = REFERENCE_POKEEMERALD / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory.json"

SPRITE_SIZE = 0x44
OAM_MATRIX_SIZE = 8


def main() -> None:
    request = validate_request(json.loads(SCENARIO_PATH.read_text()), "battle-scene-off")
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    lab = BattleLab(oracle, request["profile"])
    lab.prepare(request)

    syms = oracle.symbols
    g_battler_sprite_ids = syms["gBattlerSpriteIds"]
    g_sprites = syms["gSprites"]
    g_oam_matrices = syms["gOamMatrices"]
    g_battle_sprites_data_ptr = syms["gBattleSpritesDataPtr"]
    g_battler_party_indexes = syms["gBattlerPartyIndexes"]
    g_battle_mons = syms["gBattleMons"]
    g_ball_templates = syms["gBallSpriteTemplates"]
    g_healthbox_sprite_ids = syms["gHealthboxSpriteIds"]
    BALL_TEMPLATES_END = g_ball_templates + 5 * 12  # 5 ball types, 12-byte templates

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        v = u16(addr)
        return v - 0x10000 if v >= 0x8000 else v

    def u32(addr: int) -> int:
        return oracle.read_u32(addr)

    def record(tick: int) -> dict:
        sprite_id = oracle.read_u8(g_battler_sprite_ids + 0)
        base = g_sprites + sprite_id * SPRITE_SIZE
        oam_byte1 = oracle.read_u8(base + 1)
        oam_byte3 = oracle.read_u8(base + 3)
        affine_mode = oam_byte1 & 0x3
        matrix_num = (oam_byte3 >> 1) & 0x1F
        matrix_base = g_oam_matrices + matrix_num * OAM_MATRIX_SIZE
        flags_0x3e = oracle.read_u8(base + 0x3E)
        flags_0x3f = oracle.read_u8(base + 0x3F)
        invisible = (flags_0x3e >> 2) & 1
        affine_anim_ended = (flags_0x3f >> 5) & 1
        anim_ended = (flags_0x3f >> 4) & 1
        byte_0x2c = oracle.read_u8(base + 0x2C)
        affine_anim_paused = (byte_0x2c >> 7) & 1

        bsd = u32(g_battle_sprites_data_ptr)
        hb = u32(bsd + 4)  # healthBoxesData pointer (after battlerData ptr)
        hb_byte0 = oracle.read_u8(hb + 0)
        ball_anim_active = (hb_byte0 >> 3) & 1
        hb_animation_state = oracle.read_u8(hb + 4)
        hb_slide_started = (oracle.read_u8(hb + 1) >> 7) & 1

        hb_sprite_id = oracle.read_u8(g_healthbox_sprite_ids + 0)
        hbbase = g_sprites + hb_sprite_id * SPRITE_SIZE
        hb_flags = oracle.read_u8(hbbase + 0x3E)
        hb_visible = (hb_flags >> 2) & 1

        party_index = oracle.read_u16(g_battler_party_indexes + 0)
        species = oracle.read_u16(g_battle_mons + 0)

        # Ball-throw sprite: any in-use sprite whose template points into
        # gBallSpriteTemplates[0..5).
        ball_sprites = []
        for i in range(64):
            sbase = g_sprites + i * SPRITE_SIZE
            if not (oracle.read_u8(sbase + 0x3E) & 1):
                continue
            template = u32(sbase + 0x14)
            if g_ball_templates <= template < BALL_TEMPLATES_END:
                ball_sprites.append(
                    {
                        "id": i,
                        "x": s16(sbase + 0x20),
                        "y": s16(sbase + 0x22),
                        "affineMode": oracle.read_u8(sbase + 1) & 0x3,
                    }
                )

        return {
            "tick": tick,
            "partyIndex": party_index,
            "species": species,
            "spriteId": sprite_id,
            "invisible": invisible,
            "affineAnimEnded": affine_anim_ended,
            "animEnded": anim_ended,
            "affineAnimPaused": affine_anim_paused,
            "callback": u32(base + 0x1C),
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "animNum": oracle.read_u8(base + 0x2A),
            "affineMode": affine_mode,
            "matrixNum": matrix_num,
            "pa": s16(matrix_base + 0),
            "pd": s16(matrix_base + 6),
            "hbBallAnimActive": ball_anim_active,
            "hbAnimState": hb_animation_state,
            "hbSlideStarted": hb_slide_started,
            "hbSpriteId": hb_sprite_id,
            "hbVisible": hb_visible,
            "hbX": s16(hbbase + 0x20),
            "hbX2": s16(hbbase + 0x24),
            "hbCallback": u32(hbbase + 0x1C),
            "ballSprites": ball_sprites,
        }

    ticks_out = []
    tick = 0
    if START_TICK <= tick <= END_TICK:
        ticks_out.append(record(tick))

    for segment in request["trace"]["segments"]:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if START_TICK <= tick <= END_TICK:
                ticks_out.append(record(tick))
            if tick > END_TICK:
                break
        if tick > END_TICK:
            break

    OUTPUT_PATH.write_text(json.dumps({"ticks": ticks_out}, indent=0))


main()
