#!/usr/bin/env python3
"""Record source-level state changes across the OFF enemy-swap picker.

This is deliberately an evidence probe, not a renderer input.  It replays a
normal oracle trace from the canonical Battle Scene OFF bootstrap and records
only changes to the live FactorySwapScreen fields, its owning task, and the
selected party record.  That makes picker readiness and accept/return
boundaries reproducible without harvesting any framebuffer data.

Run through the teardown-safe wrapper, for example:

  python3 tools/run-mgba-probe.py /tmp/swap-picker.json -- \\
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \\
    tools/probe/dump-swap-enemy-picker.py \\
    tools/compare/traces-groundtruth/battle1-swapyes-b.json \\
    /tmp/swap-picker.json 29780 30200

The addresses are static symbols from the pinned reference ELF.  The layout
offsets are from struct FactorySwapScreen in battle_factory_screen.c.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


if len(sys.argv) != 5:
    raise SystemExit(
        f"usage: {sys.argv[0]} <trace.json> <output.json> <startTick> <endTick>"
    )

TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
START_TICK = int(sys.argv[3])
END_TICK = int(sys.argv[4])

HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "oracle" / "emerald_core.py").is_file():
            return candidate
    raise SystemExit(f"could not find harness root above {start}")


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
ORACLE_DIR = HARNESS_ROOT / "oracle"
sys.path.insert(0, str(ORACLE_DIR))

from emerald_core import EmeraldOracle  # noqa: E402


REFERENCE = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
ROM_PATH = REFERENCE / "pokeemerald.gba"
MAP_PATH = REFERENCE / "pokeemerald.map"
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"

GTASKS = 0x03005E00
TASK_SIZE = 0x28
TASK_FUNC = 0x00
TASK_ACTIVE = 0x04
TASK_DATA = 0x08
SFACTORY_SWAP_SCREEN = 0x03001284
GPLAYERPARTY = 0x020244EC
GMAIN = 0x030022C0
GSPECIALVAR_RESULT = 0x020375F0
PARTY_MON_SIZE = 0x64

# FactorySwapScreen: fields before the first pointer are byte-packed; the
# actionsData pointer is naturally aligned at +24.  Only state fields that
# define the picker contract are recorded.
SWAP_MENU_CURSOR = 0x00
SWAP_CURSOR_POS = 0x03
SWAP_PLAYER_MON = 0x12
SWAP_ENEMY_MON = 0x13
SWAP_IN_ENEMY_SCREEN = 0x14
SWAP_YES_NO_CURSOR = 0x16
SWAP_ACTIONS_COUNT = 0x17
SWAP_MON_SWAPPED = 0x20

FUNCTIONS = {
    0x0819CA08: "Swap_Task_Exit",
    0x0819CB1C: "Swap_Task_HandleYesNo",
    0x0819CC74: "Swap_HandleAcceptMonResponse",
    0x0819CCD4: "Swap_AskAcceptMon",
    0x0819CE40: "Swap_Task_HandleChooseMons",
    0x0819CF54: "Swap_Task_FadeSpeciesName",
    0x0819D12C: "Swap_Task_SlideCycleBalls",
    0x0819D588: "Swap_Task_ScreenInfoTransitionOut",
    0x0819D770: "Swap_Task_ScreenInfoTransitionIn",
    0x0819D9EC: "Swap_Task_SwitchPartyScreen",
}

CALLBACKS = {
    0x080861B0: "CB2_ReturnToFieldContinueScript",
}

# GetSubstruct's personality % 24 cases, copied from pokemon.c:3607-3632.
# Each tuple gives the physical secure[] slot for type0..type3 respectively.
SUBSTRUCT_ORDERS = (
    (0, 1, 2, 3), (0, 1, 3, 2), (0, 2, 1, 3), (0, 3, 1, 2),
    (0, 2, 3, 1), (0, 3, 2, 1), (1, 0, 2, 3), (1, 0, 3, 2),
    (2, 0, 1, 3), (3, 0, 1, 2), (2, 0, 3, 1), (3, 0, 2, 1),
    (1, 2, 0, 3), (1, 3, 0, 2), (2, 1, 0, 3), (3, 1, 0, 2),
    (2, 3, 0, 1), (3, 2, 0, 1), (1, 2, 3, 0), (1, 3, 2, 0),
    (2, 1, 3, 0), (3, 1, 2, 0), (2, 3, 1, 0), (3, 2, 1, 0),
)


def u16(oracle: EmeraldOracle, addr: int) -> int:
    return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)


def u32(oracle: EmeraldOracle, addr: int) -> int:
    return (
        oracle.read_u8(addr)
        | (oracle.read_u8(addr + 1) << 8)
        | (oracle.read_u8(addr + 2) << 16)
        | (oracle.read_u8(addr + 3) << 24)
    )


def party_mon(oracle: EmeraldOracle, slot: int) -> dict:
    """Read the selected party mon without relying on a framebuffer label."""
    base = GPLAYERPARTY + slot * PARTY_MON_SIZE
    personality = u32(oracle, base)
    ot_id = u32(oracle, base + 4)
    key = personality ^ ot_id
    type0 = SUBSTRUCT_ORDERS[personality % 24][0]
    type0_base = base + 0x20 + type0 * 12
    word0 = u32(oracle, type0_base) ^ key
    word2 = u32(oracle, type0_base + 8) ^ key
    return {
        "species": word0 & 0xFFFF,
        "friendship": (word2 >> 8) & 0xFF,
        "personality": personality,
        "level": oracle.read_u8(base + 0x54),
        "hp": u16(oracle, base + 0x56),
        "maxHp": u16(oracle, base + 0x58),
    }


def main() -> None:
    trace = json.loads(TRACE_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    def snapshot(tick: int) -> dict:
        screen = u32(oracle, SFACTORY_SWAP_SCREEN)
        callback = u32(oracle, GMAIN + 4) & ~1
        result = {
            "tick": tick,
            "callback2": CALLBACKS.get(callback, f"0x{callback:08x}"),
            "specialVarResult": u16(oracle, GSPECIALVAR_RESULT),
            "playerParty0": party_mon(oracle, 0),
            "swapScreen": None,
            "swapTasks": [],
        }
        if screen:
            result["swapScreen"] = {
                "address": f"0x{screen:08x}",
                "menuCursorPos": oracle.read_u8(screen + SWAP_MENU_CURSOR),
                "cursorPos": oracle.read_u8(screen + SWAP_CURSOR_POS),
                "playerMonId": oracle.read_u8(screen + SWAP_PLAYER_MON),
                "enemyMonId": oracle.read_u8(screen + SWAP_ENEMY_MON),
                "inEnemyScreen": oracle.read_u8(screen + SWAP_IN_ENEMY_SCREEN),
                "yesNoCursorPos": oracle.read_u8(screen + SWAP_YES_NO_CURSOR),
                "actionsCount": oracle.read_u8(screen + SWAP_ACTIONS_COUNT),
                "monSwapped": oracle.read_u8(screen + SWAP_MON_SWAPPED),
            }
        for task_id in range(16):
            task = GTASKS + task_id * TASK_SIZE
            if not oracle.read_u8(task + TASK_ACTIVE):
                continue
            func = u32(oracle, task + TASK_FUNC) & ~1
            if func in FUNCTIONS:
                result["swapTasks"].append(
                    {
                        "id": task_id,
                        "func": FUNCTIONS[func],
                        "state": u16(oracle, task + TASK_DATA),
                        "data1": u16(oracle, task + TASK_DATA + 2),
                        "data2": u16(oracle, task + TASK_DATA + 4),
                        "data3": u16(oracle, task + TASK_DATA + 6),
                        "data4": u16(oracle, task + TASK_DATA + 8),
                    }
                )
        return result

    rows: list[dict] = []
    previous = None
    tick = 0

    def record_if_changed() -> None:
        nonlocal previous
        if not START_TICK <= tick <= END_TICK:
            return
        row = snapshot(tick)
        comparable = {key: value for key, value in row.items() if key != "tick"}
        if comparable != previous:
            rows.append(row)
            previous = comparable

    record_if_changed()
    for segment in trace["segments"]:
        for _ in range(int(segment["frames"])):
            oracle.advance(segment.get("buttons", []))
            tick += 1
            record_if_changed()

    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "profile": "battle-scene-off",
                "trace": str(TRACE_PATH),
                "range": [START_TICK, END_TICK],
                "rows": rows,
            },
            indent=2,
        )
    )


main()
