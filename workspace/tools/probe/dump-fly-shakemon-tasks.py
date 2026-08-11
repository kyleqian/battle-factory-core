#!/usr/bin/env python3
"""RUNG A (FLY ShakeMon calibration): per-tick RAM dump of gTasks (all 16
slots, full struct) plus every in-use gSprite's x2/y2/subpriority, over
FlyUnleash's own `create_basic_hitsplat_sprite` / `createvisualtask
AnimTask_ShakeMon` window. Stages via the same `battle_lab.BattleLab`
mechanicLab request the committed `fly-murkrow-onix-strike.json` fixture
uses (`tools/battle-lab/mechanic-fly-murkrow-onix.json`), so the window is
reached in ~1k frames instead of replaying a full raw Factory trace.

Distinguishes the real per-call-site creation-to-display mechanism from a
guessed lag constant: read exactly which RAM tick the ShakeMon task (func ==
AnimTask_ShakeMon) first appears active, and what its own `data[]`
(spriteId, numTimes/frameDelay counters) and every sprite's x2 show
tick-by-tick from there, rather than assuming the QUICK_ATTACK call site's
calibration transfers.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-fly-shakemon-tasks.py <scenario.json> <output.json> <startTick> <endTick>
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

GTASKS = 0x03005E00
TASK_SIZE = 0x28
NUM_TASKS = 16

GSPRITES = 0x02020630
SPRITE_SIZE = 0x44
NUM_SPRITES = 64

GBATTLERSPRITEIDS = 0x020241E4
GBATTLEANIMATTACKER = 0x02038436
GBATTLEANIMTARGET = 0x02038437
GANIMVISUALTASKCOUNT = 0x020383FE

ANIM_TASK_SHAKE_MON = 0x080D51AC


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
            "battler0slot": oracle.read_u8(GBATTLERSPRITEIDS + 0),
            "battler1slot": oracle.read_u8(GBATTLERSPRITEIDS + 1),
            "animAttacker": oracle.read_u8(GBATTLEANIMATTACKER),
            "animTarget": oracle.read_u8(GBATTLEANIMTARGET),
            "animVisualTaskCount": oracle.read_u8(GANIMVISUALTASKCOUNT),
        }

        tasks = []
        for slot in range(NUM_TASKS):
            base = GTASKS + slot * TASK_SIZE
            func = read_u32(base + 0x00)
            is_active = oracle.read_u8(base + 0x04)
            if not is_active:
                continue
            prev = oracle.read_u8(base + 0x05)
            next_ = oracle.read_u8(base + 0x06)
            priority = oracle.read_u8(base + 0x07)
            data = [read_s16(base + 0x08 + i * 2) for i in range(6)]
            tasks.append({
                "slot": slot,
                "func": hex(func),
                "isShakeMon": (func & ~1) == ANIM_TASK_SHAKE_MON,
                "prev": prev,
                "next": next_,
                "priority": priority,
                "data": data,
            })
        row["tasks"] = tasks

        sprites = {}
        for slot in range(NUM_SPRITES):
            base = GSPRITES + slot * SPRITE_SIZE
            flags = read_u16(base + 0x3E)
            in_use = bool(flags & 0x1)
            if not in_use:
                continue
            sprites[str(slot)] = {
                "invisible": bool(flags & 0x4),
                "x2": read_s16(base + 0x24),
                "y2": read_s16(base + 0x26),
                "subpriority": oracle.read_u8(base + 0x43),
            }
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
