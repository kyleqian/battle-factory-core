#!/usr/bin/env python3
"""Dev-time RAM probe: full struct BattlePokemon (include/pokemon.h) for a
chosen battler slot at chosen ticks, including moves/PP/item/ability (not
covered by dump-battler-snapshot.py's stat-only subset). Built for S8's
Murkrow scout (docs/battle-turn-notes.md §15) but generic to any battler.

Extended for ISSUES #21 (docs/battle-turn-notes.md §18 damage-math gap):
also reads statStages[] (offset 0x18, pokemon.h:277, NUM_BATTLE_STATS=8:
HP/ATK/DEF/SPEED/SPATK/SPDEF/ACC/EVASION) plus gSideStatuses/gSideTimers
(both sides) and gCritMultiplier/gBattleMovePower, so a damage-calc
reconstruction has every CalculateBaseDamage input available, not just the
raw stats dump-battler-snapshot.py already covered.

Run with the harness's mGBA-enabled interpreter (NOT system python3):
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
        tools/probe/dump-battler-full.py <trace.json> <output.json> <tick1,tick2,...>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> <tick1,tick2,...>")
TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
TARGET_TICKS = {int(x) for x in sys.argv[3].split(",")}

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

# struct BattlePokemon (include/pokemon.h): sizeof == 0x58.
STRUCT_SIZE = 0x58
MAX_BATTLERS = 4
MAX_MON_MOVES = 4
NUM_BATTLE_STATS = 8  # HP,ATK,DEF,SPEED,SPATK,SPDEF,ACC,EVASION (constants/pokemon.h)
NUM_BATTLE_SIDES = 2
# struct SideTimer (include/battle.h): sizeof == 11 bytes, no padding (all u8).
SIDE_TIMER_SIZE = 11


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()
    gbm = oracle.symbols["gBattleMons"]
    g_side_statuses = oracle.symbols["gSideStatuses"]
    g_side_timers = oracle.symbols["gSideTimers"]
    g_crit_multiplier = oracle.symbols["gCritMultiplier"]
    g_battle_move_power = oracle.symbols["gBattleMovePower"]

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def u32(addr: int) -> int:
        return (
            oracle.read_u8(addr)
            | (oracle.read_u8(addr + 1) << 8)
            | (oracle.read_u8(addr + 2) << 16)
            | (oracle.read_u8(addr + 3) << 24)
        )

    def s8(val: int) -> int:
        return val - 256 if val >= 128 else val

    def read_battler(idx: int) -> dict:
        base = gbm + idx * STRUCT_SIZE
        return {
            "species": u16(base + 0x00),
            "attack": u16(base + 0x02),
            "defense": u16(base + 0x04),
            "speed": u16(base + 0x06),
            "spAttack": u16(base + 0x08),
            "spDefense": u16(base + 0x0A),
            "moves": [u16(base + 0x0C + 2 * i) for i in range(MAX_MON_MOVES)],
            "statStages": [s8(oracle.read_u8(base + 0x18 + i)) for i in range(NUM_BATTLE_STATS)],
            "ability": oracle.read_u8(base + 0x20),
            "types": [oracle.read_u8(base + 0x21), oracle.read_u8(base + 0x22)],
            "pp": [oracle.read_u8(base + 0x24 + i) for i in range(MAX_MON_MOVES)],
            "hp": u16(base + 0x28),
            "level": oracle.read_u8(base + 0x2A),
            "maxHP": u16(base + 0x2C),
            "item": u16(base + 0x2E),
            "status1": u32(base + 0x4C),
            "status2": u32(base + 0x50),
        }

    def read_side_timer(idx: int) -> dict:
        base = g_side_timers + idx * SIDE_TIMER_SIZE
        fields = [
            "reflectTimer", "reflectBattlerId", "lightscreenTimer", "lightscreenBattlerId",
            "mistTimer", "mistBattlerId", "safeguardTimer", "safeguardBattlerId",
            "followmeTimer", "followmeTarget", "spikesAmount",
        ]
        return {name: oracle.read_u8(base + i) for i, name in enumerate(fields)}

    def snapshot() -> dict:
        out = {f"battler{i}": read_battler(i) for i in range(MAX_BATTLERS)}
        out["sideStatuses"] = [u16(g_side_statuses + 2 * i) for i in range(NUM_BATTLE_SIDES)]
        out["sideTimers"] = [read_side_timer(i) for i in range(NUM_BATTLE_SIDES)]
        out["critMultiplier"] = oracle.read_u8(g_crit_multiplier)
        out["battleMovePower"] = u16(g_battle_move_power)
        return out

    out = {}
    tick = 0
    if tick in TARGET_TICKS:
        out[tick] = snapshot()
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if tick in TARGET_TICKS:
                out[tick] = snapshot()

    OUTPUT_PATH.write_text(json.dumps(out, indent=0))


main()
