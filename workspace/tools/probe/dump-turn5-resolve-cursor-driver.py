#!/usr/bin/env python3
"""ISSUES #97 sub-entry J's own "next instrument" (docs/turn5-resolve-ab-pools-diagnosis.md
§10's Class C addendum): RAM ground truth for the fainted-message wait-cursor's
real phase index across BOTH `resolve-off-b`'s own 6426-6560 mismatch span AND
`resolve-off-c`'s own 6614-6958 capture window (the span the reverted
`cursorState` swap regressed 195/196 -> 140/196, per ISSUES #97-J).

Reads `struct TextPrinterSubStruct.downArrowYPosIdx`/`downArrowDelay`
(`reference/pokeemerald/include/text.h:53-61`) directly - the real 2-bit
bitfield `TextPrinterDrawDownArrow` (`reference/pokeemerald/src/text.c:787-833`)
increments once every 9 ticks (`downArrowDelay:5` reloaded to 8, i.e. 8 ticks
skipped + 1 draw tick = 9) and STOPS incrementing forever once
`TextPrinterWaitWithDownArrow` (`text.c:849-863`) sees `JOY_NEW(A_BUTTON|B_BUTTON)`
- the on-screen arrow then simply stays at whatever tile was last blitted
(never redrawn), which is the real freeze mechanism turn 13's own
`opponentFaintPresentationOwner.dismiss.cursor.frozenAtElapsed` already models
generically. Both fields live in the SAME byte, `sTextPrinters[0]` + 0x15
(`subStructFields[1]`, right after the 0x14 `fontId:4|hasPrintBeenSpedUp:1|unk:3`
byte) - packed LSB-first per this ROM's own GCC/ARM bitfield convention
(`downArrowDelay` bits 0-4, `downArrowYPosIdx` bits 5-6, `hasFontIdBeenSet` bit 7),
same fixed EWRAM_DATA link address (0x020201B0) already pinned by
`dump-win-terminal-swap-textprinter.py`.

Same direct-`EmeraldOracle`/`factory-battle-scene-off.json` replay pattern
`dump-turn5-resolve-grovyle-side-driver.py` established, driven by
`turn5-resolve-off-a.json`'s own 76-segment button script - sha256-confirmed
byte-identical across all four `resolve-off-{a,b,c,d}` traces this session, so
replaying it alone reaches real ground truth for every one of their own
capture windows.

Samples every tick in [6420, 6970] by default (covers -b's own 6426-6560 span,
the ~6561-6562 KO-dismiss press, and -c's own 6614-6958 span) - override with
two extra argv ticks.

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
      tools/probe/dump-turn5-resolve-cursor-driver.py <fresh-output.json> [startTick endTick]
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

WINDOW = OVERRIDE_WINDOW if OVERRIDE_WINDOW is not None else (6420, 6970)
DISPLAYED_STRING_BYTES = 64

# B_WIN_MSG's sTextPrinters[0] (compile-time EWRAM_DATA link address, same
# ROM build as dump-win-terminal-swap-textprinter.py's own pin).
STP0 = 0x020201B0
OFF_ACTIVE = 0x1B
OFF_STATE = 0x1C
OFF_DELAY_COUNTER = 0x1E
# subStructFields[1] (0x14 + 1): downArrowDelay:5 (bits 0-4) | downArrowYPosIdx:2
# (bits 5-6) | hasFontIdBeenSet:1 (bit 7), LSB-first bitfield packing.
OFF_ARROW_BYTE = 0x15


def decode_displayed(raw: list) -> str:
    chars: list = []
    punctuation = {
        0x00: " ", 0xAB: "!", 0xAC: "?", 0xAD: ".", 0xAE: "-",
        0xB4: "'", 0xB8: ",", 0xBA: "/", 0xF0: ":",
    }
    for value in raw:
        if value == 0xFF:
            break
        if value == 0xFE:
            chars.append("\n")
        elif value in punctuation:
            chars.append(punctuation[value])
        elif 0xA1 <= value <= 0xAA:
            chars.append(str(value - 0xA1))
        elif 0xBB <= value <= 0xD4:
            chars.append(chr(ord("A") + value - 0xBB))
        elif 0xD5 <= value <= 0xEE:
            chars.append(chr(ord("a") + value - 0xD5))
        elif value in (0xFA, 0xFB):
            chars.append("\n")
        else:
            chars.append(f"<{value:02X}>")
    return "".join(chars)


def main() -> None:
    segments = json.loads(TRACE_PATH.read_text())["segments"]
    oracle = EmeraldOracle(ROM_PATH, MAP_PATH, BOOTSTRAP_PATH)
    oracle.new_session()

    displayed_string_addr = oracle.symbols["gDisplayedStringBattle"]

    def u8(addr: int) -> int:
        return oracle.read_u8(addr)

    def text_printer_state() -> dict:
        arrow_byte = u8(STP0 + OFF_ARROW_BYTE)
        return {
            "active": u8(STP0 + OFF_ACTIVE),
            "state": u8(STP0 + OFF_STATE),
            "delayCounter": u8(STP0 + OFF_DELAY_COUNTER),
            "downArrowDelay": arrow_byte & 0x1F,
            "downArrowYPosIdx": (arrow_byte >> 5) & 0x3,
            "arrowByteRaw": arrow_byte,
        }

    def record(tick: int, newKeysA: bool) -> dict:
        raw = [u8(displayed_string_addr + i) for i in range(DISPLAYED_STRING_BYTES)]
        return {
            "tick": tick,
            "newKeysA": newKeysA,
            "textPrinter0": text_printer_state(),
            "displayedString": decode_displayed(raw),
        }

    ticks_out = []
    tick = 0
    if WINDOW[0] <= tick <= WINDOW[1]:
        ticks_out.append(record(tick, False))

    for segment in segments:
        buttons = segment.get("buttons", [])
        for _ in range(int(segment["frames"])):
            oracle.advance(buttons)
            tick += 1
            if WINDOW[0] <= tick <= WINDOW[1]:
                ticks_out.append(record(tick, "A" in buttons))
        if tick > WINDOW[1]:
            break

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps({
        "sourceTrace": str(TRACE_PATH.relative_to(WORKTREE_ROOT)),
        "oracleProfile": "battle-scene-off",
        "window": WINDOW,
        "ticks": ticks_out,
    }, separators=(",", ":")))
    print(f"wrote {OUTPUT_PATH} ({len(ticks_out)} ticks)")


main()
