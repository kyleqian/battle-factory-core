#!/usr/bin/env python3
"""RAM probe for the LOSS-path terminal-seam residual classes (ISSUES #73,
docs/terminal-seam-loss-path-ground-truth.md §6): the held-cursor freeze
during the trainer slide (ticks ~2996-3033) and the swap-edge typing
cascade at the antecedent->quote handoff (ticks ~3034-3057).

Stages the committed fixture
tools/battle-lab/loss-terminal-explosion-dusclops-off.json (mechanicLab,
guaranteed-loss via Explosion vs Dusclops - see
docs/terminal-seam-loss-path-ground-truth.md §0) via BattleLab.prepare(),
then replays that fixture's own trace.segments verbatim (same recipe the
committed captures already reproduce byte-identically) while recording,
every tick, window 0's (B_WIN_MSG's) file-static `sTextPrinters[0]` struct
(`text.h`'s `struct TextPrinter`/`TextPrinterSubStruct`, address pinned by
docs/turn17-notes.md's own nm read: 0x020201b0, confirmed here via
B_WIN_MSG==0, sTempTextPrinter+sizeof(TextPrinter) arithmetic against the
text.o ewram_data section size in the .map), gBattlescriptCurrInstr,
gBattleControllerExecFlags, the opponent controller command byte, and
gBattlerControllerFuncs[1] (the opponent battler's live controller
function pointer, resolved back to a symbol name for readability).

Run only through tools/run-mgba-probe.py, e.g.:
    python3 tools/run-mgba-probe.py /tmp/loss-terminal-swap-out.json -- \
        python3 tools/probe/dump-loss-terminal-swap-textprinter.py \
        /tmp/loss-terminal-swap-out.json 2895 3240
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit(f"usage: {sys.argv[0]} <output.json> <startTick> <endTick>")

OUTPUT_PATH = Path(sys.argv[1])
START_TICK = int(sys.argv[2])
END_TICK = int(sys.argv[3])

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
BOOTSTRAP_PATH = ORACLE_DIR / "bootstrap" / "factory-battle-scene-off.json"
SCENARIO_PATH = WORKTREE_ROOT / "tools" / "battle-lab" / "loss-terminal-explosion-dusclops-off.json"

# window 0 == B_WIN_MSG (constants/battle.h:347). sTextPrinters is a
# file-static EWRAM_DATA array in text.c; docs/turn17-notes.md already
# nm-pinned slot 0 at 0x020201b0 for this same struct on the WIN-path
# terminal seam. struct TextPrinter layout (text.h:53-97), byte offsets:
STP0 = 0x020201B0
STP_STRIDE = 0x24
OFF_CURRENT_CHAR = 0x00  # const u8 * (printerTemplate.currentChar)
OFF_WINDOW_ID = 0x04
OFF_CURRENT_X = 0x08
OFF_CURRENT_Y = 0x09
OFF_CALLBACK = 0x10
OFF_SUBSTRUCT = 0x14  # subStructFields[7]; TextPrinterSubStruct overlays bytes 0-1
OFF_ACTIVE = 0x1B
OFF_STATE = 0x1C
OFF_TEXT_SPEED = 0x1D
OFF_DELAY_COUNTER = 0x1E


def main() -> None:
    scenario = json.loads(SCENARIO_PATH.read_text())
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    request = validate_request(scenario, "battle-scene-off")
    lab = BattleLab(oracle, "battle-scene-off")
    lab.prepare(request)

    sym = oracle.symbols
    addr_to_symbol = {v: k for k, v in sym.items() if isinstance(v, int)}

    def sym_name(addr: int) -> str:
        return addr_to_symbol.get(addr, hex(addr))

    curr_instr_addr = sym["gBattlescriptCurrInstr"]
    exec_flags_addr = sym["gBattleControllerExecFlags"]
    outcome_addr = sym["gBattleOutcome"]
    active_battler_addr = sym["gActiveBattler"]
    buffer_a_addr = sym["gBattleBufferA"]
    controller_funcs_addr = sym["gBattlerControllerFuncs"]
    main_cb2_addr = sym["gMain"] + 4
    displayed_string_addr = sym["gDisplayedStringBattle"]

    def read_bytes(addr: int, n: int) -> list:
        return [oracle.read_u8(addr + i) for i in range(n)]

    def text_printer_state() -> dict:
        base = STP0
        sub0 = oracle.read_u8(base + OFF_SUBSTRUCT)
        sub1 = oracle.read_u8(base + OFF_SUBSTRUCT + 1)
        current_char = oracle.read_u32(base + OFF_CURRENT_CHAR)
        glyph = oracle.read_u8(current_char) if current_char else None
        return {
            "active": oracle.read_u8(base + OFF_ACTIVE),
            "state": oracle.read_u8(base + OFF_STATE),
            "windowId": oracle.read_u8(base + OFF_WINDOW_ID),
            "currentCharPtr": hex(current_char),
            "currentCharOffsetFromDisplayedString": current_char - displayed_string_addr,
            "glyphAtCurrentChar": glyph,
            "currentX": oracle.read_u8(base + OFF_CURRENT_X),
            "currentY": oracle.read_u8(base + OFF_CURRENT_Y),
            "callback": hex(oracle.read_u32(base + OFF_CALLBACK)),
            "textSpeed": oracle.read_u8(base + OFF_TEXT_SPEED),
            "delayCounter": oracle.read_u8(base + OFF_DELAY_COUNTER),
            # TextPrinterSubStruct (text.h:53-62), LSB-first GCC/ARM bitfield packing:
            "fontId": sub0 & 0xF,
            "hasPrintBeenSpedUp": (sub0 >> 4) & 0x1,
            "downArrowDelay": sub1 & 0x1F,
            "downArrowYPosIdx": (sub1 >> 5) & 0x3,
            "hasFontIdBeenSet": (sub1 >> 7) & 0x1,
        }

    def state() -> dict:
        return {
            "battlescriptCurrInstr": hex(oracle.read_u32(curr_instr_addr)),
            "execFlags": oracle.read_u32(exec_flags_addr),
            "battleOutcome": oracle.read_u8(outcome_addr),
            "activeBattler": oracle.read_u8(active_battler_addr),
            "playerControllerCommand": oracle.read_u8(buffer_a_addr),
            "opponentControllerCommand": oracle.read_u8(buffer_a_addr + 0x200),
            "opponentControllerFunc": sym_name(oracle.read_u32(controller_funcs_addr + 1 * 4)),
            "mainCallback2": hex(oracle.read_u32(main_cb2_addr)),
            "textPrinter0": text_printer_state(),
            "displayedStringHead16": [hex(b) for b in read_bytes(displayed_string_addr, 16)],
        }

    segments = request["trace"]["segments"]
    ticks_out = []
    tick = 0

    def maybe_record():
        if START_TICK <= tick <= END_TICK:
            ticks_out.append({"tick": tick, **state()})

    maybe_record()
    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            maybe_record()
        if tick > END_TICK:
            break

    OUTPUT_PATH.write_text(json.dumps({"ticks": ticks_out, "finalTick": tick}, indent=0))


main()
