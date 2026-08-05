#!/usr/bin/env python3
"""Opponent-FLY semi-invisible turn ground truth (ISSUES #79).

Replays the committed mechanicLab OFF scenario via BattleLab.prepare, then
records, per tick in the requested window, the opponent battler's STATUS3
semi-invulnerable bits, its sprite struct's invisible flag + position, and the
healthbox sprite's invisible flag, plus the player battler's sprite invisible
flag for context. Answers: does the real Scene-OFF game hide the airborne
battler's sprite? Does it also hide the healthbox?

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    <mgba-venv>/bin/python tools/probe/dump-fly-semi-invisible-ram.py \
        tools/battle-lab/mechanic-opponent-fly-off.json \
        <output.json> <startTick> <endTick>
"""
from __future__ import annotations

import hashlib
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
# Battle Scene OFF profile bootstrap (matches the server's POKEBENCH_ORACLE_PROFILE
# selection; the generic factory.json bootstrap is the battle-scene-ON one and
# would replay the trace with animations enabled -> divergent frame counts).
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

SPRITE_SIZE = 0x44


def main() -> None:
    request = validate_request(json.loads(SCENARIO_PATH.read_text()), "battle-scene-off")
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    lab = BattleLab(oracle, request["profile"])
    lab.prepare(request)

    syms = oracle.symbols
    g_statuses3 = syms["gStatuses3"]
    g_battler_sprite_ids = syms["gBattlerSpriteIds"]
    g_healthbox_sprite_ids = syms["gHealthboxSpriteIds"]
    g_sprites = syms["gSprites"]
    g_battle_mons = syms["gBattleMons"]
    g_battle_mons_ptr = syms.get("gBattleMonsPtr")

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def s16(addr: int) -> int:
        v = u16(addr)
        return v - 0x10000 if v >= 0x8000 else v

    def u32(addr: int) -> int:
        return oracle.read_u32(addr)

    def sprite_visible(sprite_id: int) -> dict:
        if sprite_id == 0xFF:
            return {"present": False}
        base = g_sprites + sprite_id * SPRITE_SIZE
        flags = oracle.read_u8(base + 0x3E)
        invisible = (flags >> 2) & 1
        return {
            "present": True,
            "invisible": invisible,
            "x": s16(base + 0x20),
            "y": s16(base + 0x22),
            "x2": s16(base + 0x24),
            "y2": s16(base + 0x26),
            "callback": u32(base + 0x1C),
        }

    def record(tick: int) -> dict:
        opp_sprite_id = oracle.read_u8(g_battler_sprite_ids + 1)
        opp_hb_id = oracle.read_u8(g_healthbox_sprite_ids + 1)
        player_sprite_id = oracle.read_u8(g_battler_sprite_ids + 0)
        statuses3_opp = u32(g_statuses3 + 4)
        rgb = oracle.screen_rgb()
        # Opponent MURKROW sprite screen region (top right). Hash it so we can
        # detect the visual disappearance/regroup in the same process.
        W, H = oracle.width, oracle.height
        x0, x1, y0, y1 = 140, 215, 35, 85
        region = b"".join(
            rgb[(y * W + x) * 3 : (y * W + x) * 3 + 3]
            for y in range(y0, y1)
            for x in range(x0, x1)
        )
        return {
            "tick": tick,
            "oppStatuses3": statuses3_opp,
            "onAir": bool(statuses3_opp & (1 << 6)),
            "oppSpriteId": opp_sprite_id,
            "playerSpriteId": player_sprite_id,
            "oppSprite": sprite_visible(opp_sprite_id),
            "oppHealthbox": sprite_visible(opp_hb_id),
            "playerSprite": sprite_visible(player_sprite_id),
            "oppRegionSha": hashlib.sha256(region).hexdigest(),
            "screenSha": hashlib.sha256(rgb).hexdigest(),
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
