#!/usr/bin/env python3
"""RAM probe that derived docs/forced-switch-ground-truth.md §3's player-side
forced-switch button recipe.

Stages tools/battle-lab/mechanic-forced-switch-player-choice-off.json (the
opponent's URSARING one-shots the player's SUNKERN turn 1; PIDGEY/MACHOP are
healthy bench slots 1/2), submits SUNKERN's move via the standard action-
select recipe, then either idles (no PROBE_STEPS) or drives a candidate
button sequence starting at PROBE_START_TICK, logging gPartyMenu
(menuType/layout/slotId/slotId2/action/data0), gActionSelectionCursor[0],
gBattlerPartyIndexes[0], gBattleControllerExecFlags, and gPaletteFade's raw
u32 header every tick a value changes.

What this found (see the ground-truth doc for the full writeup): idling with
zero button presses after the kill leaves gPartyMenu untouched indefinitely
-- the ordinary "SUNKERN fainted!" battle text is gating progress the same
way it gates every other turn's text, and needs an A press to dismiss (ruled
out via source read: it is not the EXP-gain message, which Cmd_getexp always
skips for BATTLE_TYPE_FRONTIER). A dense periodic A-mash (matching the
convention every other committed hit-chain fixture already uses) dismisses
it; gPartyMenu.action then reads PARTY_ACTION_SEND_OUT (1) with the cursor
defaulting to the fainted slot 0. DOWN (not RIGHT -- RIGHT only jumps *from*
slot 0 once) walks the cursor down to the target bench slot one at a time;
A, A opens and confirms the SEND OUT/SUMMARY/CANCEL submenu's default
option, same submenu-commit mechanism the voluntary-switch recipe found.

Run only through tools/run-mgba-probe.py.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) < 3:
    raise SystemExit(
        f"usage: {sys.argv[0]} <output.json> <probeStartTick> "
        "[button:frames ...] (e.g. RIGHT:1 WAIT:60 A:2 WAIT:150)"
    )

OUTPUT_PATH = Path(sys.argv[1])
PROBE_START_TICK = int(sys.argv[2])
PROBE_STEPS = sys.argv[3:]

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

SCENARIO_PATH = WORKTREE_ROOT / "tools" / "battle-lab" / "mechanic-forced-switch-player-choice-off.json"


def main() -> None:
    scenario = json.loads(SCENARIO_PATH.read_text())
    reference = (WORKTREE_ROOT / "reference" / "pokeemerald").resolve()
    bootstrap = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"
    oracle = EmeraldOracle(reference / "pokeemerald.gba", reference / "pokeemerald.map", bootstrap)
    request = validate_request(scenario, "battle-scene-off")
    lab = BattleLab(oracle, "battle-scene-off")
    lab.prepare(request)

    sym = oracle.symbols
    party_menu = sym["gPartyMenu"]
    action_cursor = sym["gActionSelectionCursor"]
    party_indexes = sym["gBattlerPartyIndexes"]
    exec_flags = sym["gBattleControllerExecFlags"]
    palette_fade = sym["gPaletteFade"]
    controller_funcs = sym["gBattlerControllerFuncs"]
    main_func = sym["gBattleMainFunc"]
    action_func_id = sym["gCurrentActionFuncId"]

    def state():
        return {
            "menuTypeLayout": oracle.read_u8(party_menu + 8),
            "slotId": oracle.read_u8(party_menu + 9),
            "slotId2": oracle.read_u8(party_menu + 10),
            "action": oracle.read_u8(party_menu + 11),
            "data0": oracle.read_u8(party_menu + 14) | (oracle.read_u8(party_menu + 15) << 8),
            "actionCursor0": oracle.read_u8(action_cursor),
            "partyIndex0": oracle.read_u8(party_indexes),
            "execFlags": oracle.read_u32(exec_flags),
            "paletteFadeHdr": oracle.read_u32(palette_fade + 4),
            "playerHp": oracle.read_u16(sym["gBattleMons"] + 0x28),
            "opponentHp": oracle.read_u16(sym["gBattleMons"] + 0x58 + 0x28),
            "rngValue": oracle.read_u32(sym["gRngValue"]),
            "controllerFunc0": hex(oracle.read_u32(controller_funcs)),
            "mainFunc": hex(oracle.read_u32(main_func)),
            "actionFuncId": oracle.read_u8(action_func_id),
        }

    ledger = []
    last = None
    tick = 0

    def maybe_record(note=""):
        nonlocal last
        s = state()
        if s != last:
            ledger.append({"tick": tick, **s, "note": note})
            last = s

    maybe_record("start")

    def advance(buttons, n=1, note=""):
        nonlocal tick
        for _ in range(n):
            oracle.advance(buttons)
            tick += 1
            maybe_record(note)

    # Standard action-select: submit SUNKERN's only move (slot 0, TACKLE).
    advance(["A"], 2, "open FIGHT")
    advance([], 30, "wait")
    advance(["A"], 2, "confirm move1")

    # Idle until the probe window, watching for the kill + forced menu init.
    # Press A periodically (dense-button-mash convention used by the other
    # committed hit-chain/switch fixtures) in case a text box (e.g. the
    # "SUNKERN fainted!" message) is gating progress the same way it does
    # for ordinary turn text. Stop as soon as gPartyMenu.action goes
    # non-zero (PARTY_ACTION_SEND_OUT) so we don't blindly press further
    # once the real party menu is up.
    idle_target = PROBE_START_TICK
    while tick < idle_target and state()["action"] == 0:
        advance(["A"], 2, "mash-A")
        advance([], min(18, idle_target - tick), "mash-wait")

    # Apply the candidate probe sequence: PROBE_STEPS is BUTTON:FRAMES pairs.
    for step in PROBE_STEPS:
        name, frames = step.split(":")
        frames = int(frames)
        buttons = [] if name == "WAIT" else [name]
        advance(buttons, frames, step)

    # Tail idle so we can see whether the switch ever lands.
    advance([], 2200, "tail")

    OUTPUT_PATH.write_text(json.dumps({"ledger": ledger, "finalTick": tick}, indent=2))


main()
