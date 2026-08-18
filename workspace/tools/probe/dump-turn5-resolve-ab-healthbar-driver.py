#!/usr/bin/env python3
"""ISSUES #97-B rung (resolve-off-a/b census, `docs/turn5-resolve-ab-pools-
diagnosis.md`): extends `dump-turn5-resolve-grovyle-side-driver.py`'s own
proven battle-scene-off replay (same bootstrap, same `turn5-resolve-off-a.json`
76-segment button script - byte-identical across the whole confirm/resolve-off
family) with the ON-SCREEN health-bar's own animated internals, which the
GROVYLE-side driver never read: `gBattleSpritesDataPtr` (a pointer) -> +0xC
(itself a pointer, `battleBars`) -> `struct BattleBarInfo battleBars[battler]`
(20 bytes: u8 healthboxSpriteId + 3 pad, s32 maxValue, s32 oldValue, s32
receivedValue, s32 currValue - `include/battle.h`, offsets confirmed against
`tools/probe/dump-battle-bars.py`, the prior probe that established this
struct's layout and the -32768 start-sentinel / 0 done-sentinel convention
(that probe's own docstring, `docs/battle-turn-notes.md` section 4)).

`gBattleMons[].hp` (the true stat) already updates almost synchronously with
combat math; `battleBars[battler].currValue` is a SEPARATE value the real
ROM animates toward `receivedValue` over many ticks (`MoveBattleBar`,
`battle_interface.c:2238`) - this is the value the on-screen bar fill is
actually drawn from (`CalcBarFilledPixels`), not `gBattleMons[].hp` directly.

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
      tools/probe/dump-turn5-resolve-ab-healthbar-driver.py <fresh-output.json> [startTick endTick]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) not in (2, 4):
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> [startTick endTick]")

OUTPUT_PATH = Path(sys.argv[1])
OVERRIDE_WINDOW = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) == 4 else None
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
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"
TRACE_PATH = WORKTREE_ROOT / "tools" / "compare" / "traces" / "turn5-resolve-off-a.json"

# Union of resolve-off-a (6222-6417) and resolve-off-b (6418-6613), plus a
# small margin on each end to see the drain's own start/end sentinels.
WINDOW = OVERRIDE_WINDOW if OVERRIDE_WINDOW is not None else (6180, 6620)
STRUCT_SIZE = 0x58

GBATTLESPRITESDATAPTR = 0x20244D0
BATTLE_BAR_INFO_SIZE = 20
BAR_MAX_VALUE_OFFSET = 0x04
BAR_OLD_VALUE_OFFSET = 0x08
BAR_RECEIVED_VALUE_OFFSET = 0x0C
BAR_CURR_VALUE_OFFSET = 0x10
MAX_BATTLERS = 4


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    gbm = oracle.symbols["gBattleMons"]

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def s32(addr: int) -> int:
        v = oracle.read_u32(addr)
        return v - (1 << 32) if v >= (1 << 31) else v

    def read_battler(idx: int) -> dict:
        base = gbm + idx * STRUCT_SIZE
        return {
            "species": u16(base + 0x00),
            "hp": u16(base + 0x28),
            "maxHP": u16(base + 0x2C),
        }

    def read_bar(idx: int, battle_bars_ptr: int) -> dict:
        if not battle_bars_ptr:
            return {"maxValue": None, "oldValue": None, "receivedValue": None, "currValue": None}
        base = battle_bars_ptr + idx * BATTLE_BAR_INFO_SIZE
        return {
            "maxValue": s32(base + BAR_MAX_VALUE_OFFSET),
            "oldValue": s32(base + BAR_OLD_VALUE_OFFSET),
            "receivedValue": s32(base + BAR_RECEIVED_VALUE_OFFSET),
            "currValue": s32(base + BAR_CURR_VALUE_OFFSET),
        }

    def record(tick: int) -> dict:
        sprites_ptr = oracle.read_u32(GBATTLESPRITESDATAPTR)
        battle_bars_ptr = oracle.read_u32(sprites_ptr + 0xC) if sprites_ptr else 0
        return {
            "tick": tick,
            "battler0_onix": read_battler(0),
            "battler1_foe": read_battler(1),
            "bar0": read_bar(0, battle_bars_ptr),
            "bar1": read_bar(1, battle_bars_ptr),
        }

    ticks_out = []
    tick = 0
    if WINDOW[0] <= tick <= WINDOW[1]:
        ticks_out.append(record(tick))

    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if WINDOW[0] <= tick <= WINDOW[1]:
                ticks_out.append(record(tick))
        if tick > WINDOW[1]:
            break

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({
        "sourceTrace": str(TRACE_PATH.relative_to(WORKTREE_ROOT)),
        "oracleProfile": "battle-scene-off",
        "window": WINDOW,
        "ticks": ticks_out,
    }, indent=0))


main()
