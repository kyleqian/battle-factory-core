#!/usr/bin/env python3
"""DRAGON_RAGE enumeration rung 2 groundwork: per-tick RAM probe of the
attacker/target battler sprites plus the `SlideMonToOffset`/
`SlideMonToOriginalPos` dummy sprites (`reference/pokeemerald/src/
battle_anim_mon_movement.c:478-576`) across a real Move_DRAGON_RAGE window,
staged via a Factory-legal CHARMELEON_2-shaped attacker (FRONTIER_MON index
280 carries MOVE_DRAGON_RAGE - `src/data/gen/battle-frontier-mons.json`)
against an ONIX target, using the same `overrides.parties` mechanicLab
staging `dump-mist-ball-sprite.py` established (`tools/battle-lab/
mechanic-dragon-rage-charmeleon-onix.json`).

The two dummy sprites are identified by their own `template` pointer
(gSprites+0x14) against `gSlideMonToOffsetSpriteTemplate`/
`gSlideMonToOriginalPosSpriteTemplate`'s real rodata addresses (`reference/
pokeemerald/pokeemerald.map`), not by callback (SlideMonToOffset's own
callback function only runs once at creation before reassigning itself to
TranslateSpriteLinearByIdFixedPoint - the template pointer is the only
field stable for the sprite's whole lifetime, same convention
`dump-mist-ball-sprite.py` already uses for MIST_BALL_TEMPLATE_ADDR). The
attacker/target's own sprite slots are resolved every tick via
`gBattlerSpriteIds[gBattleAnimAttacker/Target]` (battler-relative, not a
hardcoded OAM slot).

Addresses (`reference/pokeemerald/pokeemerald.map`, this run's pinned
reference build):
  gSlideMonToOriginalPosSpriteTemplate = 0x0857fe58
  gSlideMonToOffsetSpriteTemplate      = 0x0857fe70

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <output.json> -- \
        <mgba-python> tools/probe/dump-dragonrage-slide.py <scenario.json> <output.json> <startTick> <endTick>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(f"usage: {sys.argv[0]} <scenario.json> <output.json> <startTick> <endTick>")
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

GBATTLEANIMATTACKER = 0x02038436
GBATTLEANIMTARGET = 0x02038437
GANIMSCRIPTACTIVE = 0x020383FD

SLIDE_TO_ORIGINAL_POS_TEMPLATE_ADDR = 0x0857FE58
SLIDE_TO_OFFSET_TEMPLATE_ADDR = 0x0857FE70


def main() -> None:
    scenario = json.loads(SCENARIO_PATH.read_text())
    profile = scenario.get("profile", "battle-scene-on")
    bootstrap = ORACLE_DIR / "bootstrap" / (
        "factory.json" if profile == "battle-scene-on" else "factory-battle-scene-off.json"
    )
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, bootstrap)
    request = validate_request(scenario, profile)
    lab = BattleLab(oracle, profile)
    lab.prepare(request)

    def s16(v: int) -> int:
        return v - 0x10000 if v & 0x8000 else v

    def read_u16(addr: int) -> int:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return lo | (hi << 8)

    def read_s16(addr: int) -> int:
        return s16(read_u16(addr))

    def read_u32(addr: int) -> int:
        b = [oracle.read_u8(addr + i) for i in range(4)]
        return b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)

    def sprite_snapshot(slot: int) -> dict:
        base = GSPRITES + slot * SPRITE_SIZE
        return {
            "slot": slot,
            "x": read_s16(base + 0x20),
            "y": read_s16(base + 0x22),
            "x2": read_s16(base + 0x24),
            "y2": read_s16(base + 0x26),
        }

    def record(tick: int) -> dict:
        attacker_battler = oracle.read_u8(GBATTLEANIMATTACKER)
        target_battler = oracle.read_u8(GBATTLEANIMTARGET)
        attacker_slot = oracle.read_u8(GBATTLERSPRITEIDS + attacker_battler)
        target_slot = oracle.read_u8(GBATTLERSPRITEIDS + target_battler)

        row: dict = {
            "tick": tick,
            "animScriptActive": oracle.read_u8(GANIMSCRIPTACTIVE),
            "attacker": sprite_snapshot(attacker_slot),
            "target": sprite_snapshot(target_slot),
            "slideSprites": [],
        }

        for slot in range(NUM_SPRITES):
            base = GSPRITES + slot * SPRITE_SIZE
            flags = read_u16(base + 0x3E)
            if not (flags & 0x1):
                continue
            template = read_u32(base + 0x14)
            if template not in (SLIDE_TO_OFFSET_TEMPLATE_ADDR, SLIDE_TO_ORIGINAL_POS_TEMPLATE_ADDR):
                continue
            row["slideSprites"].append({
                "slot": slot,
                "kind": "SlideMonToOffset" if template == SLIDE_TO_OFFSET_TEMPLATE_ADDR else "SlideMonToOriginalPos",
                "invisible": bool(flags & 0x4),
                "data": [read_s16(base + 0x2E + i * 2) for i in range(8)],
            })
        return row

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
