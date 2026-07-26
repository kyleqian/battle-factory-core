#!/usr/bin/env python3
"""MOVE_FUTURE_SIGHT's group-A blend_color_cycle self-flash (already ported,
proven by MOVE_GROWTH) plus its own genuinely new mechanism:
`AnimTask_SetPsychicBackground` (`battle_anim_effects_3.c:1372-1396`), a task
that rotates BG palette 2's entries 1-11 (a 4bpp psychic-swirl BG,
`GetBattleBgPaletteNum()` returns the constant 2 outside Contests,
`battle_anim_mons.c:1024-1029` - no runtime dependency to probe there) by one
slot every 4 ticks: entry 11 moves to entry 1, entries 1-10 shift up to 2-11.
`AnimTask_ScaleMonAndRestore` is already ported generically (MOVE_BIND/
MOVE_GROWTH); this probe re-confirms it applies unchanged to FUTURE_SIGHT's
own argv (xDelta=-4, yDelta=-4, duration=15, ANIM_ATTACKER).

Dumps, every tick: the attacker's own OBJ palette row (blend_color_cycle
target), BG palette 2's full 16-entry row (the psychic swirl target,
`gPlttBufferFaded` index 32-47), and any active gTasks slot whose func
pointer is not yet known to belong to blend_color_cycle/ScaleMonAndRestore
(to identify AnimTask_SetPsychicBackground's own creation-tick address and
its data layout empirically, since its Step function is `static` and has no
linker symbol).

Addresses:
  gTasks                 = 0x03005e00
  gPlttBufferFaded        = 0x02037b14
  gBattleAnimAttacker/Target = 0x02038436 / 0x02038437
  AnimTask_SetPsychicBackground = 0x0815a504 (creation tick only - its own
    Step function is static/anonymous; we watch for any OTHER func pointer's
    first appearance after this tick as the Step address)
  AnimTask_BlendColorCycle      = 0x08115a04 (creation tick)
  AnimTask_BlendColorCycleLoop  = 0x08115aa4 (every tick after)
  AnimTask_ScaleMonAndRestore      = 0x080d6064 (creation tick)
  AnimTask_ScaleMonAndRestore_Step = 0x080d60bc (every tick after)

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <output.json> -- \
        <mgba-python> tools/probe/dump-future-sight-psychicbg.py <scenario.json> <output.json> <startTick> <endTick>
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

GPLTTBUFFERFADED = 0x02037B14

GBATTLEANIMATTACKER = 0x02038436
GBATTLEANIMTARGET = 0x02038437

BLDCNT = 0x04000050
BLDALPHA = 0x04000052
BLDY = 0x04000054

PSYCHICBG_CREATE = 0x0815A504
BLENDCYCLE_CREATE = 0x08115A04
BLENDCYCLE_LOOP = 0x08115AA4
SCALEMON_CREATE = 0x080D6064
SCALEMON_STEP = 0x080D60BC

KNOWN_FUNCS = {PSYCHICBG_CREATE, BLENDCYCLE_CREATE, BLENDCYCLE_LOOP, SCALEMON_CREATE, SCALEMON_STEP}


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

    def read_u16(addr: int) -> int:
        lo = oracle.read_u8(addr)
        hi = oracle.read_u8(addr + 1)
        return lo | (hi << 8)

    def read_u32(addr: int) -> int:
        b = [oracle.read_u8(addr + i) for i in range(4)]
        return b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24)

    def record(tick: int) -> dict:
        attacker_battler = oracle.read_u8(GBATTLEANIMATTACKER)
        target_battler = oracle.read_u8(GBATTLEANIMTARGET)

        attacker_row = [
            read_u16(GPLTTBUFFERFADED + (0x100 + attacker_battler * 16 + i) * 2)
            for i in range(16)
        ]
        bg2_row = [read_u16(GPLTTBUFFERFADED + (2 * 16 + i) * 2) for i in range(16)]

        row: dict = {
            "tick": tick,
            "attackerBattler": attacker_battler,
            "targetBattler": target_battler,
            "attackerObjRow": attacker_row,
            "bgPalette2Row": bg2_row,
            "bldcnt": read_u16(BLDCNT),
            "bldalpha": read_u16(BLDALPHA),
            "bldy": read_u16(BLDY),
            "blendCycleTask": None,
            "scaleMonTask": None,
            "psychicBgTask": None,
            "unknownTasks": [],
        }

        for slot in range(NUM_TASKS):
            base = GTASKS + slot * TASK_SIZE
            is_active = oracle.read_u8(base + 0x04)
            if not is_active:
                continue
            func = read_u32(base + 0x00) & ~1
            data = [read_u16(base + 0x08 + i * 2) for i in range(16)]
            if func in (BLENDCYCLE_CREATE, BLENDCYCLE_LOOP):
                row["blendCycleTask"] = {"slot": slot, "func": hex(func), "priority": oracle.read_u8(base + 0x07), "data": data}
            elif func in (SCALEMON_CREATE, SCALEMON_STEP):
                row["scaleMonTask"] = {"slot": slot, "func": hex(func), "priority": oracle.read_u8(base + 0x07), "data": data}
            elif func == PSYCHICBG_CREATE:
                row["psychicBgTask"] = {"slot": slot, "func": hex(func), "priority": oracle.read_u8(base + 0x07), "data": data}
            elif func not in KNOWN_FUNCS:
                row["unknownTasks"].append({"slot": slot, "func": hex(func), "priority": oracle.read_u8(base + 0x07), "data": data})

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
