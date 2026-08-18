#!/usr/bin/env python3
"""ISSUES #97-B rung (GROVYLE-side instrument, `docs/turn5-family-class3-diagnosis.md`
§9-13's own "next instrument" for `resolve-off-a/b/c`): RAM-probes the real
oracle transition ticks across 6185-6810 -- both battlers' `gBattleMons[]`
hp/maxHP/species/status1 (struct BattlePokemon offsets already established by
`dump-battler-full.py`), the message buffer `gDisplayedStringBattle` (decoded
via `probe-gate6-r2-off.py`'s own `decode_displayed` table) and the B_WIN_MSG
`sTextPrinters[0]` struct (offsets already pinned by
`dump-win-terminal-swap-textprinter.py` at the fixed EWRAM_DATA link address
0x020201B0 -- a compile-time constant, not scenario-dependent) -- against the
SAME `factory-battle-scene-off.json` bootstrap and 76-segment button script
`dump-turn5-6-reopen-bounce-driver.py` already established (`turn5-action-off.json`,
byte-identical across all six confirm/resolve-off traces per that doc's own
sha256 check).

Samples every tick in [6185, 6810] (the union of goal 1's 6222-6809 GROVYLE-
side window and goal 2's 6185-6230 rock-slide-text dense re-check).

Run through the teardown-safe wrapper:
    python3 tools/run-mgba-probe.py <fresh-output.json> -- \\
      tools/probe/dump-turn5-resolve-grovyle-side-driver.py <fresh-output.json>
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

WINDOW = OVERRIDE_WINDOW if OVERRIDE_WINDOW is not None else (6185, 6810)
STRUCT_SIZE = 0x58
DISPLAYED_STRING_BYTES = 64

# B_WIN_MSG's sTextPrinters[0] (text.c, file-static EWRAM_DATA array) --
# compile-time link address, same ROM build as
# tools/probe/dump-win-terminal-swap-textprinter.py's own pin.
STP0 = 0x020201B0
OFF_CURRENT_CHAR = 0x00
OFF_ACTIVE = 0x1B
OFF_STATE = 0x1C
OFF_DELAY_COUNTER = 0x1E


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

    gbm = oracle.symbols["gBattleMons"]
    displayed_string_addr = oracle.symbols["gDisplayedStringBattle"]
    g_battler_sprite_ids = oracle.symbols["gBattlerSpriteIds"]
    g_healthbox_sprite_ids = oracle.symbols["gHealthboxSpriteIds"]

    def u16(addr: int) -> int:
        return oracle.read_u8(addr) | (oracle.read_u8(addr + 1) << 8)

    def read_battler(idx: int) -> dict:
        base = gbm + idx * STRUCT_SIZE
        return {
            "species": u16(base + 0x00),
            "hp": u16(base + 0x28),
            "maxHP": u16(base + 0x2C),
            "status1": oracle.read_u8(base + 0x4C),
        }

    def text_printer_state() -> dict:
        return {
            "active": oracle.read_u8(STP0 + OFF_ACTIVE),
            "state": oracle.read_u8(STP0 + OFF_STATE),
            "delayCounter": oracle.read_u8(STP0 + OFF_DELAY_COUNTER),
        }

    def record(tick: int) -> dict:
        raw = [oracle.read_u8(displayed_string_addr + i) for i in range(DISPLAYED_STRING_BYTES)]
        return {
            "tick": tick,
            "battler0_onix": read_battler(0),
            "battler1_foe": read_battler(1),
            "battlerSpriteId0": oracle.read_u8(g_battler_sprite_ids + 0),
            "battlerSpriteId1": oracle.read_u8(g_battler_sprite_ids + 1),
            "healthboxSpriteId0": oracle.read_u8(g_healthbox_sprite_ids + 0),
            "healthboxSpriteId1": oracle.read_u8(g_healthbox_sprite_ids + 1),
            "textPrinter0": text_printer_state(),
            "displayedString": decode_displayed(raw),
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
