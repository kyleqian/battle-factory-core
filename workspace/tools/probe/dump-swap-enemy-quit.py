#!/usr/bin/env python3
"""Record OFF enemy-origin quit boundaries, including immutable swap data.

Run through tools/run-mgba-probe.py. Output contains only RAM/task facts and
raw framebuffer hashes at requested checkpoints; it creates no image files.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(f"usage: {sys.argv[0]} <trace.json> <output.json> <tick[,tick...]>")

TRACE_PATH = Path(sys.argv[1])
OUTPUT_PATH = Path(sys.argv[2])
CHECKPOINTS = {int(value) for value in sys.argv[3].split(',')}
HERE = Path(__file__).resolve().parent
WORKTREE_ROOT = HERE.parent.parent


def find_harness_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / 'oracle' / 'emerald_core.py').is_file():
            return candidate
    raise SystemExit(f'could not find harness root above {start}')


HARNESS_ROOT = find_harness_root(WORKTREE_ROOT)
sys.path.insert(0, str(HARNESS_ROOT / 'oracle'))
from emerald_core import EmeraldOracle  # noqa: E402

REFERENCE = (WORKTREE_ROOT / 'reference' / 'pokeemerald').resolve()
GTASKS, TASK_SIZE = 0x03005E00, 0x28
SFACTORY_SWAP_SCREEN, GMAIN = 0x03001284, 0x030022C0
GPLAYERPARTY, GENEMYPARTY, PARTY_MON_SIZE = 0x020244EC, 0x02024744, 0x64
GSAVEBLOCK2PTR, GRNGVALUE, GSPECIALVAR_RESULT = 0x03005D90, 0x03005D80, 0x020375F0
RENTALS_OFFSET = 0xE70
SUBSTRUCT_ORDERS = (
    (0, 1, 2, 3), (0, 1, 3, 2), (0, 2, 1, 3), (0, 3, 1, 2), (0, 2, 3, 1), (0, 3, 2, 1),
    (1, 0, 2, 3), (1, 0, 3, 2), (2, 0, 1, 3), (3, 0, 1, 2), (2, 0, 3, 1), (3, 0, 2, 1),
    (1, 2, 0, 3), (1, 3, 0, 2), (2, 1, 0, 3), (3, 1, 0, 2), (2, 3, 0, 1), (3, 2, 0, 1),
    (1, 2, 3, 0), (1, 3, 2, 0), (2, 1, 3, 0), (3, 1, 2, 0), (2, 3, 1, 0), (3, 2, 1, 0),
)
FUNCTIONS = {
    0x0819CA08: 'Swap_Task_Exit',
    0x0819CB1C: 'Swap_Task_HandleYesNo',
    0x0819CBDC: 'Swap_HandleQuitSwappingResponse',
    0x0819CC24: 'Swap_AskQuitSwapping',
    0x0819CE40: 'Swap_Task_HandleChooseMons',
    0x0819D588: 'Swap_Task_ScreenInfoTransitionOut',
    0x0819D770: 'Swap_Task_ScreenInfoTransitionIn',
}
CALLBACKS = {0x080861B0: 'CB2_ReturnToFieldContinueScript'}


def u16(oracle: EmeraldOracle, address: int) -> int:
    return oracle.read_u8(address) | oracle.read_u8(address + 1) << 8


def u32(oracle: EmeraldOracle, address: int) -> int:
    return u16(oracle, address) | u16(oracle, address + 2) << 16


def mon(oracle: EmeraldOracle, party_base: int, slot: int) -> dict:
    base = party_base + slot * PARTY_MON_SIZE
    personality = u32(oracle, base)
    key = personality ^ u32(oracle, base + 4)
    type0 = SUBSTRUCT_ORDERS[personality % 24][0]
    word0 = u32(oracle, base + 0x20 + type0 * 12) ^ key
    word2 = u32(oracle, base + 0x28 + type0 * 12) ^ key
    return {'species': word0 & 0xFFFF, 'personality': personality, 'friendship': (word2 >> 8) & 0xFF}


def snapshot(oracle: EmeraldOracle, tick: int) -> dict:
    screen = u32(oracle, SFACTORY_SWAP_SCREEN)
    tasks = []
    for task_id in range(16):
        address = GTASKS + task_id * TASK_SIZE
        if oracle.read_u8(address + 4):
            func = u32(oracle, address) & ~1
            if func in FUNCTIONS:
                tasks.append({'id': task_id, 'func': FUNCTIONS[func], 'state': u16(oracle, address + 8)})
    save2 = u32(oracle, GSAVEBLOCK2PTR)
    rentals = []
    for slot in range(6):
        address = save2 + RENTALS_OFFSET + slot * 12
        rentals.append({'monId': u16(oracle, address), 'personality': u32(oracle, address + 4), 'ivs': oracle.read_u8(address + 8), 'abilityNum': oracle.read_u8(address + 9)})
    return {
        'tick': tick,
        'framebufferSha256': hashlib.sha256(oracle.screen_rgb()).hexdigest(),
        'callback2': CALLBACKS.get(u32(oracle, GMAIN + 4) & ~1, f"0x{u32(oracle, GMAIN + 4) & ~1:08x}"),
        'rng': f'0x{u32(oracle, GRNGVALUE):08x}',
        'specialVarResult': u16(oracle, GSPECIALVAR_RESULT),
        'screen': None if not screen else {'cursorPos': oracle.read_u8(screen + 3), 'inEnemyScreen': oracle.read_u8(screen + 0x14), 'yesNoCursorPos': oracle.read_u8(screen + 0x16), 'actionsCount': oracle.read_u8(screen + 0x17), 'monSwapped': oracle.read_u8(screen + 0x20)},
        'tasks': tasks,
        'playerParty': [mon(oracle, GPLAYERPARTY, slot) for slot in range(3)],
        'enemyParty': [mon(oracle, GENEMYPARTY, slot) for slot in range(3)],
        'rentals': rentals,
    }


def main() -> None:
    trace = json.loads(TRACE_PATH.read_text())
    oracle = EmeraldOracle(REFERENCE / 'pokeemerald.gba', REFERENCE / 'pokeemerald.map', HARNESS_ROOT / 'oracle/bootstrap/factory-battle-scene-off.json')
    oracle.new_session()
    tick, rows = 0, []
    if tick in CHECKPOINTS:
        rows.append(snapshot(oracle, tick))
    for segment in trace['segments']:
        for _ in range(int(segment['frames'])):
            oracle.advance(segment.get('buttons', []))
            tick += 1
            if tick in CHECKPOINTS:
                rows.append(snapshot(oracle, tick))
    missing = CHECKPOINTS - {row['tick'] for row in rows}
    if missing:
        raise SystemExit(f'checkpoints not reached: {sorted(missing)}')
    OUTPUT_PATH.write_text(json.dumps({'profile': 'battle-scene-off', 'trace': str(TRACE_PATH), 'rows': rows}, indent=2) + '\n')


main()
