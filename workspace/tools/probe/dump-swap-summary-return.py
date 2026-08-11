#!/usr/bin/env python3
"""Record the OFF swap SUMMARY handoff/return without persisting pixels.

Run through tools/run-mgba-probe.py.  This intentionally records only source
state, task/callback ownership, party/rental identity, and RNG checkpoints.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(f'usage: {sys.argv[0]} <trace.json> <output.json> <startTick> <endTick>')

TRACE_PATH, OUTPUT_PATH = Path(sys.argv[1]), Path(sys.argv[2])
START_TICK, END_TICK = int(sys.argv[3]), int(sys.argv[4])
HERE, WORKTREE_ROOT = Path(__file__).resolve().parent, Path(__file__).resolve().parents[2]


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / 'oracle' / 'emerald_core.py').is_file():
            return candidate
    raise SystemExit('could not find harness root above worktree')


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
sys.path.insert(0, str(HARNESS_ROOT / 'oracle'))
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE = (WORKTREE_ROOT / 'reference' / 'pokeemerald').resolve()
GTASKS, TASK_SIZE, TASK_FUNC, TASK_ACTIVE, TASK_DATA = 0x03005E00, 0x28, 0, 4, 8
GMAIN, SFACTORY_SWAP_SCREEN, SMON_SUMMARY_SCREEN, GPALETTE_FADE = 0x030022C0, 0x03001284, 0x0203CF1C, 0x02037FD4
GLAST_VIEWED_MON_INDEX, GRNGVALUE, GSAVEBLOCK2PTR = 0x0203CF20, 0x03005D80, 0x03005D90
GPLAYERPARTY, PARTY_MON_SIZE, RENTALS_OFFSET = 0x020244EC, 0x64, 0xE70
SWAP_CURSOR_POS, SWAP_FROM_SUMMARY, SWAP_IN_ENEMY_SCREEN, SWAP_ACTIONS_COUNT = 0x03, 0x15, 0x14, 0x17
FUNCTIONS = {
    0x0819C7E0: 'Swap_CB2',
    0x0819C90C: 'Swap_Task_OpenSummaryScreen',
    0x0819CD34: 'Swap_Task_HandleMenu',
    0x0819CE40: 'Swap_Task_HandleChooseMons',
    0x0819DC1C: 'CB2_InitSwapScreen',
    0x081BFAE4: 'CB2_InitSummaryScreen',
    0x081C0510: 'Summary_Task_HandleInput',
}
SUBSTRUCT_ORDERS = (
    (0, 1, 2, 3), (0, 1, 3, 2), (0, 2, 1, 3), (0, 3, 1, 2), (0, 2, 3, 1), (0, 3, 2, 1),
    (1, 0, 2, 3), (1, 0, 3, 2), (2, 0, 1, 3), (3, 0, 1, 2), (2, 0, 3, 1), (3, 0, 2, 1),
    (1, 2, 0, 3), (1, 3, 0, 2), (2, 1, 0, 3), (3, 1, 0, 2), (2, 3, 0, 1), (3, 2, 0, 1),
    (1, 2, 3, 0), (1, 3, 2, 0), (2, 1, 3, 0), (3, 1, 2, 0), (2, 3, 1, 0), (3, 2, 1, 0),
)


def u16(oracle: EmeraldOracle, address: int) -> int:
    return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8


def u32(oracle: EmeraldOracle, address: int) -> int:
    return u16(oracle, address) | u16(oracle, address + 2) << 16


def mon(oracle: EmeraldOracle, slot: int) -> dict:
    base = GPLAYERPARTY + slot * PARTY_MON_SIZE
    personality = u32(oracle, base)
    key = personality ^ u32(oracle, base + 4)
    type0 = SUBSTRUCT_ORDERS[personality % 24][0]
    word0 = u32(oracle, base + 0x20 + type0 * 12) ^ key
    return {'speciesId': word0 & 0xffff, 'personality': personality}


def snapshot(oracle: EmeraldOracle, tick: int) -> dict:
    screen, summary = u32(oracle, SFACTORY_SWAP_SCREEN), u32(oracle, SMON_SUMMARY_SCREEN)
    tasks = []
    for task_id in range(16):
        address = GTASKS + task_id * TASK_SIZE
        if not oracle.read_u8(address + TASK_ACTIVE):
            continue
        func = u32(oracle, address + TASK_FUNC) & ~1
        if func in FUNCTIONS:
            tasks.append({'id': task_id, 'func': FUNCTIONS[func], 'state': u16(oracle, address + TASK_DATA)})
    save2 = u32(oracle, GSAVEBLOCK2PTR)
    rentals = [u16(oracle, save2 + RENTALS_OFFSET + slot * 12) for slot in range(6)]
    return {
        'tick': tick,
        'rng': f'0x{u32(oracle, GRNGVALUE):08x}',
        'callback2': FUNCTIONS.get(u32(oracle, GMAIN + 4) & ~1, f"0x{u32(oracle, GMAIN + 4) & ~1:08x}"),
        'paletteFadeActive': bool(u16(oracle, GPALETTE_FADE + 6) & 0x8000),
        'lastViewedMonIndex': oracle.read_u8(GLAST_VIEWED_MON_INDEX),
        'swapScreen': None if not screen else {
            'fromSummaryScreen': bool(oracle.read_u8(screen + SWAP_FROM_SUMMARY)),
            'menuCursorPos': oracle.read_u8(screen),
            'cursorPos': oracle.read_u8(screen + SWAP_CURSOR_POS),
            'inEnemyScreen': bool(oracle.read_u8(screen + SWAP_IN_ENEMY_SCREEN)),
            'actionsCount': oracle.read_u8(screen + SWAP_ACTIONS_COUNT),
        },
        # The source call supplies the summary mode/index arguments.  The
        # pointer is intentionally treated as allocation ownership only: the
        # close routine frees it without nulling this static pointer.
        'summaryScreenAllocated': bool(summary),
        'tasks': tasks,
        'playerParty': [mon(oracle, slot) for slot in range(3)],
        'rentalMons': rentals,
    }


def main() -> None:
    trace = json.loads(TRACE_PATH.read_text())
    oracle = EmeraldOracle(REFERENCE / 'pokeemerald.gba', REFERENCE / 'pokeemerald.map', HARNESS_ROOT / 'oracle/bootstrap/factory-battle-scene-off.json')
    oracle.new_session()
    rows, previous, tick = [], None, 0

    def record() -> None:
        nonlocal previous
        if not START_TICK <= tick <= END_TICK:
            return
        row = snapshot(oracle, tick)
        comparable = {key: value for key, value in row.items() if key not in ('tick', 'rng')}
        if comparable != previous:
            rows.append(row)
            previous = comparable

    record()
    for segment in trace['segments']:
        for _ in range(int(segment['frames'])):
            oracle.advance(segment.get('buttons', []))
            tick += 1
            record()
    OUTPUT_PATH.write_text(json.dumps({'profile': 'battle-scene-off', 'range': [START_TICK, END_TICK], 'rows': rows}, indent=2) + '\n')


main()
