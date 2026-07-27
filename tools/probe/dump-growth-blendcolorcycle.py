#!/usr/bin/env python3
"""MOVE_GROWTH's two components: `AnimTask_BlendColorCycle` (the family's
shared, still-unported task state machine, `battle_anim_normal.c:447-506`)
and `AnimTask_ScaleMonAndRestore` (already ported generically in
src/animation/bind.ts, proven via MOVE_BIND - this probe re-confirms it applies
unchanged to GROWTH's own argv: xDelta=-3, yDelta=-3, duration=16,
ANIM_ATTACKER).

Dumps, every tick: raw bytes of `gPaletteFade` (0x2037fd4, `include/palette.h`
bitfield struct - decoded here rather than assumed, since no prior session
RAM-probed its exact byte layout), the attacker's own OBJ palette row in
`gPlttBufferFaded` (0x2037b14 + 0x100*2 + battlerId*16*2), and any active
gTasks slot matching AnimTask_BlendColorCycle[_Loop] or
AnimTask_ScaleMonAndRestore[_Step]'s own func pointers (`nm` against the
pinned elf, creation-tick vs every-tick-after per the ShakeMon/SHADOW_PUNCH
probe convention).

Addresses:
  gTasks                = 0x03005e00
  gPaletteFade           = 0x02037fd4
  gPlttBufferFaded       = 0x02037b14
  gBattleAnimAttacker/Target = 0x02038436 / 0x02038437
  gBattlerSpriteIds      = 0x020241e4
  AnimTask_BlendColorCycle      = 0x08115a04 (creation tick)
  AnimTask_BlendColorCycleLoop  = 0x08115aa4 (every tick after)
  AnimTask_ScaleMonAndRestore      = 0x080d6064 (creation tick)
  AnimTask_ScaleMonAndRestore_Step = 0x080d60bc (every tick after)

Run with the harness's mGBA-enabled interpreter (NOT system python3), via:
    python3 tools/run-mgba-probe.py <output.json> -- \
        <mgba-python> tools/probe/dump-growth-blendcolorcycle.py <scenario.json> <output.json> <startTick> <endTick>
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

GPALETTEFADE = 0x02037FD4
GPLTTBUFFERFADED = 0x02037B14

GBATTLEANIMATTACKER = 0x02038436
GBATTLEANIMTARGET = 0x02038437
GBATTLERSPRITEIDS = 0x020241E4

BLENDCYCLE_CREATE = 0x08115A04
BLENDCYCLE_LOOP = 0x08115AA4
SCALEMON_CREATE = 0x080D6064
SCALEMON_STEP = 0x080D60BC


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

        pf_bytes = [oracle.read_u8(GPALETTEFADE + i) for i in range(12)]
        pf_word0 = read_u32(GPALETTEFADE)  # multipurpose1 (selectedPalettes while a normal fade is active)
        pf_word1 = read_u32(GPALETTEFADE + 4)  # delayCounter:6 y:5 targetY:5 blendColor:15 active:1
        pf_word2 = read_u32(GPALETTEFADE + 8)  # multipurpose2:6 yDec:1 bufferTransferDisabled:1 mode:2
        # shouldResetBlendRegisters:1 hardwareFadeFinishing:1
        # softwareFadeFinishingCounter:5 softwareFadeFinishing:1 objPaletteToggle:1 deltaY:4

        attacker_row = [
            read_u16(GPLTTBUFFERFADED + (0x100 + attacker_battler * 16 + i) * 2)
            for i in range(16)
        ]

        row: dict = {
            "tick": tick,
            "attackerBattler": attacker_battler,
            "targetBattler": target_battler,
            "paletteFadeBytesHex": pf_bytes,
            "paletteFadeWord0": pf_word0,
            "paletteFadeWord1": pf_word1,
            "paletteFadeWord2": pf_word2,
            "attackerObjRow": attacker_row,
            "blendCycleTask": None,
            "scaleMonTask": None,
        }

        for slot in range(NUM_TASKS):
            base = GTASKS + slot * TASK_SIZE
            is_active = oracle.read_u8(base + 0x04)
            if not is_active:
                continue
            func = read_u32(base + 0x00) & ~1
            data = [read_u16(base + 0x08 + i * 2) for i in range(16)]
            if func in (BLENDCYCLE_CREATE, BLENDCYCLE_LOOP):
                row["blendCycleTask"] = {"slot": slot, "priority": oracle.read_u8(base + 0x07), "data": data}
            elif func in (SCALEMON_CREATE, SCALEMON_STEP):
                row["scaleMonTask"] = {"slot": slot, "priority": oracle.read_u8(base + 0x07), "data": data}

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
