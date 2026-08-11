#!/usr/bin/env python3
"""Record Factory swap quit boundaries without reading framebuffer data.

Run through tools/run-mgba-probe.py.  The trace is deterministic, but this
probe intentionally records only task ownership, input state, party identity,
script result, and RNG; its JSON is the compact handoff for the live UI work.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> <startTick> <endTick>")

TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
START_TICK = int(sys.argv[3])
END_TICK = int(sys.argv[4])
HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / 'oracle' / 'emerald_core.py').is_file():
            return candidate
    raise SystemExit('could not find harness root above worktree')


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
sys.path.insert(0, str(HARNESS_ROOT / 'oracle'))
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE = (WORKTREE_ROOT / 'reference' / 'pokeemerald').resolve()
BOOTSTRAP_PATH = HARNESS_ROOT / 'oracle' / 'bootstrap' / 'factory-battle-scene-off.json'
GTASKS, TASK_SIZE, TASK_FUNC, TASK_ACTIVE, TASK_DATA = 0x03005E00, 0x28, 0, 4, 8
SFACTORY_SWAP_SCREEN, GMAIN, GSPECIALVAR_RESULT = 0x03001284, 0x030022C0, 0x020375F0
GPLAYERPARTY, PARTY_MON_SIZE, GRNGVALUE = 0x020244EC, 0x64, 0x03005D80
SWAP_CURSOR_POS, SWAP_IN_ENEMY_SCREEN, SWAP_YES_NO_CURSOR = 0x03, 0x14, 0x16
SWAP_ACTIONS_COUNT, SWAP_MON_SWAPPED = 0x17, 0x20

FUNCTIONS = {
    0x0819CA08: 'Swap_Task_Exit',
    0x0819CB1C: 'Swap_Task_HandleYesNo',
    0x0819CBDC: 'Swap_HandleQuitSwappingResponse',
    0x0819CC24: 'Swap_AskQuitSwapping',
    0x0819CE40: 'Swap_Task_HandleChooseMons',
    0x0819CF54: 'Swap_Task_FadeSpeciesName',
    0x0819D588: 'Swap_Task_ScreenInfoTransitionOut',
    0x0819D770: 'Swap_Task_ScreenInfoTransitionIn',
}
CALLBACKS = {0x080861B0: 'CB2_ReturnToFieldContinueScript'}
SUBSTRUCT_ORDERS = (
    (0, 1, 2, 3), (0, 1, 3, 2), (0, 2, 1, 3), (0, 3, 1, 2), (0, 2, 3, 1), (0, 3, 2, 1),
    (1, 0, 2, 3), (1, 0, 3, 2), (2, 0, 1, 3), (3, 0, 1, 2), (2, 0, 3, 1), (3, 0, 2, 1),
    (1, 2, 0, 3), (1, 3, 0, 2), (2, 1, 0, 3), (3, 1, 0, 2), (2, 3, 0, 1), (3, 2, 0, 1),
    (1, 2, 3, 0), (1, 3, 2, 0), (2, 1, 3, 0), (3, 1, 2, 0), (2, 3, 1, 0), (3, 2, 1, 0),
)


def u16(oracle: EmeraldOracle, addr: int) -> int:
    return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)


def u32(oracle: EmeraldOracle, addr: int) -> int:
    return sum(oracle.read_u8(addr + shift) << (8 * shift) for shift in range(4))


def party_mon(oracle: EmeraldOracle) -> dict:
    personality, ot_id = u32(oracle, GPLAYERPARTY), u32(oracle, GPLAYERPARTY + 4)
    key = personality ^ ot_id
    type0 = SUBSTRUCT_ORDERS[personality % 24][0]
    word0 = u32(oracle, GPLAYERPARTY + 0x20 + type0 * 12) ^ key
    word2 = u32(oracle, GPLAYERPARTY + 0x28 + type0 * 12) ^ key
    return {'species': word0 & 0xFFFF, 'personality': personality, 'friendship': (word2 >> 8) & 0xFF}


def main() -> None:
    trace = json.loads(TRACE_PATH.read_text())
    oracle = EmeraldOracle(REFERENCE / 'pokeemerald.gba', REFERENCE / 'pokeemerald.map', BOOTSTRAP_PATH)
    oracle.new_session()
    rows, previous, tick = [], None, 0

    def snapshot() -> dict:
        screen = u32(oracle, SFACTORY_SWAP_SCREEN)
        row = {
            'tick': tick,
            'framebufferSha256': hashlib.sha256(oracle.screen_rgb()).hexdigest(),
            'callback2': CALLBACKS.get(u32(oracle, GMAIN + 4) & ~1, f"0x{u32(oracle, GMAIN + 4) & ~1:08x}"),
            'rngValue': f"0x{u32(oracle, GRNGVALUE):08x}",
            'specialVarResult': u16(oracle, GSPECIALVAR_RESULT),
            'playerParty0': party_mon(oracle),
            'swapScreen': None,
            'swapTasks': [],
        }
        if screen:
            row['swapScreen'] = {
                'cursorPos': oracle.read_u8(screen + SWAP_CURSOR_POS),
                'inEnemyScreen': oracle.read_u8(screen + SWAP_IN_ENEMY_SCREEN),
                'yesNoCursorPos': oracle.read_u8(screen + SWAP_YES_NO_CURSOR),
                'actionsCount': oracle.read_u8(screen + SWAP_ACTIONS_COUNT),
                'monSwapped': oracle.read_u8(screen + SWAP_MON_SWAPPED),
            }
        for task_id in range(16):
            task = GTASKS + task_id * TASK_SIZE
            if not oracle.read_u8(task + TASK_ACTIVE):
                continue
            func = u32(oracle, task + TASK_FUNC) & ~1
            if func in FUNCTIONS:
                row['swapTasks'].append({'id': task_id, 'func': FUNCTIONS[func], 'state': u16(oracle, task + TASK_DATA)})
        return row

    def record() -> None:
        nonlocal previous
        if not START_TICK <= tick <= END_TICK:
            return
        row = snapshot()
        comparable = {key: value for key, value in row.items() if key not in ('tick', 'rngValue', 'framebufferSha256')}
        # RNG advances every VBlank, so retain it only at semantic boundaries.
        if comparable != previous:
            rows.append(row)
            previous = comparable

    record()
    for segment in trace['segments']:
        for _ in range(segment['frames']):
            tick += 1
            oracle.advance(segment.get('buttons', []))
            record()
    OUTPUT_PATH.write_text(json.dumps({'trace': str(TRACE_PATH), 'range': [START_TICK, END_TICK], 'rows': rows}, indent=2) + '\n')


main()
