#!/usr/bin/env python3
"""MIST_BALL remainder rung 3: per-tick RAM dump of every in-use gSprite's
x/y/x2/y2/data[0..5]/template pointer, over a window wide enough to cover
`AnimThrowMistBall` -> `TranslateAnimSpriteToTargetMonLocation` ->
`StartAnimLinearTranslation`'s whole flight (creation through
`DestroyAnimSprite`). Stages via the same `battle_lab.BattleLab` mechanicLab
`overrides.parties` request the committed `mechanic-mist-ball-latias-onix.json`
fixture uses, so the window is reached in ~1k frames instead of replaying a
full raw Factory trace.

The mist-ball sprite is identified by its `template` pointer (gSprites+0x14)
matching `gMistBallSpriteTemplate`'s own address (read via `bin/oracle symbols
gMistBallSpriteTemplate`), not by guessing an OAM slot - unambiguous even
though other sprites (battler pics, the later ComplexPaletteBlend sprite) are
alive in the same window.

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <output.json> -- \
        <mgba-python> tools/probe/dump-mist-ball-sprite.py <scenario.json> <output.json> <startTick> <endTick>
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

GBATTLEANIMATTACKER = 0x02038436
GBATTLEANIMTARGET = 0x02038437
GANIMSCRIPTACTIVE = 0x020383FD

MIST_BALL_TEMPLATE_ADDR = 0x08595C70


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

    def record(tick: int) -> dict:
        row: dict = {
            "tick": tick,
            "animAttacker": oracle.read_u8(GBATTLEANIMATTACKER),
            "animTarget": oracle.read_u8(GBATTLEANIMTARGET),
            "animScriptActive": oracle.read_u8(GANIMSCRIPTACTIVE),
        }

        sprites = []
        for slot in range(NUM_SPRITES):
            base = GSPRITES + slot * SPRITE_SIZE
            flags = read_u16(base + 0x3E)
            in_use = bool(flags & 0x1)
            if not in_use:
                continue
            template = read_u32(base + 0x14)
            callback = read_u32(base + 0x1C)
            sprites.append({
                "slot": slot,
                "template": hex(template),
                "isMistBall": template == MIST_BALL_TEMPLATE_ADDR,
                "callback": hex(callback),
                "x": read_s16(base + 0x20),
                "y": read_s16(base + 0x22),
                "x2": read_s16(base + 0x24),
                "y2": read_s16(base + 0x26),
                "animNum": oracle.read_u8(base + 0x2A),
                "data": [read_s16(base + 0x2E + i * 2) for i in range(6)],
                "subpriority": oracle.read_u8(base + 0x43),
            })
        row["sprites"] = sprites
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
