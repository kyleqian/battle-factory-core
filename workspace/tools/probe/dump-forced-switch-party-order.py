#!/usr/bin/env python3
"""RAM probe for the entry-445 question: does gBattlePartyCurrentOrder /
gBattleStruct->battlerPartyOrders actually permute in a way that matters for
the forced-switch mechanical path (SWITCHHANDLEORDER / GETSWITCHEDMONDATA)?

Replays a committed tools/battle-lab/mechanic-forced-switch-*.json trace
frame-by-frame (expanding its trace.segments so button timing matches the
oracle/vitest captures byte-for-byte) and dumps, at a caller-supplied list of
target ticks:
  - gBattlePartyCurrentOrder (3 bytes, player-side order table)
  - gBattlerPartyIndexes (u16 x4 -- the *raw* array index each battler slot
    currently has active; NOT the same struct field as the same-named
    u8 field inside struct BattleStruct)
  - gBattleMons[battler].species for battler 0/1 (sanity cross-check against
    the already-passing verify script's partyIndex/species claims)
  - a raw byte window over struct BattleStruct covering
    selectionScriptFinished/battlerPartyIndexes(u8)/monToSwitchIntoId/
    battlerPartyOrders, wide enough to pinpoint the real field offsets by
    diffing rather than trusting a hand-computed struct offset.

Writes its JSON result to <output.json> directly (rather than stdout) so
tools/run-mgba-probe.py's fresh-output-file contract is satisfied even if the
interpreter hits the known teardown SIGSEGV right after -- printing to stdout
and relying on pipe buffering to survive that crash is NOT reliable.

Run only through tools/run-mgba-probe.py, e.g.:
  python3 tools/run-mgba-probe.py /tmp/out.json -- \
    python3 tools/probe/dump-forced-switch-party-order.py /tmp/out.json \
    tools/battle-lab/mechanic-forced-switch-ai-choice-off.json 0 234 476 478 600
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) < 4:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> <scenario.json> <tick> [tick ...]")

OUTPUT_PATH = Path(sys.argv[1])
SCENARIO_ARG = Path(sys.argv[2])
TARGET_TICKS = sorted({int(t) for t in sys.argv[3:]})

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

from battle_lab import BattleLab, validate_request  # noqa: E402
from emerald_core import EmeraldOracle  # noqa: E402

SCENARIO_PATH = (WORKTREE_ROOT / SCENARIO_ARG).resolve() if not SCENARIO_ARG.is_absolute() else SCENARIO_ARG

# struct BattleStruct window: selectionScriptFinished starts at hand-computed
# offset 84 (see docs write-up); dump generously either side so a wrong
# hand-computed offset is still visible in the window and identifiable by
# diffing known values (PARTY_SIZE=6 sentinel, partyIndex 2 post-switch).
STRUCT_WINDOW_START = 76
STRUCT_WINDOW_LEN = 40


def main() -> None:
    scenario = json.loads(SCENARIO_PATH.read_text())
    reference = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
    bootstrap = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", bootstrap)
    request = validate_request(scenario, "battle-scene-off")
    lab = BattleLab(oracle, "battle-scene-off")
    lab.prepare(request)

    sym = oracle.symbols
    party_order = sym["gBattlePartyCurrentOrder"]
    battler_party_indexes = sym["gBattlerPartyIndexes"]
    battle_struct = sym["gBattleStruct"]
    battle_mons = sym["gBattleMons"]

    def read_struct_window():
        return [oracle.read_u8(battle_struct + STRUCT_WINDOW_START + i) for i in range(STRUCT_WINDOW_LEN)]

    def state():
        return {
            "gBattlePartyCurrentOrder": [oracle.read_u8(party_order + i) for i in range(3)],
            "gBattlerPartyIndexes": [oracle.read_u16(battler_party_indexes + 2 * i) for i in range(4)],
            "battler0Species": oracle.read_u16(battle_mons + 0 * 0x58 + 0x00),
            "battler1Species": oracle.read_u16(battle_mons + 1 * 0x58 + 0x00),
            "structWindow": read_struct_window(),
        }

    segments = scenario["trace"]["segments"]
    frame_buttons = []
    for seg in segments:
        frame_buttons.extend([seg.get("buttons", [])] * seg["frames"])

    readings = {}
    tick = 0
    if 0 in TARGET_TICKS:
        readings[0] = state()

    for buttons in frame_buttons:
        oracle.advance(buttons)
        tick += 1
        if tick in TARGET_TICKS:
            readings[tick] = state()
        if tick >= max(TARGET_TICKS):
            break

    out = {
        "scenario": str(SCENARIO_PATH.relative_to(WORKTREE_ROOT)),
        "structWindowStart": STRUCT_WINDOW_START,
        "readings": {str(k): v for k, v in sorted(readings.items())},
    }
    OUTPUT_PATH.write_text(json.dumps(out, indent=2))


main()
